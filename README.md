# 🏥 Salud IA Bot - Colombia

> **Asistente inteligente de salud pública impulsado por IA Generativa para la prevención y monitoreo de enfermedades en Colombia.**

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![Genkit](https://img.shields.io/badge/Genkit-AI-blue?style=for-the-badge)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

---

## 🌟 Descripción

**Salud IA Bot** es una solución innovadora diseñada para democratizar el acceso a la información de salud pública en Colombia. Utilizando la potencia de **Genkit** y el modelo **Gemini 2.5 Flash**, el bot actúa como un experto en salud pública, proporcionando respuestas precisas sobre prevención de enfermedades, reportes de brotes y orientación sanitaria.

El objetivo principal es servir como un puente eficiente entre los datos complejos de salud pública y el ciudadano común a través de una interfaz familiar: **Telegram**.

---

## 🚀 Características Principales

- **🧠 IA Especializada + RAG**: Genkit con Google Gemini 2.5 Flash genera respuestas basadas en contexto real de salud pública y evitando información no sustentada.
- **🛡️ Módulo de Salud Sexual**: Guía especializada para acceso a información sobre derechos, prevención (ITS, VIH), rutas de atención ante violencias y guías médicas predefinidas (ej. Cáncer de Próstata).
- **🔎 Motor de Búsqueda Robusto**: Implementación de búsqueda flexible mediante normalización de texto, optimizado para lenguaje natural y consultas con errores ortográficos o gramaticales.
- **📊 Datos reales cargados en XML**: Soporta análisis de eventos de salud pública, salud mental CIE-10, salud sexual y servicios de salud locales.
- **🏥 Búsqueda local de centros y prestadores**: Consultas en Antioquia, Boyacá, Yopal y Cali.
- **📈 Análisis Epidemiológico Avanzado**: 
    - Rankings de incidencia.
    - Comparativas directas y demográficas.
    - Filtrado de eventos.
- **🤖 Análisis Automático de Riesgos**: Integración inteligente de indicadores de salud pública (distribución rural/urbana, grupos etarios) junto con datos de **cobertura de vacunación** para brindar alertas tempranas y recomendaciones proactivas.
- **✉️ Experiencia Telegram mejorada**: Mensajería fragmentada, saludos personalizados, soporte de `/start` y `/help`, y gestión profesional de consultas fuera de alcance.

---

## 🛠️ Metodología y Documentación Técnica

Este proyecto sigue un proceso de ingeniería de IA riguroso, utilizando arquitectura basada en servicios y priorizando la integridad de los datos sobre la verbosidad de la IA mediante un sistema de *bypass* de respuesta.

👉 **[Consulta la Memoria Técnica Completa aquí](./DOCUMENTACION_TECNICA.md)**

---

## 🛠️ Stack Tecnológico

| Componente           | Tecnología                                                       | Propósito                                        |
| :------------------- | :--------------------------------------------------------------- | :----------------------------------------------- |
| **Framework**        | [NestJS](https://nestjs.com/)                                    | Arquitectura backend modular y escalable.        |
| **IA Orchestration** | [Genkit](https://firebase.google.com/docs/genkit)                | Gestión de flujos de IA y despliegue.            |
| **LLM**              | [Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/) | Generación de respuestas inteligentes y rápidas. |
| **Bot Framework**    | [Telegraf](https://telegraf.js.org/)                             | Comunicación con la API de Telegram.             |
| **Data Processing**  | [Fast-XML-Parser](https://github.com/NaturalIntelligence/fast-xml-parser) | Procesamiento eficiente de fuentes XML locales. |

---

## ⚙️ Instalación y Configuración

### Pasos para ejecutar localmente

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/salud-ia-bot.git
   cd salud-ia-bot
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` basado en `.env.example`:

   ```env
   TELEGRAM_BOT_TOKEN=tu_token_de_telegram
   GOOGLE_GENAI_API_KEY=tu_api_key_de_google
   PORT=3000
   ```

4. **Iniciar el servidor:**
   ```bash
   npm run start:dev
   ```

---

## 📝 Licencia

Este proyecto ha sido desarrollado para el **Concurso IA Colombia**.
© 2026 - Todos los derechos reservados.
