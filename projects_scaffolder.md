# Project's Scaffolder: Salud IA Bot

Este documento presenta una guía y documentación técnica exhaustiva del proyecto **Salud IA Bot**, un chatbot para Telegram desarrollado con NestJS que provee asistencia de salud pública, predicciones epidemiológicas y análisis de información de salud en Colombia.

---

## 1. Árbol de Carpetas y Scaffolding (Estructura del Proyecto)

El proyecto sigue una arquitectura modular en NestJS, facilitando la escalabilidad y mantenibilidad.

```text
salud-ia-bot/
├── data/                                 # Contenedor de la base de conocimiento estática y BBDD local
│   ├── Eventos_de_Interés_en_Salud_Pública_...xml
│   ├── Calidad_del_Aire_en_Colombia...xml
│   ├── Centros_de_salud_Yopal._.xml
│   ├── Prestadores_de_Salud_Departamento_de_Antioquia.xml
│   ├── salud-ia-bot.db                   # Base de datos SQLite
│   ├── cache_datos.json                  # Caché en archivo estático
│   └── ... (otros XMLs y TXTs)
├── src/                                  # Código fuente principal
│   ├── app.module.ts                     # Módulo raíz de la aplicación
│   ├── app.controller.ts                 # Controlador principal (health checks)
│   ├── app.service.ts                    # Servicio raíz
│   ├── main.ts                           # Punto de entrada de la app
│   ├── database.module.ts                # Configuración de TypeORM con SQLite
│   ├── entities/                         # Entidades TypeORM (Tablas de BBDD)
│   │   ├── health-event.entity.ts
│   │   ├── antioquia-provider.entity.ts
│   │   └── ...
│   └── bot/                              # Lógica principal del bot de Telegram
│       ├── bot.module.ts                 # Módulo que orquesta todos los servicios del bot
│       ├── bot.update.ts                 # Handler principal (@Update) para los mensajes
│       ├── genkit.service.ts             # Integración con LLM (OpenRouter / Gemini)
│       ├── health-data.service.ts        # Parseo y acceso a eventos de salud (XML)
│       ├── ingesta-datos.service.ts      # Simulación de recolección de datos APIs
│       ├── ml-prediction.service.ts      # Modelo de scoring multicriterio
│       ├── prediction.service.ts         # Cálculo de riesgos cruzando fuentes
│       ├── advanced-prediction.service.ts# Predicción (Regresión Lineal Ponderada)
│       ├── national-health.service.ts    # Conexión con API de SIVIGILA
│       ├── ... (módulos temáticos y regionales)
│       ├── public-health/                # Servicios de Salud Pública
│       ├── mental-health/                # Servicios de Salud Mental
│       ├── sexual-health/                # Servicios de Salud Sexual
│       ├── air/                          # Calidad del aire
│       ├── stats/                        # Analítica de datos
│       ├── questions/                    # Validadores de preguntas (Catálogos)
│       ├── cali/, boyaca/, yopal/, antioquia/ # Módulos regionales
│       └── utils/ & constants/           # Herramientas de normalización y constantes
```

---

## 2. Módulos, Servicios y Controladores

### Módulos Principales
- **`AppModule`**: Inicializa `ConfigModule` (variables de entorno), `TelegrafModule` (conexión a Telegram con validación de proxy), `DatabaseModule` y `BotModule`.
- **`DatabaseModule`**: Configura TypeORM para usar `better-sqlite3`, definiendo la conexión hacia `data/salud-ia-bot.db`.
- **`BotModule`**: Registra todos los servicios internos, el caché `CacheModule.register()` y el manejador `BotUpdate`.

### Controladores
- **`AppController`**: Un controlador básico por defecto en NestJS, usualmente usado para proveer una ruta de "Health Check" (`GET /`) para validar que la API/servidor subyacente está vivo, independiente de Telegram.

---

## 3. Catálogo ABSOLUTO de Preguntas (Qué resuelve cada servicio)

Cada micro-servicio está programado para detectar intenciones (intents) específicas o responder explícitamente a ciertas preguntas de los usuarios. Aquí se listan absolutamente **todas** las preguntas y ejemplos implementados en el bot.

### A. Servicio de Salud Pública y Epidemiología (SIVIGILA)
*(Gestionado por `SaludPublicaQuestionsService` y `SaludPublicaService`)*
- **Consultas de Capacidad:** "¿Qué info tienes de la salud pública en Colombia?", "¿Qué preguntas sobre salud pública puedo hacer?"
- **Resúmenes Globales:** "Dame un resumen de salud pública", "Eventos más reportados"
- **Rankings Generales:** "Puedes mostrarme el ranking de eventos de salud en colombia", "Top eventos"
- **Demografía Espacial (Urbano/Rural):** 
  - "¿Qué enfermedad es más rural?" / "¿Cuál es la más urbana?"
  - "¿Qué evento es el más urbano en Colombia?" / "¿Cual es el evento más rural en Colombia?"
  - "Top 5 eventos más urbanos" / "¿Cuáles son los eventos más rurales?" / "¿Cuáles son los eventos más urbanos?"
