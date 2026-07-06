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

- **Refactorización de Servicios:** Consolidación de lógica en MentalHealthQuestionsService, SaludPublicaQuestionsService, YopalQuestionsService y GraphicsQuestionsService.
- **Cobertura de Tests:** Implementación robusta de tests unitarios y E2E para nuevos servicios.
- **Geolocalización:** Implementación de búsqueda de prestadores por coordenadas (radio 5km).

### Sprint 4: Optimización y Calidad de Código

- **Corrección de UX:** Mensaje de bienvenida reparado.
- **Eliminación de console.log:** Reemplazo completo por Logger de NestJS.
- **Tipado fuerte:** Interfaces TypeScript agregadas (UserState, HealthEvent, AirQualityItem, etc.).
- **Descomposición de métodos:** handleMentalHealthQuery (~260 líneas) dividido en 7 sub-métodos.
- **Constantes globales:** Extracción de keywords y strings a constantes reutilizables.
- **Funciones auxiliares:** escapeMarkdown() y normalizeText() extraídas como funciones puras.

### Sprint 5: Visualización Gráfica y NLP Avanzado

- **Generación de Gráficos:** Integración de gráficas dinámicas (barras, tortas, líneas) via QuickChart.
- **Detección Dinámica NLP:** Motor de detección de regiones con RegEx dinámico.
- **Resolución Continua:** Optimización de la continuidad conversacional.

### Sprint 6: Documentación Técnica y Arquitectura (Project Scaffolder)

- **Guía de Arquitectura Definitiva:** Creación de projects_scaffolder.md con justificaciones técnicas.
- **Catálogo de Preguntas:** Compilación de todas las intenciones NLP soportadas.
- **Seguridad e IA:** Documentación del cortafuegos algorítmico y Gatekeeping RAG.

### Sprint 7: Mejoras de UX, NLP y Nuevos Handlers

> Commits: 600ed9f, e8bf40c, 7776e8b — Julio 2-4, 2026

- **Menú de Ayuda Reformateado:** Se reestructuró completamente el bloque /help con líneas en blanco entre secciones, bullets consistentes y ejemplos actualizados.
- **Detección NLP Extendida:**
  - Se añadió el término singular evento a la detección de consultas de salud pública.
  - Nuevas frases para consultas sobre eventos que afectan a mujeres.
  - Handlers que informacion tienes para: Salud Mental, Salud Pública, Análisis de Riesgo, Calidad del Aire y Gráficos.
  - Handler que enfermedad es mas urbana/rural para análisis territorial comparativo.
- **Limpieza de Código:** Eliminación de comentarios inline en detección de salud pública.
- **Test Actualizado:** Nuevo test unitario para consulta de eventos rurales.

### Sprint 8: Soporte de Vacunación y Logging de Mensajes

> Commits: 9fed577 — Julio 5, 2026

- **handleVaccination implementado:** Manejador en BotUpdate que detecta intenciones de vacunación en lenguaje natural y delega a VaccinationService.
- **VaccinationService completo (SQLite):** Servicio TypeORM/SQLite que expone:
  - getAvailableQuestions() — Catálogo de indicadores por departamento/municipio.
  - Consulta top/bottom indicadores por entidad territorial.
  - Soporte para 32 departamentos y múltiples municipios del Valle del Cauca.
- **Help actualizado con Vacunación:** El menú /help incluye ejemplos de consultas de vacunación.
- **Logging de mensajes entrantes:** Logger en el handler @On(text) para registro de mensajes en producción.
- **Fix CaliHealthService:** Correcciones de compatibilidad y estabilidad.
- **Optimización ChartQueryService:** Ajustes en la lógica de consulta de gráficos.
- **Refactorización YopalHealthService:** Limpieza profunda (~900 líneas reorganizadas).

---

## 📋 Product Backlog (Pendientes)

| Prioridad | Tarea                           | Descripción                                                                            | Estado    |
| :-------- | :------------------------------ | :------------------------------------------------------------------------------------- | :-------- |
| Alta      | Vacunación: Consultas Avanzadas | Implementar top-5, comparativas y tendencias por indicador desde VaccinationService.   | En Curso  |
| Media     | Geocodificación de Direcciones  | Conversión de direcciones a coordenadas (lat/lon) para Antioquia, Boyacá y Cali.      | Pendiente |
| Media     | UI Polishing                    | Mejorar formato de mensajes largos y menús interactivos (Inline Buttons).              | Pendiente |
| Baja      | Dashboard Web Analítico         | Interfaz web externa para visualizaciones (gráficas del bot ya implementadas).         | Pendiente |
| Baja      | Exportación de Datos            | Permitir descargar resúmenes de salud en PDF/Excel.                                    | Pendiente |

---

## 🛠 Definition of Done (DoD)

Para que una tarea se considere terminada, debe:

1. Superar el linting (npm run lint).
2. Crear/Actualizar y pasar todos los tests unitarios y E2E (npm test / npm run test:e2e).
3. Estar documentada en el código y en este archivo si es un hito mayor.
4. No introducir errores de compilación (npm run build).

---

_Última actualización: 6 de julio de 2026_

---

## ✍️ Autores

**Maria G. Barrientos** y **Rubén D. Guerrero** — Colombia, 2026.
