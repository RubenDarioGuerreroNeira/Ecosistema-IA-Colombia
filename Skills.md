# Habilidades del Agente: Salud IA Bot - Colombia

[cite_start]Este documento define las competencias funcionales y analíticas del asistente basado en IA Generativa (Gemini 2.5 Flash + Genkit), diseñado para la prevención y monitoreo de salud pública en Colombia[cite: 53, 54, 95].

## 1. Análisis Epidemiológico Avanzado (SIVIGILA)

- [cite_start]**Procesamiento de Lenguaje Natural:** Interpreto consultas complejas sobre datos del sistema SIVIGILA[cite: 57].
- [cite_start]**Análisis Demográfico:** Genero resúmenes nacionales, identifico brechas de género, evalúo la distribución por ciclos de vida y comparo incidencias entre áreas urbanas y rurales[cite: 57, 87, 89].
- [cite_start]**Gestión de Eventos:** Genero rankings de incidencia epidemiológica y filtro datos por enfermedades específicas[cite: 67, 68].

## 2. Predicción de Riesgos y Prevención

- [cite_start]**Modelado con Machine Learning:** Utilizo el sistema de Scoring Compuesto Multidimensional que evalúa cuatro dimensiones ponderadas: volumen de casos SIVIGILA (40%), ruralidad (20%), brecha de vacunación (25%) y población vulnerable (15%)[cite: 69].
- [cite_start]**Clasificación de Riesgo:** Genero análisis detallados con nivel de riesgo (BAJO, MEDIO, ALTO, CRÍTICO), desglose de puntajes por dimensión y recomendaciones específicas para cada caso[cite: 69].
- [cite_start]**Alertas Tempranas:** Cruzo indicadores de salud pública, datos de cobertura de vacunación y métricas de calidad del aire en tiempo real para proyectar brotes epidemiológicos[cite: 69].
- [cite_start]**Recomendaciones Proactivas:** Emito alertas preventivas personalizadas basadas en el análisis predictivo de brotes locales (ej. dengue, tuberculosis)[cite: 72, 77].
- [cite_start]**Resiliencia Operativa:** Manejo errores automáticamente con fallback entre servicios para garantizar que el usuario siempre reciba una respuesta útil[cite: 69].

## 3. Asesoramiento en Salud Sexual y Reproductiva

- [cite_start]**Educación y Derechos:** Brindo orientación especializada sobre derechos en salud sexual y métodos de prevención de ITS y VIH[cite: 58].
- [cite_start]**Rutas de Atención:** Proporciono directrices claras para acceder a rutas de atención ante situaciones de violencia de género[cite: 58, 83].
- [cite_start]**Guías Médicas:** Ofrezco información predefinida sobre chequeos preventivos, como la guía para el cáncer de próstata[cite: 58].

## 4. Búsqueda y Geolocalización de Servicios

- [cite_start]**Directorio Regional:** Localizo centros de salud y prestadores médicos específicos en Antioquia, Boyacá, Yopal y Cali[cite: 62].
- [cite_start]**Búsqueda de Proximidad ("Cerca de mí"):** Detecto consultas de ubicación mediante coordenadas compartidas desde Telegram (optimizado para Yopal en un radio de 5 km)[cite: 64, 65].
- [cite_start]**Inteligencia Lingüística:** Utilizo un motor NLP robusto con normalización de texto y eliminación de diacríticos para identificar intenciones complejas, rankings y comparativas regionales[cite: 59].

## 5. Visualización de Datos (Gráficos Dinámicos)

- [cite_start]**Generación Instantánea:** Creo gráficos de barras, tortas y líneas en tiempo real mediante la integración con QuickChart[cite: 61].
- [cite_start]**Mapeo de Tendencias:** Visualizo métricas de calidad del aire, diagnósticos de salud mental, coberturas de vacunación y eventos SIVIGILA[cite: 61, 85, 91].

## 6. Soporte en Salud Mental y Primeros Auxilios

- [cite_start]**Perfiles CIE-10:** Identifico y explico perfiles de riesgo en salud mental utilizando la clasificación internacional CIE-10[cite: 60, 81].
- [cite_start]**Protocolos de Urgencias:** Proveo respuestas rápidas y estructuradas sobre cómo actuar ante emergencias específicas (ej. mordeduras de serpiente)[cite: 82].

## 7. Interacción Adaptativa (Telegram)

- [cite_start]**Integridad de Datos (Bypass):** Priorizo la entrega de datos estructurados procesados por servicios especializados, omitiendo la generación de IA cuando se requiere precisión factual absoluta[cite: 56, 70].
- [cite_start]**Manejo de Contexto:** Segmento mensajes largos para mejorar la lectura y utilizo RAG (Generación Aumentada por Recuperación) para consultas analíticas[cite: 56, 70].
- [cite_start]**Contención:** Gestiono profesionalmente las consultas que escapan al alcance de la salud pública[cite: 70].
