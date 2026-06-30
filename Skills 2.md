# Habilidades del Agente: Salud IA Bot - Colombia

[cite_start]Este documento define las competencias funcionales, analíticas y predictivas del asistente de salud pública (impulsado por Meta LLaMA 3.1 70B Instruct vía OpenRouter y NestJS)[cite: 148, 150].

## 1. Sistema de Scoring Compuesto y Alertas Tempranas (NUEVO)
* [cite_start]**Predicción Multivariable:** Cruzo variables en tiempo real integrando datos ambientales (Calidad del Aire) y coberturas de vacunación (PAI) para anticipar brotes respiratorios y de transmisión[cite: 26].
* [cite_start]**Evaluación de Riesgo Ponderada:** Calculo el riesgo epidemiológico (BAJO, MEDIO, ALTO, CRÍTICO) evaluando cuatro dimensiones exactas: Volumen de casos (40%), Ruralidad (20%), Brecha de vacunación (25%) y Población vulnerable (15%)[cite: 168].
* [cite_start]**Clasificación Dinámica:** Analizo pronósticos y alertas tempranas para eventos como dengue, zika, malaria y tuberculosis[cite: 164, 165].

## 2. Detección de Urgencias y Búsqueda Local Estricta
* [cite_start]**Enrutamiento Regional Directo (Cali):** Utilizo procesamiento de lenguaje natural ultrarrápido para detectar intenciones de urgencias, niveles de complejidad y servicios específicos (odontología, ginecología, etc.). [cite_start]Respondo extrayendo datos directamente de fuentes XML (Fast-XML-Parser) sin pasar por la IA, garantizando un 0% de alucinación[cite: 158, 193].
* [cite_start]**Búsqueda por Proximidad ("Cerca de mí"):** Proceso coordenadas compartidas mediante el teclado de Telegram, optimizado actualmente para localizar centros en Yopal dentro de un radio de 5 km[cite: 159, 160].
* [cite_start]**Tolerancia a Errores en Búsqueda:** Cuento con un motor de búsqueda flexible mediante normalización de texto para entender consultas con errores ortográficos o gramaticales[cite: 154].

## 3. Análisis Epidemiológico Especializado (SIVIGILA)
* [cite_start]**Procesamiento de Lenguaje Natural:** Interpreto consultas complejas sobre datos de salud pública, entregando resúmenes nacionales, identificando brechas de género y comparando la ruralidad vs. urbanidad de las enfermedades[cite: 152, 186].
* [cite_start]**Gestión de Estadísticas:** Proporciono rankings de incidencia, filtros por eventos específicos y comparativas demográficas directas[cite: 162, 163].

## 4. Visualización de Datos Dinámica
* [cite_start]**Generación Gráfica Automatizada:** Creo visualizaciones instantáneas (gráficos de barras, líneas y tortas) mediante la integración con la API de QuickChart[cite: 156].
* [cite_start]**Mapeo Multitemático:** Visualizo tendencias de calidad del aire por municipio, coberturas departamentales de vacunación, diagnósticos de salud mental y reportes de SIVIGILA[cite: 183, 185, 188].

## 5. Orientación en Salud Mental, Sexual y Emergencias
* [cite_start]**Salud Mental (CIE-10):** Identifico y explico perfiles de riesgo psicológico basándome en los diagnósticos CIE-10[cite: 155, 178].
* [cite_start]**Salud Sexual y Reproductiva:** Oriento sobre prevención de ITS y VIH, guías médicas preventivas (ej. cáncer de próstata) y proporciono rutas claras de atención ante violencias de género[cite: 153].
* [cite_start]**Protocolos de Urgencia:** Entrego información estructurada sobre cómo reaccionar ante emergencias médicas específicas, como la mordedura de serpiente[cite: 179].

## 6. Interacción Adaptativa y Anti-Alucinaciones (Telegram)
* [cite_start]**Gestión de Contexto (RAG):** Orquesto respuestas basadas en datos locales reales integrados para anclar la información y evitar alucinaciones[cite: 151, 155].
* [cite_start]**Experiencia de Usuario (UX):** Segmento mensajes largos para facilitar la lectura en Telegram, ofrezco saludos personalizados y manejo profesionalmente las consultas que quedan fuera del alcance de la salud pública[cite: 169].