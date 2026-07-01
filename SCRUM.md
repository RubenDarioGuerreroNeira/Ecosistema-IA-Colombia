# Scrum Framework - Salud IA Bot 🏥🤖

<p align="center">
  <img src="./images/Imagen_bot.jpg" alt="Salud IA Bot - Logo" width="300"/>
</p>

Este documento define la metodología de trabajo y el estado del ciclo de vida del proyecto basándose en el marco Scrum.

## 📝 Visión del Producto

Proporcionar una herramienta de inteligencia artificial en Telegram que facilite el acceso a información de salud pública, estadísticas y localización de prestadores en Colombia, utilizando datos abiertos y procesamiento de lenguaje natural.

---

## 🟢 Incrementos Terminados (Logros Alcanzados)

### Sprint 1: Cimiento y Datos Regionales (Valle y Cali)

- **Infraestructura Base:** Configuración de NestJS, Telegraf y arquitectura de servicios.
- **Servicio Cali:** Integración de datos de la Red de Salud del Centro ESE.
- **Servicio Valle:** Implementación de consultas sobre cobertura de vacunación.
- **Bypass de Datos:** Metodología para entrega directa de datos evitando alucinaciones de IA.

### Sprint 2: Expansión Territorial y Salud Pública

- **Servicio Antioquia:** Localización de prestadores de salud con alta precisión geográfica.
- **Servicio Yopal:** Consulta de centros de salud en Casanare.
- **Servicio Boyacá:** Integración de servicios de salud departamentales.
- **Eventos SIVIGILA:** Consulta de eventos de interés en salud pública a nivel nacional.

### Sprint 3: Refactorización y Mejora de Experiencia

- **Refactorización de Servicios:** Consolidación de lógica en `MentalHealthQuestionsService`, `SaludPublicaQuestionsService`, `YopalQuestionsService` y `GraphicsQuestionsService`.
- **Cobertura de Tests:** Implementación robusta de tests unitarios y E2E para nuevos servicios.
- **Geolocalización:** Implementación de búsqueda de prestadores por coordenadas (radio 5km).

### Sprint 4: Optimización y Calidad de Código 🧹

- **Corrección de UX:** Mensaje de bienvenida reparado (formato Markdown roto y texto mal formateado en la sección de Salud Pública).
# Scrum Framework - Salud IA Bot 🏥🤖

<p align="center">
  <img src="./images/Imagen_bot.jpg" alt="Salud IA Bot - Logo" width="300"/>
</p>

Este documento define la metodología de trabajo y el estado del ciclo de vida del proyecto basándose en el marco Scrum.

## 📝 Visión del Producto

Proporcionar una herramienta de inteligencia artificial en Telegram que facilite el acceso a información de salud pública, estadísticas y localización de prestadores en Colombia, utilizando datos abiertos y procesamiento de lenguaje natural.

---

## 🟢 Incrementos Terminados (Logros Alcanzados)

### Sprint 1: Cimiento y Datos Regionales (Valle y Cali)

- **Infraestructura Base:** Configuración de NestJS, Telegraf y arquitectura de servicios.
- **Servicio Cali:** Integración de datos de la Red de Salud del Centro ESE.
- **Servicio Valle:** Implementación de consultas sobre cobertura de vacunación.
- **Bypass de Datos:** Metodología para entrega directa de datos evitando alucinaciones de IA.

### Sprint 2: Expansión Territorial y Salud Pública

- **Servicio Antioquia:** Localización de prestadores de salud con alta precisión geográfica.
- **Servicio Yopal:** Consulta de centros de salud en Casanare.
- **Servicio Boyacá:** Integración de servicios de salud departamentales.
- **Eventos SIVIGILA:** Consulta de eventos de interés en salud pública a nivel nacional.

### Sprint 3: Refactorización y Mejora de Experiencia

