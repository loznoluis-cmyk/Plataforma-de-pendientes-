import { PendienteItem } from '../types';

export interface DuplicatePair {
  id: string; // Unique pair key e.g. "ITEM1_ITEM2"
  item1: PendienteItem;
  item2: PendienteItem;
  similarityScore: number; // 0 to 100
  matchType: 'EXACTO' | 'ALTA_SIMILITUD' | 'MEDIA_SIMILITUD' | 'IA_SEMANTICA' | 'MARCADO_DUPLICADO';
  reasons: string[];
  aiReason?: string;
  recommendation?: string;
  isIgnored?: boolean;
}

// Remove accents and normalize text
export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

// Stopwords in Spanish
const SPANISH_STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
  'y', 'e', 'o', 'u', 'en', 'para', 'por', 'con', 'sin', 'sobre',
  'al', 'a', 'ante', 'bajo', 'cabe', 'con', 'contra', 'de', 'desde',
  'que', 'se', 'su', 'sus', 'como', 'mas', 'pero', 'uptc', 'va', 'sig'
]);

// Extract meaningful tokens
export function getTokens(str: string): string[] {
  const normalized = normalizeText(str);
  return normalized
    .split(' ')
    .filter((token) => token.length > 2 && !SPANISH_STOPWORDS.has(token));
}

// Jaccard similarity between two sets of tokens
export function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  let intersectionCount = 0;
  for (const t of set1) {
    if (set2.has(t)) intersectionCount++;
  }

  const unionSize = new Set([...set1, ...set2]).size;
  return unionSize === 0 ? 0 : intersectionCount / unionSize;
}

// Levenshtein edit distance similarity (0 to 1)
export function levenshteinSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeText(s1);
  const norm2 = normalizeText(s2);
  if (norm1 === norm2) return 1;
  if (!norm1 || !norm2) return 0;

  const len1 = norm1.length;
  const len2 = norm2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  return Math.max(0, 1 - distance / maxLen);
}

