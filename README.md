# Sistema Integrado de Gestión (SIG UPTC) — Guía para macOS / MacBook & Visual Studio Code

Este proyecto está completamente configurado para ejecutarse localmente en **macOS (MacBook)** utilizando **Visual Studio Code**, Node.js y Vite con backend Express en TypeScript.

---

## 📋 Requisitos Previos en macOS

1. **Node.js (v18 o superior) y npm**:
   Puedes verificar si los tienes instalados abriendo la terminal (`Cmd + Espacio` -> `Terminal`) y ejecutando:
   ```bash
   node -v
   npm -v
   ```
   *Si no los tienes instalados*, la forma más recomendada en Mac es us :
   ```bash
   brew install node
   ```
   O descargarlo directamente desde [nodejs.org](https://nodejs.org/).

2. **Visual Studio Code**:
   Descárgalo e instálalo desde [code.visualstudio.com](https://code.visualstudio.com/).

---

## 🚀 Pasos para Configurar y Ejecutar en VS Code (MacBook)

### Paso 1: Abrir la carpeta en VS Code
1. Abre **Visual Studio Code**.
2. Presiona `Cmd + O` (o ve a *Archivo > Abrir carpeta...*).
3. Selecciona la carpeta raíz de este proyecto.

---

### Paso 2: Crear el archivo de variables de entorno `.env`
1. En la barra lateral de VS Code, crea un nuevo archivo llamado `.env` en la raíz del proyecto (o duplica el archivo `.env.example`).
2. Agrega las siguientes variables:

```env
# Clave API de Gemini para análisis con Inteligencia Artificial (opcional pero recomendada)
GEMINI_API_KEY="Tu_Clave_Gemini_Aqui"

# URL de la aplicación local
APP_URL="http://localhost:3000"
```

---

### Paso 3: Instalar Dependencias
Abre la terminal integrada de VS Code presionando **`Ctrl + ~`** (o `Cmd + J` -> pestaña *Terminal*) y ejecuta:

```bash
npm install
```

---

### Paso 4: Ejecutar la Aplicación
Tienes dos formas sencillas de iniciar la aplicación en tu MacBook:

#### Opción A: Desde la Terminal integrada (Recomendado)
Ejecuta el siguiente comando en la terminal:

```bash
npm run dev
```

La aplicación iniciará automáticamente y podrás abrir en Safari o Chrome la dirección:
👉 **[http://localhost:3000](http://localhost:3000)**

---

#### Opción B: Usando el Depurador de VS Code (F5)
1. Presiona la tecla **`F5`** (o ve a la pestaña *Ejecutar y depurar* `Cmd + Shift + D`).
2. Selecciona **🚀 Iniciar Servidor Dev (SIG UPTC)**.
3. Haz clic en el botón de reproducción (Play ▶️).

---

## 🛠️ Comandos Útiles en la Terminal de macOS

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en puerto 3000 |
| `npm run build` | Compila el proyecto frontend y servidor backend para producción |
| `npm run start` | Ejecuta la versión compilada de producción |
| `npm run lint` | Verifica que no existan errores de tipos en TypeScript |
| `npm run clean` | Elimina la carpeta `dist` compilada |

---

## ⌨️ Atajos Útiles de Teclado en macOS para VS Code

- **Abrir Terminal Integrada**: `Ctrl + ~`
- **Compilar / Ejecutar Tareas**: `Cmd + Shift + B`
- **Paleta de Comandos**: `Cmd + Shift + P`
- **Búsqueda Global de Archivos**: `Cmd + P`
- **Formatear Código**: `Option + Shift + F`