- **Refactorización de Servicios:** Consolidación de lógica en `MentalHealthQuestionsService`, `SaludPublicaQuestionsService`, `YopalQuestionsService` y `GraphicsQuestionsService`.
- **Cobertura de Tests:** Implementación robusta de tests unitarios y E2E para nuevos servicios.
- **Geolocalización:** Implementación de búsqueda de prestadores por coordenadas (radio 5km).

### Sprint 4: Optimización y Calidad de Código 🧹

- **Corrección de UX:** Mensaje de bienvenida reparado (formato Markdown roto y texto mal formateado en la sección de Salud Pública).
- **Eliminación de `console.log`:** Reemplazo completo de logs directos por el sistema de logging de NestJS (`Logger`) en `bot.update.ts`.
- **Tipado fuerte:** Interfaces TypeScript agregadas (`UserState`, `HealthEvent`, `AirQualityItem`, `AgeDistribution`, etc.) eliminando dependencia de `any` en parámetros clave.
- **Descomposición de métodos:** `handleMentalHealthQuery` (~260 líneas) dividido en 7 sub-métodos especializados.
- **Constantes globales:** Extracción de listas de departamentos, regiones, keywords y strings de respuesta a constantes fuera de la clase para mejor mantenibilidad.
- **Funciones auxiliares independientes:** `escapeMarkdown()` y `normalizeText()` extraídas como funciones puras reutilizables.

### Sprint 5: Visualización Gráfica y NLP Avanzado 📊

- **Generación de Gráficos:** Integración de gráficas dinámicas (barras, tortas, líneas) para métricas de Salud Pública, Calidad del Aire, y Salud Mental.
- **Detección Dinámica NLP:** Actualización del motor de detección de regiones para extraer de manera dinámica cualquier municipio usando Expresiones Regulares (RegEx).
- **Resolución Continua:** Optimización de la continuidad conversacional al esperar respuestas de los usuarios.

### Sprint 6: Documentación Técnica y Arquitectura (Project Scaffolder) 📚

- **Guía de Arquitectura Definitiva:** Creación de `projects_scaffolder.md`, un manual profundo enfocado en el "Onboarding" técnico y justificación de decisiones (uso de SQLite, Caché, TypeORM, OpenRouter).
- **Catálogo Exhaustivo de Preguntas:** Compilación de absolutamente todas las intenciones, ejemplos y consultas NLP soportadas por los microservicios (Salud Pública, Mental, Sexual, Aire, Predictivo, Yopal, Antioquia).
- **Seguridad e IA:** Documentación rigurosa sobre el cortafuegos algorítmico, Gatekeeping y el uso de RAG estricto para mitigar alucinaciones de modelos generativos.

## 📋 Product Backlog (Pendientes)

| Prioridad | Tarea                          | Descripción                                                                                                  | Estado    |
| :-------- | :----------------------------- | :----------------------------------------------------------------------------------------------------------- | :-------- |
| **Media** | Geocodificación de Direcciones | Investigar e implementar la conversión de direcciones a coordenadas (lat/lon) para Antioquia, Boyacá y Cali. | Pendiente |
| **Media** | UI Polishing                   | Mejorar el formato de mensajes largos y menús interactivos (Inline Buttons).                                 | Pendiente |
| **Baja**  | Dashboard Web Analítico        | Desarrollo de una interfaz web externa para visualizaciones (las gráficas del bot ya están implementadas).   | Pendiente |
| **Baja**  | Exportación de Datos           | Permitir a los usuarios descargar resúmenes de salud en PDF/Excel.                                           | Pendiente |

---

## 🛠 Definition of Done (DoD)

Para que una tarea se considere terminada, debe:

1. Superar el linting (`npm run lint`).
2. Crear/Actualizar y pasar todos los tests unitarios y E2E correspondientes (`npm test` / `npm run test:e2e`).
3. Estar documentada en el código y en este archivo si es un hito mayor.
4. No introducir errores de compilación (`npm run build`).

---

_Última actualización: 1 de julio de 2026_

---

## ✍️ Autores

**Maria G. Barrientos** y **Rubén D. Guerrero** — Colombia, 2026.