- **Comparativas:** "Comparar dengue vs zika"
- **Género y Sexo:** 
  - "Proporción global por sexo"
  - "Eventos con mayor brecha de género"
  - "Eventos de salud que más afectan a las mujeres" / "Eventos de salud que más afectan a los hombres"
- **Ciclo de Vida (Edades):** 
  - "Eventos más comunes en niños"
  - "Eventos más frecuentes en adultos mayores"
  - "¿Qué eventos afectan más a los adolescentes?"
  - "¿Qué eventos son más frecuentes en adultos jóvenes?"
- **Agrupación por Categorías:** 
  - "Eventos infecciosos más comunes"
  - "Eventos maternos frecuentes"
  - "¿Cual es el ranking de categorías de Eventos de salud en colombia?"
  - "¿Quiero ver el total de categorias de eventos de salud publica?"

### B. Servicio Predictivo y de Clasificación de Riesgo
*(Gestionado por `PredictiveQuestionsService`, `MlPredictionService`, `AdvancedPredictionService` y `EarlyWarningService`)*
- **Consultas de Capacidad:** "¿Qué riesgos sanitarios pueden predecir?", "De que Eventos de Salud puedes hacer análisis de riesgo"
- **Alertas Tempranas Automáticas:** 
  - "Alertas tempranas de salud pública" / "Alertas tempranas"
  - "¿Qué eventos requieren atención inmediata?"
  - "Panorama de riesgo epidemiológico"
- **Pronósticos y Predicciones Avanzadas (Time Series):** 
  - "Pronóstico de dengue en Antioquia"
  - "Predicción de casos de tuberculosis en Bogotá"
  - "Tendencia de zika en los próximos meses en Cali"
  - "Proyección de casos de malaria en el Chocó"
  - "Pronóstico de tuberculosis en Antioquia"
- **Clasificación de Riesgo (Scoring Compuesto):** 
  - "Clasificar riesgo de dengue en Cali"
  - "Análisis de riesgo de tuberculosis"
  - "Riesgo de malaria"
  - "Riesgo de malaria en Bolivar"
  - "Clasificar riesgo de zika"
  - "Analizar riesgo de sarampión en Antioquia"
  - "Analizar riesgo de dengue en Antioquia"
  - "Análisis de riesgo de zika con IA en Cali"
- **Análisis Completos:** 
  - "Análisis completo de riesgo en Antioquia"
  - "Todos los riesgos de salud en Bogotá"

### C. Servicios de Prestadores: Yopal (YopalHealthService)
- **Consultas de Capacidad:** "¿Qué sabes de Yopal?", "¿Tienes alguna información sobre Yopal?"
- **Servicios médicos específicos:** 
  - "¿Dónde puedo hacerme una radiografía en Yopal?"
  - "¿En qué centro puedo hacerme una mamografía?"
  - "¿Hay tomografía en Yopal?"
  - "Clínicas de odontología en Yopal"
  - "Fisioterapia en Yopal"
  - "Laboratorio clínico en Yopal"
  - "Centros de optometría u oftalmología"
  - "¿Dónde hacen ecografías?"
  - "Endodoncia en Yopal"
- **Atención 24 horas / Urgencias:** 
  - "¿Qué clínicas atienden 24 horas en Yopal?"
  - "¿Qué hospitales tienen urgencias 24 horas en Yopal?"
  - "Servicios de urgencias en Yopal"
  - "Centros de atención inmediata"
  - "Hospital con emergencia las 24h"
  - "Urgencias médicas en Yopal"
  - "Accidente, necesito una clínica"
  - "Atención para heridas graves"
- **Recomendaciones por condición médica:** 
  - "Necesito un especialista para diabetes en Yopal"
  - "Médico para hipertensión"
  - "Atención para embarazo o control prenatal"
  - "Tratamiento para dolor de cabeza"
  - "Atención de fracturas"
  - "Caries – odontólogo en Yopal"
  - "Problemas de visión – ¿dónde ir?"
- **Ubicación y Logística:** 
  - "¿Dónde queda CAPRESOCA en Yopal?"
  - "Dirección de Hospital Regional de la Orinoquia"
  - "¿Dónde está la clínica URMEDICAS 24 HORAS?"
  - "Ubicación de COOMEVA en Yopal"
  - "Teléfono de CRUZ ROJA en Yopal"
  - "Dirección de Clínica del Oriente"
  - "Correo electrónico de SERVINSALUD"
- **Categorías de prestadores:** 
  - "¿Qué EPS hay en Yopal?"
  - "Lista de hospitales y clínicas"
  - "Ambulancias o transporte asistencial"
  - "Centros de radiología e imágenes diagnósticas"