// Compute comprehensive similarity between two items, prioritizing ACCIONES (activities)
export function calculateItemSimilarity(item1: PendienteItem, item2: PendienteItem): {
  score: number;
  reasons: string[];
  matchType: 'EXACTO' | 'ALTA_SIMILITUD' | 'MEDIA_SIMILITUD' | 'MARCADO_DUPLICADO';
} {
  const reasons: string[] = [];

  // Check if one or both are explicitly marked as DUPLICADO
  if (item1.redundancia === 'DUPLICADO' || item2.redundancia === 'DUPLICADO') {
    reasons.push('Uno o ambos registros ya están clasificados como "DUPLICADO" en la matriz.');
  }

  const normAcciones1 = normalizeText(item1.acciones || '');
  const normAcciones2 = normalizeText(item2.acciones || '');
  const normTarea1 = normalizeText(item1.tarea || '');
  const normTarea2 = normalizeText(item2.tarea || '');

  const hasAcciones1 = normAcciones1.length > 3;
  const hasAcciones2 = normAcciones2.length > 3;
  const bothHaveAcciones = hasAcciones1 && hasAcciones2;

  let accionesSimilarity = 0;
  let tareaSimilarity = 0;

  // 1. Acciones Evaluation (Primary driver)
  if (bothHaveAcciones) {
    if (normAcciones1 === normAcciones2 && normAcciones1.length > 5) {
      reasons.push('Coincidencia 100% exacta en las ACCIONES registradas.');
      accionesSimilarity = 1.0;
    } else {
      const tokensAcc1 = getTokens(item1.acciones || '');
      const tokensAcc2 = getTokens(item2.acciones || '');
      const jaccardAcc = jaccardSimilarity(tokensAcc1, tokensAcc2);
      const levAcc = levenshteinSimilarity(item1.acciones || '', item2.acciones || '');
      
      let substringBonusAcc = 0;
      if ((normAcciones1.includes(normAcciones2) && normAcciones2.length > 8) ||
          (normAcciones2.includes(normAcciones1) && normAcciones1.length > 8)) {
        substringBonusAcc = 0.2;
        reasons.push('Una de las acciones está totalmente contenida en la otra.');
      }

      accionesSimilarity = Math.min(1.0, Math.max(jaccardAcc, levAcc) + substringBonusAcc);

      if (jaccardAcc > 0.35) {
        const commonAccTokens = tokensAcc1.filter((t) => tokensAcc2.includes(t));
        if (commonAccTokens.length > 0) {
          reasons.push(`Coinciden en acciones clave: ${commonAccTokens.slice(0, 5).join(', ')}`);
        }
      }
    }
  }

  // 2. Tarea Evaluation
  if (normTarea1 === normTarea2 && normTarea1.length > 5) {
    tareaSimilarity = 1.0;
    if (!bothHaveAcciones) {
      reasons.push('La descripción de la tarea es 100% idéntica.');
    }
  } else {
    const tokensT1 = getTokens(item1.tarea || '');
    const tokensT2 = getTokens(item2.tarea || '');
    const jaccardT = jaccardSimilarity(tokensT1, tokensT2);
    const levT = levenshteinSimilarity(item1.tarea || '', item2.tarea || '');
    
    let substringBonusT = 0;
    if ((normTarea1.includes(normTarea2) && normTarea2.length > 10) ||
        (normTarea2.includes(normTarea1) && normTarea1.length > 10)) {
      substringBonusT = 0.2;
    }

    tareaSimilarity = Math.min(1.0, Math.max(jaccardT, levT) + substringBonusT);

    if (!bothHaveAcciones && jaccardT > 0.4) {
      const commonTTokens = tokensT1.filter((t) => tokensT2.includes(t));
      if (commonTTokens.length > 0) {
        reasons.push(`Coinciden en palabras clave de la tarea: ${commonTTokens.slice(0, 5).join(', ')}`);
      }
    }
  }

  // 3. Metadata matching (Topic, Responsable, Linea)
  const sameTopico = normalizeText(item1.topico) === normalizeText(item2.topico);
  const sameResponsable = normalizeText(item1.responsable) === normalizeText(item2.responsable);
  const sameLinea = normalizeText(item1.lineaCrea) === normalizeText(item2.lineaCrea);

  if (sameTopico && item1.topico) {
    reasons.push(`Comparten el mismo Tópico: "${item1.topico}"`);
  }
  if (sameResponsable && item1.responsable) {
    reasons.push(`Mismo Responsable: "${item1.responsable}"`);
  }
  if (sameLinea && item1.lineaCrea) {
    reasons.push(`Creados en la misma Línea: "${item1.lineaCrea}"`);
  }

  // Calculate Weighted Score (0-100)
  let finalScore = 0;
  if (bothHaveAcciones) {
    // Primary weight (65%) on ACCIONES, 15% on TAREA, 10% Tópico, 5% Responsable, 5% Línea
    finalScore = (accionesSimilarity * 65) + (tareaSimilarity * 15);
  } else {
    // If acciones is missing in one or both, fallback to TAREA as primary (75%)
    finalScore = tareaSimilarity * 75;
  }

  if (sameTopico) finalScore += 10;
  if (sameResponsable) finalScore += 10;
  if (sameLinea) finalScore += 5;

  const boundedScore = Math.min(100, Math.round(finalScore));

  let matchType: 'EXACTO' | 'ALTA_SIMILITUD' | 'MEDIA_SIMILITUD' | 'MARCADO_DUPLICADO' = 'MEDIA_SIMILITUD';
  if (item1.redundancia === 'DUPLICADO' || item2.redundancia === 'DUPLICADO') {
    matchType = 'MARCADO_DUPLICADO';
  } else if (boundedScore >= 98 || (bothHaveAcciones && accionesSimilarity === 1.0)) {
    matchType = 'EXACTO';
  } else if (boundedScore >= 75) {
    matchType = 'ALTA_SIMILITUD';
  } else if (boundedScore >= 50) {
    matchType = 'MEDIA_SIMILITUD';
  }

  return {
    score: boundedScore,
    reasons,
    matchType
  };
}

// Find all duplicate candidate pairs in a list of items
export function findDuplicatePairs(
  items: PendienteItem[],
  minThreshold: number = 50,
  ignoredPairIds: Set<string> = new Set()
): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  if (!items || items.length < 2) return pairs;

  // Pre-tokenize and normalize items once to avoid repeating heavy calculations
  const tokenCache = items.map((item) => {
    const textAcc = item.acciones || '';
    const textTar = item.tarea || '';
    const tokensAcc = getTokens(textAcc);
    const tokensTar = getTokens(textTar);
    const tokenSet = new Set([...tokensAcc, ...tokensTar]);
    const topicoNorm = normalizeText(item.topico || '');
    const respNorm = normalizeText(item.responsable || '');
    const isMarked = item.redundancia === 'DUPLICADO';
    return { tokenSet, topicoNorm, respNorm, isMarked };
  });

  for (let i = 0; i < items.length; i++) {
    const item1 = items[i];
    const c1 = tokenCache[i];

    for (let j = i + 1; j < items.length; j++) {
      const item2 = items[j];
      const c2 = tokenCache[j];

      const pairId = [item1.id, item2.id].sort().join('___');
      if (ignoredPairIds.has(pairId)) continue;

      // Fast pre-filter: Must be explicitly marked DUPLICADO, share same topic/responsable, or share at least 1 keyword token
      const isMarkedPair = c1.isMarked || c2.isMarked;
      const sameTopico = c1.topicoNorm.length > 2 && c1.topicoNorm === c2.topicoNorm;
      const sameResp = c1.respNorm.length > 2 && c1.respNorm === c2.respNorm;

      if (!isMarkedPair && !sameTopico && !sameResp) {
        let hasTokenOverlap = false;
        for (const t of c1.tokenSet) {
          if (c2.tokenSet.has(t)) {
            hasTokenOverlap = true;
            break;
          }
        }
        if (!hasTokenOverlap) continue; // Skip heavy Levenshtein matrix calculation!
      }

      const { score, reasons, matchType } = calculateItemSimilarity(item1, item2);

      if (score >= minThreshold || isMarkedPair) {
        pairs.push({
          id: pairId,
          item1,
          item2,
          similarityScore: score,
          matchType,
          reasons,
          isIgnored: false
        });
      }
    }
  }

  // Sort by highest similarity score first
  return pairs.sort((a, b) => b.similarityScore - a.similarityScore);
}

