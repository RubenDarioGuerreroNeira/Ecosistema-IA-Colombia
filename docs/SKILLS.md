# Habilidades del Agente: Salud IA Bot - Colombia

Este documento define las competencias funcionales, analíticas y predictivas del asistente de salud pública colombiana, impulsado por **NestJS** + **OpenRouter** (Meta LLaMA 3.1 70B Instruct) y alimentado con datos oficiales del sistema SIVIGILA, PAI, calidad del aire y XML/TXT locales.

---

## 1. Análisis Epidemiológico Avanzado (SIVIGILA)

- **Procesamiento de Lenguaje Natural:** Interpreta consultas complejas sobre datos del sistema SIVIGILA, entregando resúmenes nacionales, identificando brechas de género y comparando incidencia rural vs. urbana.
- **Análisis Demográfico:** Genera resúmenes nacionales, identifica brechas de género, evalúa distribución por ciclos de vida (niños, adolescentes, adultos, mayores) y compara incidencias entre áreas urbanas y rurales.
- **Gestión de Eventos:** Genera rankings de incidencia epidemiológica y filtra datos por enfermedades específicas (Dengue, Zika, Chikungunya, Malaria, Tuberculosis, etc.).

## 2. Sistema de Scoring Compuesto y Alertas Tempranas

- **Predicción Multivariable:** Cruza variables en tiempo real integrando datos ambientales (calidad del aire) y coberturas de vacunación (PAI) para anticipar brotes respiratorios y de transmisión.
- **Evaluación de Riesgo Ponderada:** Calcula el riesgo epidemiológico (BAJO, MEDIO, ALTO, CRÍTICO) evaluando cuatro dimensiones exactas:
  - Volumen de casos SIVIGILA (40%)
  - Ruralidad (20%)
  - Brecha de vacunación (25%)
  - Población vulnerable (15%)
- **Alertas Tempranas:** Cruza indicadores de salud pública, datos de cobertura de vacunación y métricas de calidad del aire para proyectar brotes epidemiológicos.
- **Clasificación Dinámica:** Analiza pronósticos y alertas tempranas para eventos como dengue, zika, malaria y tuberculosis.
- **Recomendaciones Proactivas:** Emite alertas preventivas personalizadas basadas en el análisis predictivo de brotes locales.

## 3. Asesoramiento en Salud Sexual y Reproductiva

- **Educación y Derechos:** Brinda orientación especializada sobre derechos en salud sexual y métodos de prevención de ITS y VIH.
- **Rutas de Atención:** Proporciona directrices claras para acceder a rutas de atención ante situaciones de violencia de género.
- **Guías Médicas:** Ofrece información predefinida sobre chequeos preventivos, como la guía para el cáncer de próstata y prevención de VPH.

## 4. Búsqueda y Geolocalización de Servicios

- **Directorio Regional:** Localiza centros de salud y prestadores médicos específicos en Antioquia, Boyacá, Yopal y Cali (Valle del Cauca).
- **Búsqueda de Proximidad ("Cerca de mí"):** Detecta consultas de ubicación mediante coordenadas compartidas desde Telegram, optimizado para Yopal en un radio de 5 km.
- **Enrutamiento Regional Directo (Cali):** Utiliza procesamiento de lenguaje natural ultrarrápido para detectar intenciones de urgencias, niveles de complejidad y servicios específicos (odontología, ginecología, etc.), respondiendo con datos extraídos directamente de fuentes XML sin pasar por la IA para garantizar 0% de alucinación.
- **Tolerancia a Errores:** Motor de búsqueda flexible mediante normalización de texto para entender consultas con errores ortográficos o gramaticales.
- **Inteligencia Lingüística:** Motor NLP robusto con normalización de texto y eliminación de diacríticos para identificar intenciones complejas, rankings y comparativas regionales.

## 5. Visualización de Datos (Gráficos Dinámicos)

- **Generación Instantánea:** Crea gráficos de barras, tortas y líneas en tiempo real mediante la integración con QuickChart.
- **Mapeo de Tendencias:** Visualiza métricas de calidad del aire por municipio, diagnósticos de salud mental, coberturas departamentales de vacunación y eventos SIVIGILA.

## 6. Soporte en Salud Mental y Primeros Auxilios

- **Perfiles CIE-10:** Identifica y explica perfiles de riesgo en salud mental utilizando la clasificación internacional CIE-10 (episodios depresivos, trastornos de ansiedad, trastorno bipolar, esquizofrenia, consumo de SPA).
- **Protocolos de Urgencias:** Provee respuestas rápidas y estructuradas sobre cómo actuar ante emergencias específicas (ej. mordeduras de serpiente, intoxicaciones).