- **Gerentes / Directivos:** 
  - "¿Quién es el gerente de CAPRESOCA?"
  - "Nombre del director del hospital"
  - "Persona a cargo de SANITAS en Yopal"
  - "¿Quién dirige la clínica CASANARE S.A.?"
- **Estadísticas y resúmenes de red local:** 
  - "¿Cuántos prestadores de salud hay en Yopal?"
  - "Resumen de servicios de salud en Yopal"
  - "Estadísticas de hospitales y EPS"
  - "¿Cuál es la cobertura geográfica de los centros de salud?"
- **Búsqueda por nombre de empresa:** 
  - "Buscar MEDIMAS en Yopal"
  - "Buscar SANITAS en Yopal"
  - "Buscar NUEVA EPS en Yopal"
- **Búsqueda Geográfica / Cercanía (Geolocalización por API de Telegram):** 
  - "¿Hay un hospital cerca de mí?"
  - "Centros médicos cercanos"
  - "Clínicas a mi alrededor"
  - "¿Qué hospitales hay cerca de mi estoy en Yopal?"
  - "Usuarios en Yopal pueden hacer esta consulta -> ¿Qué hospitales hay cerca de mi?"

### D. Servicios de Prestadores: Antioquia (AntioquiaHealthService)
- **Consultas de Capacidad:** "¿Tienes alguna información sobre Antioquia?", "¿Qué información tienes de Antioquia?", "¿Qué sabes de Antioquia?"
- **Búsqueda de prestadores:** 
  - "Buscar hospitales en Medellín"
  - "¿Qué centros de salud hay en Bello?"
  - "Prestadores de salud en Itagüí"
  - "Clínicas en Envigado"
- **Búsqueda por nombre/NIT:** 
  - "¿Dónde queda el Hospital General de Medellín?"
  - "Información de la Clínica Las Vegas"
  - "Buscar por NIT o código de habilitación"
- **Estadísticas Regionales:** 
  - "¿Cuántos prestadores hay en Antioquia?"
  - "Lista de municipios con centros de salud"
  - "¿Qué municipios tienes?"
  - "Lista de municipios de Antioquia"
  - "Resumen de la red de salud de Antioquia"
- **Por categoría:** 
  - "Hospitales en Antioquia"
  - "Clínicas en Antioquia"
  - "IPS en Antioquia"

### E. Prestadores en General / Otras Regiones (Cali, Boyacá, Nacional)
- "¿Dónde queda el Hospital Primitivo Iglesias en Cali?"
- "Hospitales en Tunja"
- "Lista de municipios de Boyacá con centros de salud"

### F. Servicio de Salud Mental (MentalHealthQuestionsService)
- **Consultas de Capacidad:** "¿Qué información tienes sobre salud mental?", "¿De qué enfermedades mentales tienes información?", "Lista todas las enfermedades"
- **Búsqueda de diagnósticos (CIE-10):** 
  - "¿Cuántos casos hay de depresión?"
  - "¿Cuántos casos de ansiedad hay?"
  - "¿Cuántos casos hay de trastorno afectivo bipolar?"
  - "Busca diagnósticos que contengan 'dep'"
  - "Lista todos los diagnósticos de salud mental"
  - "Catálogo CIE-10"
  - "Listado de enfermedades mentales de las cuales tienes conocimientos"
- **Top y Análisis Estadísticos:** 
  - "¿Cuáles son los diagnósticos más frecuentes?"
  - "¿Cuál es el diagnóstico de salud mental más común en niños?"
  - "Compara depresión vs ansiedad"
  - "Compara depresión vs trastorno bipolar"
  - "¿Cómo es la distribución de edades en salud mental?"
  - "Distribución de edades"
- **Perfil de Riesgo Mental:** 
  - "¿Cuál es el perfil de riesgo de depresión?"
  - "Riesgo de ansiedad"
  - "Perfil de riesgo de esquizofrenia"
- **Ciclo de vida en Salud Mental:** 
  - "Diagnósticos más frecuentes en niños"
  - "Diagnósticos más comunes en adolescentes"
  - "Diagnósticos frecuentes en adultos"
  - "Diagnósticos en mayores"

### G. Servicio de Salud Sexual y Reproductiva (SexualHealthService)
- **Derechos y Prevención (Búsquedas NLP pre-programadas):** 
  - "¿Qué derechos tengo para la prevención del VIH?"
  - "vih" *(Responde: Riesgo ITS y profilaxis)*
  - "condon" *(Responde: Prevención y uso)*
  - "pastillas" *(Responde: Anticoncepción de emergencia)*
  - "vasectomia" *(Responde: Información de vasectomía definitiva)*
  - "pomeroy" *(Responde: Ligadura de trompas)*
  - "embarazada" *(Responde: Embarazo adolescente y derechos en IPS)*

