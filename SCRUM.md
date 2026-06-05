# Scrum Framework - Salud IA Bot 🏥🤖

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

### Sprint 4: Refactorización y Mejora de Experiencia

- **Refactorización de Servicios:** Consolidación de lógica en `MentalHealthQuestionsService`, `SaludPublicaQuestionsService`, `YopalQuestionsService` y `GraphicsQuestionsService`.
- **Cobertura de Tests:** Implementación robusta de tests unitarios y E2E para nuevos servicios.
- **Geolocalización:** Implementación de búsqueda de prestadores por coordenadas (radio 5km).

---

## 📋 Product Backlog (Pendientes)

| Prioridad | Tarea                          | Descripción                                                                                                  | Estado     |
| :-------- | :----------------------------- | :----------------------------------------------------------------------------------------------------------- | :--------- |
| **Media** | Geocodificación de Direcciones | Investigar e implementar la conversión de direcciones a coordenadas (lat/lon) para Antioquia, Boyacá y Cali. | Pendiente  |
| **Media** | UI Polishing                   | Mejorar el formato de mensajes largos y menús interactivos (Inline Buttons).                                 | Pendiente  |
| **Baja**  | Dashboard Analítico            | Integración con Genkit para generar visualizaciones dinámicas de tendencias de salud.                        | Pendiente  |
| **Baja**  | Exportación de Datos           | Permitir a los usuarios descargar resúmenes de salud en PDF/Excel.                                           | Pendiente  |

---

## 🛠 Definition of Done (DoD)

Para que una tarea se considere terminada, debe:

1. Superar el linting (`npm run lint`).
2. Pasar todos los tests unitarios (`npm test`).
3. Estar documentada en el código y en este archivo si es un hito mayor.
4. No introducir errores de compilación (`npm run build`).

---

_Última actualización: 5 de junio de 2026_