## 7. Interacción Adaptativa (Telegram)

- **Integridad de Datos (Bypass):** Prioriza la entrega de datos estructurados procesados por servicios especializados, omitiendo la generación de IA cuando se requiere precisión factual absoluta.
- **Manejo de Contexto:** Segmenta mensajes largos para mejorar la lectura en Telegram y utiliza RAG (Generación Aumentada por Recuperación) para consultas analíticas.
- **Gestión de Contexto (RAG):** Orquesta respuestas basadas en datos locales reales integrados para anclar la información y evitar alucinaciones.
- **Contención:** Gestiona profesionalmente las consultas que escapan al alcance de la salud pública.
- **Experiencia de Usuario (UX):** Ofrece saludos personalizados y saluda a nuevos usuarios con información contextual.
- **Resiliencia Operativa:** Maneja errores automáticamente con fallback entre servicios para garantizar que el usuario siempre reciba una respuesta útil.

---

## Stack Tecnológico

| Componente        | Tecnología                               |
| ----------------- | ---------------------------------------- |
| Framework Backend | NestJS (Node.js + TypeScript)            |
| Motor IA          | OpenRouter (Meta LLaMA 3.1 70B Instruct) |
| Bot Telegram      | Telegraf / nestjs-telegraf               |
| Datos Locales     | Fast-XML-Parser (XML), TXT               |
| Visualización     | QuickChart API                           |
| Base de Datos     | SQLite (TypeORM)                         |
| Despliegue        | Node.js                                  |

---

## 8. Calidad y Pruebas - Corrección de tests (2026-07-12)

### 8.1 Configuración transversal (Jest / TypeScript)

- Se actualizó `ts-jest` al formato moderno de configuración (array con opciones) para eliminar warnings de deprecación.
- Se corrigió `moduleNameMapper` para resolver correctamente alias de imports locales en tests (`text-normalizer` desde `.js` a `.ts`).
- Se configuró `diagnostics: { ignoreCodes: [151002] }` en `ts-jest` para evitar falsos positivos de TypeScript en módulos aislados.

### 8.2 BotUpdate y servicios base

- Se agregó el provider `DEFAULT_BOT_NAME` en todos los tests que instancian `BotUpdate`.
- Se completaron mocks dependientes en `bot.update.spec.ts`:
  - `PredictiveQuestionsService` (incluyendo `processPredictiveQuery`).
  - `AirQualityQuestionsService`.
- Se creó `src/bot/bot.update.location.spec.ts` para cubrir el flujo de geolocalización:
  - Manejo de mensajes `location` y búsqueda de prestadores cercanos.
  - Detección de consultas "cerca de mí" y solicitud de ubicación por teclado.
  - Cobertura de casos sin resultados y mensajes sin ubicación.

### 8.3 Servicios con repositorios TypeORM (Antioquia y Boyacá)

- Se reestructuraron los specs para inyectar repositorios mockeados en el `Test.createTestingModule`:
  - `src/bot/boyaca/boyaca-health.service.spec.ts` → mock de `BoyacaProviderRepository`.
  - `src/bot/antioquia/antioquia-health.service.spec.ts` → mock de `AntioquiaProviderRepository`.
  - `src/bot/antioquia/antioquia-health-precision.spec.ts` → mock de `AntioquiaProviderRepository`.
- Se adaptaron las pruebas de `searchProviders`, `getMunicipios`, `findByIdentifier` y `getHospitalCount` al nuevo contrato del repositorio.

### 8.4 Ajustes en tests de Cali

- Se actualizó `src/bot/cali/cali-health.service.spec.ts`:
  - Se reemplazó el `assert` rígido del resumen de conocimiento por una validación flexible que reconoce el nuevo formato de salida (`'Red de Salud del Centro'` en lugar del nombre completo en mayúsculas).

### 8.5 AppController

- Se actualizó `src/app.controller.spec.ts` para reflejar el nuevo contrato de `getHello()`:
  - Ahora se valida el objeto JSON de respuesta (`message`, `name`, `status`, `timestamp`).

### 8.6 Resultado final y CI

- Ejecución completa de la suite: **125/125 tests en verde**.
- Cantidad de suites: **16/16 en verde**.
- Se agregó `.github/workflows/ci.yml` para ejecutar `npm ci` + `npm test -- --no-coverage` en push/PR a `main` y `master`.

#### Ejecución local

```bash
npm test            # Suite completa (125 tests)
npm run test:cov    # Con reporte de cobertura
```

_Documento generado a partir de la unificación de Skills.md y Skills 2.md. Refleja las capacidades reales del bot al momento de su creación._