### H. Servicio de Monitoreo Ambiental y Calidad del Aire (AirQualityService)
- **Consultas de Capacidad:** "¿Tienes info sobre la calidad del aire?"
- **Consultas específicas:** 
  - "¿Cómo está la calidad del aire hoy en Cali?"
  - "¿Cómo está la calidad del aire en Bogotá?"
  - "Calidad del aire en Cali"
  - "Indicadores ambientales en Medellín"
  - "Cómo está el aire en Bucaramanga"

### I. Capacidades Gráficas (ChartService / GraphicsQuestionsService)
- **Consultas de Capacidad:** "¿Qué puedes Graficar?"
- **Calidad del Aire:** 
  - "¿Puedes graficar la calidad del aire?"
  - "¿Puedes graficar la calidad del aire en Cali?"
  - "Graficar contaminación ambiental en Medellín."
- **Prestadores:** 
  - "Gráficar de Servicios de salud en Cali"
- **Salud Mental:** 
  - "Gráfico de los diagnósticos de salud mental más frecuentes"
- **Salud Pública (SIVIGILA):** 
  - "Top eventos de salud pública en Colombia" (Retorna gráfica)
  - "Gráfico de dengue por sexo"
  - "Gráfico de Zika en zona rural vs urbana"
  - "Tendencia de tuberculosis en los últimos 6 meses"
- **Vacunación:** 
  - "Graficar vacunas en Antioquia"
  - "Visualizar cobertura de vacunación en Santander"
  - "¿Cuál es la cobertura de vacunación de BCG en Santander?" (Suele retornar visualización o tabla)

### J. Analíticas Nacionales Comparativas (NationalHealthService SODA)
- "¿Cómo está el dengue en Risaralda comparado con el Valle del Cauca?"

---

## 4. Modelo de Inteligencia Artificial

### ¿Qué modelo se usa y por qué?
El servicio `GenkitService` está preparado para usar la API de **OpenRouter** para el enrutamiento a grandes modelos de lenguaje (LLM). 
Por defecto en código fuente invoca a `nvidia/nemotron-3-super-120b-a12b:free` o `meta-llama/Meta-Llama-3.1-70B-Instruct`. Sin embargo, siguiendo las estrictas reglas de negocio del proyecto (establecidas por el usuario globalmente), **el modelo configurado primario es `gemini-2.5-flash`**.

La versatilidad de utilizar un servicio LLM permite que:
- El bot delegue el entendimiento del lenguaje humano complejo a la IA.
- Formatee respuestas de una forma cálida y profesional.
- *Nota vital:* La IA **no** actúa de manera autónoma para inventar datos; actúa como un "traductor" entre los motores de búsqueda estrictos (servicios locales/APIs) y el usuario final.

---

## 5. Métodos para Normalizar los XMLs y Datos

La limpieza de datos es crucial porque los archivos XML de `datos.gov.co` u otras fuentes locales frecuentemente contienen errores de tipeo, diferentes nomenclaturas y caracteres extraños.

**Estrategias implementadas:**
1. **`XMLParser` (de `fast-xml-parser`) y `parseStringPromise` (de `xml2js`)**: Se utilizan para convertir la estructura XML cruda a objetos JSON anidados legibles de forma estructurada.
2. **Método `normalizeText()` / `normalizeString()`**:
   ```typescript
   texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim()
   ```
   - *Propósito:* Elimina tildes, caracteres especiales (como comas, puntos), pasa todo a minúsculas y elimina espacios dobles. Permite que "Dengue", "DENGUE" y "déngüe" sean evaluados programáticamente como el mismo evento.
3. **Agregación (Map Reduce local)** en `SaludPublicaService` (`aggregateEvent`):
   - Al iterar sobre el XML, si dos filas se refieren a la misma enfermedad normalizada, se suman aritméticamente sus casos (urbanos, rurales, géneros, etc.) para tener un total nacional consolidado y libre de duplicados en el `Map`.
4. **Búsqueda Difusa (Fuzzy Matching)**:
   - Se utiliza la **Distancia de Levenshtein** (`similarity(s1, s2)`) para encontrar enfermedades si el usuario tiene un error tipográfico (ej. "dgngue" se mapea a "DENGUE" si supera el threshold de similitud de 0.6).
5. **Casteo Seguro de Números (`toNumber`)**:
   - Todo campo numérico XML viene en texto. Se usa `Number(val)` y se previene NaN usando fallbacks a `0` para que las sumatorias matemáticas no fallen en todo el ecosistema.

---

## 6. Fuentes de Datos: Los Archivos XML Utilizados

