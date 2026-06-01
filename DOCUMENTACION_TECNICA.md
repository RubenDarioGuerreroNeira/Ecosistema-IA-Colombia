# 📄 Memoria Técnica: Salud IA Bot - Colombia

**Proyecto desarrollado para el Concurso IA Colombia**

## 1. Introducción y Alcance

El proyecto **Salud IA Bot** es una solución tecnológica diseñada para actuar como un puente de información entre los sistemas de salud pública de Colombia y la ciudadanía. Su objetivo primordial es la **prevención de enfermedades** mediante el suministro de información experta, oportuna y accesible a través de la mensajería instantánea (Telegram).

---

## 2. Metodología de Desarrollo: Enfoque CRISP-ML

Para asegurar la calidad y el rigor técnico, el desarrollo de esta solución sigue el marco de trabajo **CRISP-ML (Cross-Industry Standard Process for Machine Learning)**.

### 2.1 Business Understanding (Entendimiento del Problema)

- **Problema:** La saturación de los servicios de salud y la falta de acceso rápido a información preventiva fiable sobre enfermedades transmisibles en Colombia.
- **Objetivo:** Crear un agente de IA que democratice la información de salud pública, reduciendo la incertidumbre del ciudadano y promoviendo hábitos preventivos.
- **Métrica de Éxito:** Capacidad del bot para proporcionar respuestas precisas, interpretar datos estadísticos reales y entregarlos en un tiempo de respuesta menor a 3 segundos.

### 2.2 Data Understanding (Entendimiento de los Datos)

- **Fuentes Actuales (Data Ingestion):**
  - `Eventos_de_Interés_en_Salud_Pública_20260514.xml`: Microdatos del SIVIGILA sobre enfermedades transmisibles.
  - `Salud_sexual_-_preguntas.xml`: Base de conocimientos sobre derechos y métodos anticonceptivos.
  - `Salud_Mental.xml`: Registros de atención y diagnósticos basados en CIE-10.
- **Análisis de Datos:** Los datos se cargan en memoria mediante servicios especializados que realizan mapeo de tipos numéricos para garantizar la precisión en los cálculos de porcentajes y promedios.
- **Procesamiento RAG:** El bot utiliza una estrategia de _Retrieval-Augmented Generation_ para inyectar datos reales y estadísticas analíticas en el prompt enviado al LLM.

### 2.3 Data Preparation (Preparación de Datos y Prompting)

- **Ingeniería de Prompts:** Se implementó un _System Prompt_ especializado que define el rol de la IA como "Asistente Experto en Salud Pública para Colombia".
- **Restricciones Lingüísticas:** Se aplicaron reglas gramaticales estrictas para asegurar que la comunicación sea natural y correcta (ej. uso del género femenino para referirse a "una Colombia más sana").
- **Orquestación:** Uso de Genkit para estructurar la entrada y salida de datos, asegurando que la respuesta sea concisa y estructurada.

### 2.4 Modeling (Modelado de la IA)

- **Modelo Seleccionado:** `gemini-2.5-flash`.
- **Razón de la elección:** Equilibrio óptimo entre velocidad de respuesta (latencia baja) y capacidad de razonamiento complejo.
- **Arquitectura de Servicios:** Implementación de servicios de estadísticas especializados (`HealthStatsService`, `MentalHealthStatsService`, `SexualHealthStatsService`) bajo el principio de Responsabilidad Única (SRP).
- **Implementación:** Orquestación a través de `StatsService` para la detección de intenciones analíticas (rankings, comparativas urbanas/rurales, etc.).

### 2.5 Evaluation (Evaluación)

- **Pruebas de Stress:** Validación de respuestas ante consultas complejas (ej. Salud Mental).
- **Validación de UX:** Implementación de gestión de sesiones para evitar redundancias en los saludos y mejorar la fluidez conversacional.
- **Control de Errores:** Resolución de fallos de longitud de mensajes mediante la implementación de un sistema de fragmentación automática (splitting) para cumplir con los límites de la API de Telegram.

### 2.6 Deployment (Despliegue)

- **Infraestructura:** Arquitectura modular basada en NestJS.
- **Interfaz:** Bot de Telegram implementado con `nestjs-telegraf`.
- **Control de Versiones:** Repositorio en GitHub con flujo de trabajo profesional.

---

## 3. Arquitectura de la Solución

### 2.7 Visualización Gráfica Dinámica

Para enriquecer la entrega de información, se integró un módulo de visualización gráfica basado en **QuickChart**.

- **Metodología**: El bot procesa datos estructurados (XML/JSON), calcula estadísticas agregadas y genera una URL dinámica de configuración de `Chart.js`.
- **Renderizado**: La URL es consumida por el bot y enviada como una imagen (`replyWithPhoto`), optimizando la experiencia en dispositivos móviles.
- **Implementación**:
  - `ChartService`: Encapsula la lógica de generación de gráficos (pie, bar, doughnut).
  - `BotUpdate.handleChartQuery`: Orquesta la detección de intenciones gráficas y la comunicación con servicios de datos (Cali, Mental Health, Air Quality).
- **Ventaja**: Eliminación de dependencias pesadas (ej. Power BI Embedded) y optimización de latencia en la entrega de reportes visuales instantáneos.

---

## 3. Arquitectura de la Solución

### 3.1 Flujo de Trabajo (Workflow)

1.  **Usuario** $\rightarrow$ Envía mensaje vía Telegram.
2.  **NestJS (BotUpdate)** $\rightarrow$ Recibe el mensaje, valida la sesión.
3.  **Detección de Intención**:
    - Si es **Consulta Analítica**: Se utiliza `StatsService`.
    - Si es **Consulta Gráfica**: Se utiliza `ChartService`.
4.  **Procesamiento**:
    - **ChartService** $\rightarrow$ Genera URL de imagen dinámica.
    - **SaludAnaliticaService** $\rightarrow$ Realiza RAG y análisis con Gemini.
5.  **Responder** $\rightarrow$ Envío de respuesta textual (con contexto) o visual (foto).
6.  **Usuario** $\rightarrow$ Recibe la respuesta estructurada en su dispositivo.


### 3.2 Componentes Técnicos

- **Backend:** NestJS (Node.js).
- **IA Framework:** Genkit.
- **LLM:** Gemini 2.5 Flash.
- **API de Interfaz:** Telegram Bot API.
- **Validación:** Joi (para variables de entorno).

---

## 4. Análisis de Impacto Esperado

### 4.1 Impacto Social

- **Accesibilidad:** Proporciona información de salud a personas que no tienen facilidad de acceso a centros médicos para consultas preventivas básicas.
- **Educación:** Fomenta la cultura de la prevención en la población colombiana, reduciendo la propagación de enfermedades evitables.

### 4.2 Impacto Económico

- **Eficiencia del Sistema:** Al resolver dudas preventivas mediante IA, se reduce la saturación de las líneas de atención telefónica y las citas médicas innecesarias en el primer nivel de atención.
- **Costos de Salud:** La prevención temprana reduce el costo a largo plazo para el Estado y las EPS al evitar complicaciones de enfermedades crónicas.

### 4.3 Impacto Ambiental

- **Digitalización:** Reducción del uso de folletos y material impreso para campañas de salud pública, migrando la información a un canal digital sostenible.

---

**Estado del Documento:** _Versión 1.0 - En desarrollo activo._
