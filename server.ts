import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Gmail Real Send Proxy Endpoint
  app.post('/api/send-gmail', async (req, res) => {
    try {
      const { toEmail, subject, htmlContent, accessToken } = req.body;

      if (!toEmail || !subject || !htmlContent) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios: toEmail, subject, htmlContent' });
      }

      if (!accessToken) {
        return res.status(401).json({ error: 'Se requiere token de acceso OAuth para Gmail API' });
      }

      // Create RFC822 MIME message
      const emailLines = [
        `To: ${toEmail}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        htmlContent
      ];

      const rawString = emailLines.join('\r\n');
      const raw = Buffer.from(rawString)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: data.error?.message || 'Error en respuesta de la API de Gmail'
        });
      }

      return res.json({ success: true, messageId: data.id, threadId: data.threadId });
    } catch (err: any) {
      console.error('Error enviando correo con Gmail API:', err);
      return res.status(500).json({ error: err.message || 'Error interno del servidor al enviar correo.' });
    }
  });

  // AI Semantic Duplicates Endpoint using Gemini
  app.post('/api/duplicates/semantic', async (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Se requiere un arreglo de pendientes para analizar.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'La clave GEMINI_API_KEY no está configurada en el servidor. Revise el panel de Secretos.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Prepare simplified task representations for token efficiency
      const simplifiedItems = items.map((item: any) => ({
        id: item.id,
        tarea: item.tarea,
        descripcionGeneral: item.descripcionGeneral || '',
        topico: item.topico || '',
        lineaCrea: item.lineaCrea || '',
        responsable: item.responsable || '',
        acciones: item.acciones || '',
        entregable: item.entregable || '',
        procesoSig: item.procesoSig || ''
      }));

      const prompt = `Actúa como un auditor experto en gestión documental y calidad universitaria de la UPTC (Universidad Pedagógica y Tecnológica de Colombia).
Analiza la siguiente lista de tareas/pendientes institucionales de la Vicerrectoría Académica.
Tu objetivo principal es identificar pares de tareas que sean DUPLICADOS SEMÁNTICOS O DE ACTIVIDADES, evaluando PRIORITARIAMENTE el campo 'acciones' (acciones realizadas o a realizar), ya que allí se describe la actividad real ejecutada o proyectada, además del título de 'tarea', 'topico' y 'responsable'. Dos pendientes con redactado similar de acciones o que busquen la misma acción real deben considerarse duplicados semánticos.

Lista de pendientes:
${JSON.stringify(simplifiedItems, null, 2)}

Si identificas pares o grupos duplicados/similares, proporciona el ID del primer ítem, ID del segundo ítem, el porcentaje estimado de similitud semántica (60-100), una explicación clara en español detallando en qué acciones o actividades coinciden, y una sugerencia de recomendación ('FUSIONAR', 'MARCAR_DUPLICADO' o 'VERIFICAR').
Si no hay duplicados semánticos, devuelve una lista vacía de duplicates.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              duplicates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item1Id: { type: Type.STRING, description: 'ID del primer pendiente' },
                    item2Id: { type: Type.STRING, description: 'ID del segundo pendiente duplicado o similar' },
                    similarityScore: { type: Type.NUMBER, description: 'Porcentaje estimado de similitud semántica (1 a 100)' },
                    reason: { type: Type.STRING, description: 'Razón explicativa en español de por qué son duplicados semánticos' },
                    recommendation: { type: Type.STRING, description: 'Recomendación: FUSIONAR, MARCAR_DUPLICADO o VERIFICAR' }
                  },
                  required: ['item1Id', 'item2Id', 'similarityScore', 'reason']
                }
              },
              summary: {
                type: Type.STRING,
                description: 'Resumen ejecutivo breve en español sobre el análisis semántico de duplicados realizado.'
              }
            },
            required: ['duplicates']
          }
        }
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      return res.json(parsed);
    } catch (err: any) {
      console.error('Error en /api/duplicates/semantic:', err);
      return res.status(500).json({
        error: 'Error al procesar el análisis semántico con IA: ' + (err.message || String(err))
      });
    }
  });

  // AI Chat Assistant Endpoint for Pendientes UPTC
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, items } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Se requiere un mensaje de texto para el chatbot.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      // Prepare lightweight matrix snapshot
      const matrixSnapshot = Array.isArray(items)
        ? items.map((item: any) => ({
            id: String(item.id || ''),
            tarea: String(item.tarea || ''),
            estado: String(item.estado || 'PENDIENTE'),
            prioridad: String(item.prioridad || 'MEDIA'),
            lineaCrea: String(item.lineaCrea || ''),
            procesoSig: String(item.procesoSig || ''),
            topico: String(item.topico || ''),
            responsable: String(item.responsable || ''),
            acciones: String(item.acciones || '').substring(0, 150),
            entregable: String(item.entregable || '').substring(0, 100),
            fechaEstimada: String(item.fechaEstimada || ''),
            temporalidad: String(item.temporalidad || ''),
            observaciones: String(item.observaciones || '').substring(0, 100)
          }))
        : [];

      // Pre-calculate exact statistical aggregates for 100% mathematical precision
      const totalCount = matrixSnapshot.length;
      const byEstado: Record<string, number> = {};
      const byPrioridad: Record<string, number> = {};
      const byResponsable: Record<string, number> = {};
      const byProceso: Record<string, number> = {};

      matrixSnapshot.forEach((item: any) => {
        const est = (item.estado || 'SIN ESTADO').toUpperCase();
        byEstado[est] = (byEstado[est] || 0) + 1;

        const prio = (item.prioridad || 'MEDIA').toUpperCase();
        byPrioridad[prio] = (byPrioridad[prio] || 0) + 1;

        if (item.responsable) {
          const resp = item.responsable.trim();
          byResponsable[resp] = (byResponsable[resp] || 0) + 1;
        }
        if (item.procesoSig) {
          const proc = item.procesoSig.trim();
          byProceso[proc] = (byProceso[proc] || 0) + 1;
        }
      });

      const summaryStats = {
        totalRegistros: totalCount,
        distribucionPorEstado: byEstado,
        distribucionPorPrioridad: byPrioridad,
        topResponsables: Object.entries(byResponsable)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([resp, cnt]) => `${resp}: ${cnt} pendientes`),
        topProcesosSIG: Object.entries(byProceso)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([proc, cnt]) => `${proc}: ${cnt} pendientes`)
      };

      // Create ultra-compact text-line listing for Gemini prompt (prevents payload timeout with 800+ items)
      const compactItemsList = matrixSnapshot.map((i) => 
        `[${i.id}] ${i.tarea} | Est:${i.estado} | Prio:${i.prioridad} | Resp:${i.responsable || 'Sin asignar'} | Proc:${i.procesoSig}`
      ).join('\n');

      // Fallback generator in case Gemini API is not configured or fails
      const generateLocalFallbackAnswer = (userPrompt: string): string => {
        const query = userPrompt.toLowerCase();

        if (totalCount === 0) {
          return `⚠️ **Matriz Vacía**: Actualmente la matriz no contiene pendientes (0 registros). Cargue un archivo Excel o sincronice desde la Nube para realizar consultas analíticas.`;
        }

        // Check if query asks about summary / total / statistics
        if (query.includes('resumen') || query.includes('estadística') || query.includes('cuántos') || query.includes('total') || query.includes('informe')) {
          return `### 📊 Reporte Estadístico Institucional UPTC\n\n` +
            `* **Total de Pendientes Registrados**: ${totalCount}\n` +
            `* **Por Estado**: ${Object.entries(byEstado).map(([k, v]) => `${k}: **${v}**`).join(', ')}\n` +
            `* **Por Prioridad**: ${Object.entries(byPrioridad).map(([k, v]) => `${k}: **${v}**`).join(', ')}\n\n` +
            `#### 👤 Carga Principal por Responsable:\n` +
            summaryStats.topResponsables.map((r) => `* ${r}`).join('\n') + `\n\n` +
            `#### ⚙️ Distribución por Proceso SIG:\n` +
            summaryStats.topProcesosSIG.map((p) => `* ${p}`).join('\n') + `\n\n` +
            `*Nota: Respuesta generada desde el motor analítico interno de la matriz.*`;
        }

        // Search items matching query keywords
        const keywords = query.split(' ').filter((w) => w.length > 3);
        const matches = matrixSnapshot.filter((item: any) => {
          const blob = `${item.id} ${item.tarea} ${item.responsable} ${item.estado} ${item.topico} ${item.procesoSig} ${item.acciones}`.toLowerCase();
          return keywords.some((kw) => blob.includes(kw));
        }).slice(0, 8);

        if (matches.length > 0) {
          return `### 🔍 Coincidencias encontradas (${matches.length} de ${totalCount} pendientes):\n\n` +
            matches.map((m: any) => `* **[${m.id}]** - *${m.tarea}*\n  * **Estado**: ${m.estado} | **Prioridad**: ${m.prioridad} | **Responsable**: ${m.responsable || 'Sin asignar'}\n  * **Acciones**: ${m.acciones ? m.acciones.substring(0, 100) + '...' : 'Sin acciones registradas'}`).join('\n\n') +
            `\n\n*Haga clic en cualquiera de los códigos de la lista (ej. [${matches[0].id}]) para abrir sus detalles completos.*`;
        }

        return `Tengo analizada la Matriz UPTC con **${totalCount} registros**. Puedes preguntarme por resumen por responsable, tareas con prioridad ALTA, pendientes en proceso, o buscar por código exacto (ej. [UPTC-001]).`;
      };

      if (!apiKey) {
        console.warn('GEMINI_API_KEY no configurada. Usando motor analítico local de respaldos.');
        return res.json({
          answer: generateLocalFallbackAnswer(message),
          timestamp: new Date().toISOString()
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const systemInstruction = `Eres "Asistente IA UPTC", el asistente virtual analítico institucional de la Vicerrectoría Académica de la Universidad Pedagógica y Tecnológica de Colombia (UPTC).
Tu objetivo es brindar respuestas 100% veraces, precisas y fundamentadas directamente en los datos de la Matriz de Pendientes Institucionales de la UPTC.

Reglas de Oro:
1. Utiliza tono profesional, claro y estructurado en español.
2. Utiliza Markdown enriquecido (subtítulos ###, listas con viñetas *, negritas **, y tablas si aplica).
3. SIEMPRE que menciones un pendiente o compromiso específico, incluye su ID EXACTO entre corchetes, por ejemplo [UPTC-001] o [UPTC-014]. Esto es FUNDAMENTAL para que el usuario pueda hacer clic en el ID y ver su ficha completa.
4. Para preguntas numéricas, apóyate en los "RESÚMENES ESTADÍSTICOS PRECALCULADOS" incluidos al inicio para garantizar números 100% exactos.
5. Si no hay pendientes que coincidan con lo solicitado, indícalo claramente con amabilidad.
6. Si la matriz está vacía (0 registros), indica que se requiere cargar un archivo Excel.`;

      const contents: any[] = [
        {
          role: 'user',
          parts: [
            {
              text: `[DATOS DE LA MATRIZ DE PENDIENTES UPTC EN TIEMPO REAL]\n\n` +
                `--- RESÚMENES ESTADÍSTICOS VERIFICADOS ---\n` +
                JSON.stringify(summaryStats, null, 2) + `\n\n` +
                `--- LISTA COMPLETA DE REGISTROS (${matrixSnapshot.length} PENDIENTES) ---\n` +
                compactItemsList
            }
          ]
        },
        {
          role: 'model',
          parts: [
            {
              text: 'Entendido. Tengo cargada en memoria y analizada la Matriz de Pendientes de la Vicerrectoría Académica UPTC con sus métricas estadísticas calculadas y registros completos. ¿En qué puedo colaborar?'
            }
          ]
        }
      ];

      // Add conversation history if present
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history.slice(-6)) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            contents.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            });
          }
        }
      }

      // Add user's latest prompt
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.2
          }
        });

        const answerText = response.text || generateLocalFallbackAnswer(message);

        return res.json({
          answer: answerText,
          timestamp: new Date().toISOString()
        });
      } catch (geminiError: any) {
        console.error('Error llamando a Gemini API, usando fallback local:', geminiError);
        return res.json({
          answer: generateLocalFallbackAnswer(message),
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error('Error en /api/chat:', err);
      return res.status(500).json({
        error: 'Error en el asistente virtual de pendientes: ' + (err.message || String(err))
      });
    }
  });

  // Serve with Vite middleware in dev mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor UPTC activo en puerto http://0.0.0.0:${PORT}`);
  });
}

startServer();