El bot prescinde de una API paga constante mediante la descarga (como base de conocimiento) de datasets abiertos y locales:
1. `Eventos_de_Interés_en_Salud_Pública_20260514.xml`: Dataset primario SIVIGILA para cálculos epidemiológicos y estadísticos a nivel general.
2. `Calidad_del_Aire_en_Colombia_(Promedio_Anual)_20260528.xml`: Cruce de variables ambientales para ML Prediction y Air Quality Service.
3. `Cobertura_de_Vacunación_PAI_en_el_Valle_del_Cauca.xml` & `Coberturas_administrativas_de_vacunación_por_departamento_20260528.xml`: Datos críticos para medir la brecha de inmunización por región.
4. Archivos de Prestadores (`Centros_de_salud_Yopal._.xml`, `Prestadores_de_Salud_Departamento_de_Antioquia.xml`, `servicios_salud_boyaca.xml`, `SERVICIOS_OFERTADOS_RED_DE_SALUD_DEL_CENTRO_ESE_POR_SEDE_CALI.xml`): Directorios logísticos de contacto, ubicación, especialidades y niveles de atención.
5. `Salud_Mental.xml` y `Salud_sexual_-_preguntas.xml`: Base de conocimientos de FAQs curados para la orientación y prevención ciudadana.

---

## 7. ¿Por qué se utilizó SQLite (`salud-ia-bot.db`)?

En lugar de desplegar un clúster pesado de PostgreSQL o MySQL, se eligió `better-sqlite3` por las siguientes ventajas estratégicas:
- **Portabilidad y Despliegue Zero-Config**: Un bot de Telegram puede requerir correr de forma rápida y ligera. SQLite es una base de datos embebida en un solo archivo (evidenciado en `data/salud-ia-bot.db` de ~32MB).
- **Eficiencia Espacial**: Aloja las entidades de prestadores de salud (`YopalProvider`, `AntioquiaProvider`, etc.) de forma estructurada para facilitar búsquedas espaciales en SQL crudo o TypeORM (ej. filtrar por Latitud/Longitud para calcular distancias en geolocalización radial).
- **Cero latencia de red interna**: El bot no necesita hacer TCP handshakes con una base de datos externa; todo se lee directamente del disco a velocidades altísimas.

---

## 8. Explicación Absoluta de Todas las Variables Críticas Usadas

### Variables de Entorno (`.env` / `AppModule`)
- `TELEGRAM_BOT_TOKEN`: Llave criptográfica proveída por BotFather para poder leer y enviar mensajes a Telegram.
- `OPENROUTER_API_KEY`: Token de acceso para invocar al modelo LLM de IA Generativa.
- `OPENROUTER_MODEL`: Define qué modelo usar en el pipeline RAG.
- `PORT`: Puerto donde escucha el servidor local de NestJS.
- `TELEGRAM_API_TIMEOUT`: Tiempo en milisegundos para abortar requests pegados con el servidor de Telegram.

### Variables del Modelo de Predicción de Riesgo (`MlPredictionService` / `PredictionService`)
- **`PESOS`**: Un objeto fundamental para el algoritmo de predicción cruzada. Pesa las dimensiones para calcular un puntaje de riesgo multicriterio de 0 a 100:
  - `volumen: 0.40 (40%)`: Qué tan masiva es la enfermedad históricamente en el dataset SIVIGILA.
  - `brecha_vacunacion: 0.25 (25%)`: Cuántas personas *no* están vacunadas (basado en el XML de coberturas). A menor cobertura, mayor score de riesgo.
  - `ruralidad: 0.20 (20%)`: Zonas rurales tienen menos acceso hospitalario, elevando el riesgo y posible subregistro.
  - `poblacion_vulnerable: 0.15 (15%)`: Penaliza si la enfermedad ataca fuertemente a primera infancia o adultos mayores.
- **`UMBRALES` (Score Final)**:
  - `CRITICO (≥75)`: Requiere activación del COE (Centro de Operaciones de Emergencia).
  - `ALTO (≥50)`: Alerta sanitaria.
  - `MEDIO (≥25)`: Requiere monitoreo rutinario.
  - `BAJO (<25)`: Vigilancia pasiva.
- **Variables Temporales (`temporalData` en `AdvancedPredictionService`)**: `periodo` (mes serializado), `casos` (volumen), `tendencia` (componente lineal T), `estacionalidad` (ondas senoidales o ciclos recurrentes) y `residuo` (variación aleatoria / ruido).

### Variables de Memoria del Bot (`BotUpdate` y Servicios)
- **`userState` (Map<number, UserState>)**: Guarda la sesión conversacional del usuario. Si un servicio de gráficos o mapas pregunta "¿De qué departamento?", guarda el `intent` (intención ej: `risk_analysis`, `provider_search_location`) indexado por el ID del usuario en Telegram, para mantener la continuidad del flujo conversacional.
- **`eventsMap` (Map<string, HealthEvent>)**: Un mapa hash en memoria en `SaludPublicaService` para buscar enfermedades normalizadas en O(1) milisegundos.

