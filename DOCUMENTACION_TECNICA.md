# 📄 Memoria Técnica: Salud IA Bot - Colombia
**Proyecto desarrollado para el Concurso IA Colombia**

## 1. Introducción y Alcance
El proyecto **Salud IA Bot** es una solución tecnológica diseñada para actuar como un puente de información entre los sistemas de salud pública de Colombia y la ciudadanía. Su objetivo primordial es la **prevención de enfermedades** mediante el suministro de información experta, oportuna y accesible a través de la mensajería instantánea (Telegram).

---

## 2. Metodología de Desarrollo: Enfoque CRISP-ML
Para asegurar la calidad y el rigor técnico, el desarrollo de esta solución sigue el marco de trabajo **CRISP-ML (Cross-Industry Standard Process for Machine Learning)**.

### 2.1 Business Understanding (Entendimiento del Problema)
*   **Problema:** La saturación de los servicios de salud y la falta de acceso rápido a información preventiva fiable sobre enfermedades transmisibles en Colombia.
*   **Objetivo:** Crear un agente de IA que democratice la información de salud pública, reduciendo la incertidumbre del ciudadano y promoviendo hábitos preventivos.
*   **Métrica de Éxito:** Capacidad del bot para proporcionar respuestas precisas, contextualizadas a la realidad colombiana y entregadas en un tiempo de respuesta menor a 3 segundos.

### 2.2 Data Understanding (Entendimiento de los Datos)
*   **Fuentes Actuales:** El sistema utiliza la base de conocimientos pre-entrenada del modelo Gemini 2.5 Flash, la cual contiene una vasta cantidad de información médica y de salud pública global.
*   **Análisis de Datos:** Se identificó la necesidad de filtrar la información para que sea específica para Colombia, evitando recomendaciones que no apliquen al sistema de salud local (EPS/IPS).
*   **Plan de Escalabilidad (RAG):** Se ha proyectado la integración de datos abiertos de `datos.gov.co` para alimentar la IA con reportes epidemiológicos reales y actualizados.

### 2.3 Data Preparation (Preparación de Datos y Prompting)
*   **Ingeniería de Prompts:** Se implementó un *System Prompt* especializado que define el rol de la IA como "Asistente Experto en Salud Pública para Colombia".
*   **Restricciones Lingüísticas:** Se aplicaron reglas gramaticales estrictas para asegurar que la comunicación sea natural y correcta (ej. uso del género femenino para referirse a "una Colombia más sana").
*   **Orquestación:** Uso de Genkit para estructurar la entrada y salida de datos, asegurando que la respuesta sea concisa y estructurada.

### 2.4 Modeling (Modelado de la IA)
*   **Modelo Seleccionado:** `gemini-2.5-flash`.
*   **Razón de la elección:** Equilibrio óptimo entre velocidad de respuesta (latencia baja) y capacidad de razonamiento complejo.
*   **Implementación:** Integración mediante el framework Genkit, permitiendo una separación clara entre la lógica de la aplicación (NestJS) y la lógica de la IA.

### 2.5 Evaluation (Evaluación)
*   **Pruebas de Stress:** Validación de respuestas ante consultas complejas (ej. Salud Mental).
*   **Validación de UX:** Implementación de gestión de sesiones para evitar redundancias en los saludos y mejorar la fluidez conversacional.
*   **Control de Errores:** Resolución de fallos de longitud de mensajes mediante la implementación de un sistema de fragmentación automática (splitting) para cumplir con los límites de la API de Telegram.

### 2.6 Deployment (Despliegue)
*   **Infraestructura:** Arquitectura modular basada en NestJS.
*   **Interfaz:** Bot de Telegram implementado con `nestjs-telegraf`.
*   **Control de Versiones:** Repositorio en GitHub con flujo de trabajo profesional.

---

## 3. Arquitectura de la Solución

### 3.1 Flujo de Trabajo (Workflow)
1.  **Usuario** $ightarrow$ Envía mensaje vía Telegram.
2.  **NestJS (BotUpdate)** $ightarrow$ Recibe el mensaje, valida la sesión y gestiona el saludo personalizado.
3.  **GenkitService** $ightarrow$ Orquesta la petición, inyecta el *System Prompt* y llama al modelo Gemini.
4.  **Gemini 2.5 Flash** $ightarrow$ Procesa la información y genera la respuesta basada en prevención de salud.
5.  **BotUpdate (sendLongMessage)** $ightarrow$ Verifica la longitud del texto y lo fragmenta si es necesario.
6.  **Usuario** $ightarrow$ Recibe la respuesta estructurada en su dispositivo.

### 3.2 Componentes Técnicos
*   **Backend:** NestJS (Node.js).
*   **IA Framework:** Genkit.
*   **LLM:** Gemini 2.5 Flash.
*   **API de Interfaz:** Telegram Bot API.
*   **Validación:** Joi (para variables de entorno).

---

## 4. Análisis de Impacto Esperado

### 4.1 Impacto Social
*   **Accesibilidad:** Proporciona información de salud a personas que no tienen facilidad de acceso a centros médicos para consultas preventivas básicas.
*   **Educación:** Fomenta la cultura de la prevención en la población colombiana, reduciendo la propagación de enfermedades evitables.

### 4.2 Impacto Económico
*   **Eficiencia del Sistema:** Al resolver dudas preventivas mediante IA, se reduce la saturación de las líneas de atención telefónica y las citas médicas innecesarias en el primer nivel de atención.
*   **Costos de Salud:** La prevención temprana reduce el costo a largo plazo para el Estado y las EPS al evitar complicaciones de enfermedades crónicas.

### 4.3 Impacto Ambiental
*   **Digitalización:** Reducción del uso de folletos y material impreso para campañas de salud pública, migrando la información a un canal digital sostenible.

---
**Estado del Documento:** *Versión 1.0 - En desarrollo activo.*