// Call backend API for AI Semantic Analysis using Gemini
export async function fetchAiSemanticDuplicates(items: PendienteItem[]): Promise<{
  aiPairs: DuplicatePair[];
  summary: string;
}> {
  try {
    const response = await fetch('/api/duplicates/semantic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Error del servidor (${response.status})`);
    }

    const data = await response.json();
    const rawDuplicates = data.duplicates || [];
    const summary = data.summary || '';

    const itemsMap = new Map<string, PendienteItem>();
    items.forEach((item) => itemsMap.set(item.id, item));

    const aiPairs: DuplicatePair[] = [];

    rawDuplicates.forEach((dup: any) => {
      const item1 = itemsMap.get(dup.item1Id);
      const item2 = itemsMap.get(dup.item2Id);

      if (item1 && item2 && item1.id !== item2.id) {
        const pairId = [item1.id, item2.id].sort().join('___');
        aiPairs.push({
          id: pairId,
          item1,
          item2,
          similarityScore: Math.min(100, Math.max(1, Number(dup.similarityScore) || 80)),
          matchType: 'IA_SEMANTICA',
          reasons: [dup.reason || 'Detección semántica de coincidencia conceptual mediante Gemini AI.'],
          aiReason: dup.reason,
          recommendation: dup.recommendation || 'FUSIONAR'
        });
      }
    });

    return { aiPairs, summary };
  } catch (err: any) {
    console.error('Error fetching AI semantic duplicates:', err);
    throw err;
  }
}

// Helper to merge two items into a master item
export function mergeTwoPendientes(
  masterItem: PendienteItem,
  duplicateItem: PendienteItem,
  options: {
    markDuplicateAsClosed?: boolean;
    appendActions?: boolean;
    appendNotes?: boolean;
  } = {}
): { updatedMaster: PendienteItem; updatedDuplicate: PendienteItem } {
  const nowIso = new Date().toISOString();

  let mergedAcciones = masterItem.acciones || '';
  if (options.appendActions && duplicateItem.acciones) {
    if (!mergedAcciones.includes(duplicateItem.acciones)) {
      mergedAcciones += `\n[Anexo de ${duplicateItem.id}]: ${duplicateItem.acciones}`;
    }
  }

  let mergedObservaciones = masterItem.observaciones || '';
  if (options.appendNotes && duplicateItem.observaciones) {
    if (!mergedObservaciones.includes(duplicateItem.observaciones)) {
      mergedObservaciones += `\n[Anexo de ${duplicateItem.id}]: ${duplicateItem.observaciones}`;
    }
  }

  let mergedApoyo = masterItem.personalApoyo || '';
  if (duplicateItem.personalApoyo && !mergedApoyo.includes(duplicateItem.personalApoyo)) {
    mergedApoyo = mergedApoyo ? `${mergedApoyo} / ${duplicateItem.personalApoyo}` : duplicateItem.personalApoyo;
  }

  const updatedMaster: PendienteItem = {
    ...masterItem,
    acciones: mergedAcciones,
    observaciones: mergedObservaciones,
    personalApoyo: mergedApoyo,
    ultimaActualizacion: nowIso
  };

  const updatedDuplicate: PendienteItem = {
    ...duplicateItem,
    redundancia: 'DUPLICADO',
    estado: options.markDuplicateAsClosed ? 'CERRADO' : duplicateItem.estado,
    observaciones: `${duplicateItem.observaciones || ''}\n[Sistema]: Registro marcado como DUPLICADO de ${masterItem.id} el ${new Date().toLocaleDateString('es-CO')}.`.trim(),
    ultimaActualizacion: nowIso
  };

  return { updatedMaster, updatedDuplicate };
}