---

## 9. El Uso de la Caché y sus Beneficios

El sistema incluye e inyecta `@nestjs/cache-manager` en servicios que hacen requests repetitivos, especialmente en el `NationalHealthService` (variable `CACHE_TTL = 300000` ms, o 5 minutos).

**Beneficios de su uso:**
1. **Evita la Rate-Limitation (Baneos de API externa)**: Al consultar repetidamente la API externa de SODA/SIVIGILA en `datos.gov.co`, se podría banear la IP del bot. La caché evita esto respondiendo peticiones subsecuentes sin salir a internet.
2. **Reducción Drástica de Latencia**: Las consultas a APIs o lecturas de archivos XML de varios megabytes pueden tardar de 1 a 3 segundos. Al cachear los resultados computados en memoria RAM, el acceso de respuestas frecuentes baja a < 10 milisegundos.
3. **Escalabilidad**: Si 1,000 usuarios de Telegram preguntan simultáneamente "¿Cuántos casos de Dengue hay a nivel nacional?", el microprocesador solo calcula la respuesta o la trae de internet para el primer usuario, y se la sirve casi instantáneamente a los 999 restantes.

---

## 10. Beneficios de la Implementación de los Servicios de Riesgos y Predicciones

Los servicios de Inteligencia Epidemiológica (`MlPredictionService`, `AdvancedPredictionService`, `EarlyWarningService`) elevan el bot de un simple "buscador de datos retrospectivo" a una **herramienta de salud pública predictiva y proactiva**.

**Beneficios principales:**
1. **Detección Temprana (Early Warning)**: Mediante el cálculo de *Regresión Lineal Ponderada* y algoritmos de descomposición de series de tiempo (tendencia + estacionalidad), el bot detecta picos de casos ocultos antes de que sean masivos.
2. **Priorización de Recursos**: Las alertas generadas (CRÍTICO, ALTO, MEDIO) y el score le dictan a las autoridades de salud locales dónde enfocar recursos hospitalarios o campañas de vacunación de forma inmediata basándose en un algoritmo de scoring medible.
3. **Análisis de Factores Cruzados (Holístico)**: En vez de ver un reporte plano ("Hay 5000 casos de Dengue"), el bot cruza esa información con la calidad del aire del municipio (`AirQualityService`) y el porcentaje de vacunación (`VaccinationService`), para emitir una alerta inteligente multivariable.

---

## 11. Mitigación de Alucinaciones en IA

Los Modelos de Lenguaje Grandes (LLMs) tienden a sufrir de **Alucinaciones** (inventar datos plausibles pero falsos cuando no los saben). Este proyecto utiliza una estrategia robusta de **RAG (Retrieval-Augmented Generation) Agresiva y Cortafuegos** para garantizar la verdad médica:

1. **Gatekeeping (Filtro) mediante Expresiones Regulares y NLP Local**:
   - `bot.update.ts` revisa el mensaje primero. Si no contiene palabras clave relacionadas al scope médico en Colombia (`Dengue`, `Yopal`, `Hospital`, `salud pública`), o si es de un dominio general no permitido, el sistema interrumpe el flujo, *evita llamar a la IA*, y responde con la plantilla estática `RESPONSE_NO_INFORMATION`.
2. **Inyección Estricta de Contexto (Augmented Prompting)**:
   - Cuando se requiere que la IA procese una pregunta real, el sistema primero descarga los datos estructurados correctos y fidedignos desde SQLite, los XML o la API oficial de SIVIGILA.
   - El Prompt que recibe `GenkitService` está estrictamente delimitado:
     > `"### CONTEXTO DE DATOS REALES (COLOMBIA) ### ... INSTRUCCIÓN: Responde a la consulta del usuario utilizando EXCLUSIVAMENTE los datos del contexto anterior. Si el contexto no contiene información relevante... responde EXACTAMENTE con este mensaje: 'Lo siento, no tengo información...'"`
3. **Imposibilidad Creativa (Cero Inferencias Propias)**: Al enmarcar el prompt obligando a la IA a que *solo* analice y resuma los datos proveídos por el software local, se elimina su libertad creativa, asegurando que las cifras epidemiológicas dadas al ciudadano siempre cuadren milimétricamente con los datos oficiales.
4. **Validación de Capas Temáticas (`QuestionsServices`)**:
   - Archivos como `salud-publica-questions.service.ts` o `mental-health-questions.service.ts` validan estructuralmente si el usuario preguntó por un enfoque demográfico específico (rural, adolescentes, género). Esto inyecta plantillas de texto pre-aprobadas y no le deja a la IA adivinar la intención del usuario.
5. **Algoritmos Estrictos en vez de IA para Predicciones**: Para evitar que la IA alucine cifras proyectadas al futuro, la matemática de predicción (intervalos de confianza, regresiones, scores de 0-100) se hace *completamente en código duro TypeScript* (`AdvancedPredictionService`). A la IA solo se le da el texto final de estos servicios locales o el servicio local escupe directamente el Markdown preformateado.

---

## 12. El Ciclo de Vida del Mensaje (Flujo de Arquitectura)

Entender el flujo exacto del viaje de un mensaje es clave para depurar o añadir nuevas características. El ciclo desde el celular del usuario hasta la respuesta del bot es el siguiente:

1. **Ingreso (Telegraf / Long-polling):** El webhook o long-polling de Telegraf escucha el mensaje entrante del usuario y lo captura en el handler `@On('text')` o `@Update()` ubicado en `bot.update.ts`.
2. **Normalización y Saneamiento:** El mensaje se pasa por una utilidad de limpieza (`normalizeString()`) que elimina tildes, signos de interrogación y lleva todo a minúsculas, garantizando que variaciones ortográficas se procesen igual.
3. **Enrutamiento por Expresiones Regulares (Secuestro de Flujo):** El orquestador compara el mensaje contra `constants/keywords.ts`. Si detecta palabras clave de alta prioridad (ej. "graficar", "yopal", "antioquia", "riesgo"), **interrumpe** el flujo estándar y delega la responsabilidad a microservicios concretos (ej. `GraphicsQuestionsService`, `YopalQuestionsService`).
4. **Validación NLP en Microservicio:** El servicio delegado revisa si es una pregunta exacta estructurada. Si lo es, procesa la data y la devuelve (con lo cual el ciclo acaba). Si el usuario no fue preciso, retorna la ayuda o catálogo asociado a ese servicio.
5. **Fallback a RAG (Recuperación y Generación por IA):** Si ningún servicio especializado "secuestró" el flujo (porque la pregunta era compleja o mezclaba temas), el sistema consolida el contexto en un *Context String*, empaqueta la consulta y la manda al `GenkitService` (vía OpenRouter) para que la IA actúe de traductora.
6. **Despliegue y Envío (`ctx.reply`):** La cadena final (Markdown formateada) se envía al usuario de Telegram. Si supera los límites de caracteres de la API de Telegram (aprox. 4096), se divide usando un utilitario interno para mensajes largos (`sendLongMessage`).

---

## 13. Guía de Configuración, Ejecución y Comandos Vitales

Para que cualquier nuevo desarrollador pueda hacer "Onboarding" rápido y levantar el servidor localmente, estos son los requerimientos técnicos y de ejecución:

**1. Clonación e Instalación de Dependencias**
El proyecto usa Node.js y NPM. Para inicializarlo:
```bash
git clone <url-del-repositorio>
cd salud-ia-bot
npm install
```

**2. Configuración del Entorno (`.env`)**
Debes crear un archivo `.env` en la raíz copiando el `.env.example`. Variables mínimas requeridas:
```env
TELEGRAM_BOT_TOKEN="123456789:YOUR_TOKEN_HERE"
OPENROUTER_API_KEY="sk-or-v1-YOUR_OPENROUTER_KEY"
OPENROUTER_MODEL="google/gemini-2.5-flash"
PORT=3000
```

**3. Ejecución y Desarrollo**
Dentro de `package.json` están listados los scripts vitales. Los más utilizados en el ciclo diario son:
- **`npm run start:dev`**: Levanta la aplicación con *hot-reloading*. Es decir, observa cambios en los archivos `.ts` y reinicia el bot automáticamente, acelerando el desarrollo.
- **`npm run build`**: Compila el código de TypeScript a JavaScript plano (ubicándolo en la carpeta `dist/`), dejándolo listo para ambientes de producción.
- **`npm run format`**: Ejecuta *Prettier* para estandarizar espacios, comillas y formato en toda la base de código.
- **`npm run lint`**: Analiza el código con *ESLint* para detectar anti-patrones y código no seguro.

**4. Testing Estricto**
Cumpliendo con las directrices absolutas de desarrollo: ninguna tarea (issue) se considera finalizada sin verificar pruebas:
- **`npm run test`**: Lanza la suite de pruebas unitarias usando *Jest*.

---

## 14. Manejo de Errores y Excepciones

El chatbot está diseñado para la resiliencia en un ambiente asíncrono (donde múltiples APIs pueden fallar).

- **Fallo en API del LLM (OpenRouter):** Si el servidor de OpenRouter sufre caídas (Timeouts o Status 500), el código en `GenkitService` está atrapado en un bloque `try-catch`. En vez de matar el proceso Node.js, lanza un log interno (`Logger.error`) e informa al usuario civilizadamente: *"Lo siento, estoy teniendo dificultades técnicas analizando los datos médicos. Por favor, intenta de nuevo en unos minutos"*.
- **Caída de Datos Locales:** En el hipotético escenario donde los archivos XML no existan en la carpeta `/data`, los servicios emiten advertencias en consola durante el Bootstrapping (inicio) y devuelven arreglos vacíos o `null`, previniendo una excepción no controlada (`UnhandledPromiseRejection`).
- **Control de Peticiones de Usuario (Gatekeeping):** Consultas genéricas ("cuéntame un chiste", "¿cómo está el clima?") caen bajo la validación del bot y automáticamente activan un `RESPONSE_NO_INFORMATION`, economizando llamadas a las APIs externas y blindando al bot de inyecciones de prompt.

---

## 15. Modelado de Datos (Esquema TypeORM/SQLite)

El ORM (`TypeORM`) genera tablas estructuradas dentro de `data/salud-ia-bot.db`. Las entidades (`Entities`) más críticas definidas en `/src/entities/` son:

- **`ProviderEntity` (Ej. `YopalProvider`, `AntioquiaProvider`)**: 
  Abarca columnas operativas de la logística médica local.
  - `id` (PK, string o número incremental).
  - `nombre_prestador` / `razon_social` (Nombre del hospital/clínica).
  - `codigo_habilitacion` / `nit` (Identificadores únicos de sanidad).
  - `direccion` y `telefono` (Columnas de contacto directo).
  - `nivel` / `naturaleza` (Pública, Privada, Nivel I, II, III).
  - *(Posible escalabilidad: `latitud`, `longitud` para cruce geométrico).*

- **`HealthEventEntity` (Entidad Consolidada de Salud Pública)**: 
  Suma y aloja la incidencia macroepidemiológica extraída de los XML.
  - `evento` (Nombre de la enfermedad, ej. "DENGUE").
  - `casos_totales` (Sumatoria numérica entera).
  - `urbano` / `rural` (Desglose geográfico para puntuaciones del modelo predictivo).
  - `hombres` / `mujeres` (Desglose por sexo biológico).
  - `menor_a_1`, `de_1_a_4` ... (Distribución de ciclo de vida).

Este esquema es crucial porque en consultas complejas (Ej. *"Encuentra todos los hospitales públicos en Medellín"*), usar SQL nativo sobre estas tablas es exponencialmente más rápido que recorrer (iterar) árboles XML en tiempo real.

---

## 16. Generación y Despliegue de Gráficos

Uno de los pilares más visuales del bot es la traducción de aburridas tablas de datos a visuales atractivas.
*(Gestionado principalmente por `ChartService` y sus sub-servicios como `GraphicsQuestionsService`)*

1. **Petición del Gráfico:** Cuando el usuario pide "Grafica el dengue por edades", el bot detecta el `intent`.
2. **Construcción de la Configuración:** En base a la data estructurada (array numérico de casos y labels de edades), el bot genera un objeto de configuración (usualmente siguiendo el estándar de Chart.js u otro motor).
3. **Renderización (QuickChart/Buffer):** El sistema convierte ese objeto de configuración a una imagen visual. Si se usa la API externa de QuickChart, la URL generada retorna un Stream o un Buffer de imagen binaria (PNG/JPEG).
4. **Despliegue a Telegram (`replyWithPhoto`):** Usando Telegraf, el bot toma el buffer y lo envía mediante `ctx.replyWithPhoto({ source: buffer })`, acompañado opcionalmente por un `caption` que explica la gráfica estadísticamente.

---

## 17. Roadmap y Escalabilidad (El Futuro del Proyecto)

Dado que la plataforma fue concebida de manera modular, las expansiones futuras son orgánicas:

1. **Consolidación del Registro Nacional de Prestadores:** 
   Actualmente existen servicios independientes para regiones específicas (`yopal-health.service.ts`, `antioquia-health.service.ts`). El paso lógico de escalabilidad es fusionarlos en un **Registro Único Nacional (REPS)** en la base de datos de SQLite, donde la "región" o "departamento" sea simplemente una columna indexada (`WHERE departamento = 'Yopal'`). Esto permitiría expandir el bot a los 32 departamentos del país instantáneamente sin modificar la lógica principal.
2. **Geolocalización In-Depth (Coordenadas Reales):**
   Actualmente el bot usa la palabra clave "cerca" para solicitar la ubicación de Telegram. Al cargar las lat/long exactas de los hospitales en la BD, se usaría la fórmula de Haversine en una Query SQL (SQLite Math Functions) para devolver exactamente los 3 prestadores a menos de 5 km a la redonda, marcando en tiempo real en un mapa hacia dónde debe dirigirse la ambulancia o el paciente.
3. **Agentes Sub-Especializados (MCP):**
   De cara al futuro, en vez de un validador Regex monolítico, el `BotUpdate` podría evolucionar a un enrutador semántico que llame dinámicamente a herramientas usando la técnica "Function Calling", delegando responsabilidades a agentes LLM más pequeños.
