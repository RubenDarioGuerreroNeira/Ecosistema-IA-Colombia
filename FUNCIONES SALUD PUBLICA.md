LEE EL ARCHIVO EVENTOS DE INTERES EN SALUD PUBLICA.XML 

INSTRUCCIONES DE LO QUE QUIERO HACER, A DEMAS DE LAS INSTRUCCIONES, TE DOY ALGUNOS EJEMPLOS ESCRITOS EN PYTHON QUE USARAS COMO REFERENCIA, CREO QUE TE PODRIAN AYUDAR PARA DARTE EJEMPLOS CLAROS DE LO QUE DEBES DESARROLLAR EN ESTE BOT CON EL LENGUAJE QUE VENIMOS USANDO, NO USES PYTHON:

_preprocesar_keywords(self)	Construye índice de búsqueda con sinónimos
buscar_evento(self, nombre)	Busca por coincidencia exacta, parcial o por sinónimo. Retorna la fila del evento o None
listar_eventos(self)	Retorna lista de todos los nombres de eventos
obtener_total_casos(self)	Suma total de total_de_eventos
obtener_numero_eventos(self)	Cuenta eventos distintos

NIVEL 2 — Ranking y Topes

| Método                                                   | Descripción                      |
| -------------------------------------------------------- | -------------------------------- |
| `top_eventos(self, n=5, criterio='total_de_eventos')`    | Top N eventos por criterio dado  |
| `bottom_eventos(self, n=5, criterio='total_de_eventos')` | Eventos con menos casos          |
| `ranking_completo(self, criterio='total_de_eventos')`    | Todos los eventos ordenados      |
| `eventos_por_rango(self, min_casos, max_casos)`          | Eventos dentro de rango de casos |




Geográfico (Urbano/Rural):

| Método                                  | Descripción                                              |
| --------------------------------------- | -------------------------------------------------------- |
| `eventos_urbanos(self)`                 | Eventos con casos urbanos > 0                            |
| `eventos_rurales(self)`                 | Eventos con casos rurales > 0                            |
| `indice_ruralidad(self, nombre_evento)` | % de casos rurales (rural / (urbano+rural) \* 100)       |
| `eventos_mas_rurales(self, n=5)`        | Top N con mayor % rural                                  |
| `eventos_mas_urbanos(self, n=5)`        | Top N con mayor % urbano                                 |
| `comparar_zona(self, nombre_evento)`    | Retorna diccionario con urbano, rural, total, pct\_rural |


Por Sexo (Femenino/Masculino):

| Método                                     | Descripción                                                  |
| ------------------------------------------ | ------------------------------------------------------------ |
| `indice_feminizacion(self, nombre_evento)` | % de casos femeninos                                         |
| `eventos_mas_femeninos(self, n=5)`         | Top N con mayor % femenino                                   |
| `eventos_mas_masculinos(self, n=5)`        | Top N con mayor % masculino                                  |
| `comparar_sexo(self, nombre_evento)`       | Retorna diccionario con femenino, masculino, total, pct\_fem |


Por Grupo Etario:

| Método                                    | Descripción                              |
| ----------------------------------------- | ---------------------------------------- |
| `eventos_por_edad(self, grupo)`           | Eventos de un grupo etario específico    |
| `grupo_etario_mas_afectado(self)`         | Grupo con más casos acumulados           |
| `eventos_infantiles(self)`                | Eventos que afectan menores de 10 años   |
| `eventos_adolescentes(self)`              | Eventos que afectan 10-19 años           |
| `eventos_adultos(self)`                   | Eventos que afectan 20-49 años           |
| `eventos_adultos_mayores(self)`           | Eventos que afectan 50+ años             |
| `indice_infantil(self, nombre_evento)`    | % de casos en menores de 10              |
| `eventos_exclusivamente_infantiles(self)` | Eventos donde 100% de casos son <10 años |


NIVEL 4 — Comparaciones

| Método                                        | Descripción                         |
| --------------------------------------------- | ----------------------------------- |
| `comparar_eventos(self, nombre1, nombre2)`    | Compara dos eventos lado a lado     |
| `comparar_multiples(self, lista_nombres)`     | Compara N eventos en tabla          |
| `diferencia_absoluta(self, nombre1, nombre2)` | Diferencia en casos totales         |
| `diferencia_relativa(self, nombre1, nombre2)` | Diferencia porcentual               |
| `mas_comun_que(self, nombre_evento)`          | Eventos con más casos que el dado   |
| `menos_comun_que(self, nombre_evento)`        | Eventos con menos casos que el dado |


NIVEL 5 — Categorización

| Método                                   | Descripción                      |
| ---------------------------------------- | -------------------------------- |
| `eventos_por_categoria(self, categoria)` | Filtra por categoría clínica     |
| `resumen_categorias(self)`               | Totales por categoría            |
| `categoria_mas_frecuente(self)`          | Categoría con más casos          |
| `buscar_por_keyword(self, keyword)`      | Búsqueda libre por palabra clave |


ategorías predefinidas:
"infecciosos": Dengue, Zika, Chikungunya, Malaria, Tuberculosis, Hepatitis, VIH, Sífilis, Herpes, Parotiditis, Tos ferina, Chagas, ETA, Fiebre tifoidea
"violencia": Violencia de género, Lesiones externas, Accidentes de tránsito, Artefactos explosivos, Accidente de trabajo, Intento de suicidio, Agresiones por animales
"materno": Mortalidad materna, Mortalidad perinatal, Bajo peso al nacer, Defectos congénitos, Sífilis gestacional, Morbilidad materna extrema
"mental": Ansiedad, Depresión, Psicosis, Trastorno bipolar, Consumo de SPA
"laboral": Accidente de trabajo, Accidente ofídico
"nutricional": Desnutrición aguda, Fluorosis
"oncologico": Cáncer mama/cuello uterino, NIC 1, LEIBG NIC II, ASCUS
"ambiental": Intoxicaciones, Evento adversos vacunación, Infecciones quirúrgicas

NIVEL 6 — Análisis Avanzado

| Método                                    | Descripción                                                |
| ----------------------------------------- | ---------------------------------------------------------- |
| `concentracion_pareto(self)`              | Aplica regla 80/20: qué eventos concentran el 80% de casos |
| `eventos_raros(self, umbral=5)`           | Eventos con casos < umbral                                 |
| `eventos_endemicos(self)`                 | Eventos 100% en una sola zona (urbano o rural)             |
| `eventos_exclusivamente_femeninos(self)`  | Eventos 100% mujeres                                       |
| `eventos_exclusivamente_masculinos(self)` | Eventos 100% hombres                                       |


2. DICCIONARIO DE SINÓNIMOS
Implementa un diccionario robusto self.sinonimos que mapee palabras clave del usuario → nombre exacto del evento en el dataset.
Ejemplos de sinónimos a incluir:

| Palabra/Frase del usuario                                                                              | Evento real en dataset                                                    |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `"dengue"`, `"fiebre del dengue"`, `"dengue hemorrágico"`                                              | `DENGUE`                                                                  |
| `"varicela"`, `"viruela loca"`, `"chickenpox"`                                                         | `VARICELA INDIVIDUAL`                                                     |
| `"mordeduras"`, `"rabia"`, `"perros"`, `"gatos"`, `"mordedura de perro"`                               | `AGRESIONES POR ANIMALES POTENCIALMENTE TRANSMISORES DE RABIA`            |
| `"violencia de género"`, `"violencia intrafamiliar"`, `"maltrato"`, `"abuso"`, `"violencia doméstica"` | `VIGILANCIA EN SALUD PÚBLICA DE LAS VIOLENCIAS DE GÉNERO E INTRAFAMILIAR` |
| `"zika"`, `"fiebre zika"`                                                                              | `ZIKA`                                                                    |
| `"desnutrición"`, `"desnutrición aguda"`, `"niños desnutridos"`                                        | `DESNUTRICION AGUDA EN MENORES DE 5 AÑOS`                                 |
| `"ansiedad"`, `"trastorno de ansiedad"`, `"nerviosismo"`                                               | `ANSIEDAD`                                                                |
| `"fluorosis"`, `"manchas en dientes"`, `"exceso de flúor"`                                             | `FLUOROSIS`                                                               |
| `"accidente laboral"`, `"trabajo"`, `"lesión laboral"`                                                 | `ACCIDENTE DE TRABAJO`                                                    |
| `"intoxicación"`, `"envenenamiento"`, `"intoxicaciones"`                                               | `INTOXICACIONES`                                                          |
| `"hepatitis"`, `"hepatitis b"`, `"hepatitis c"`                                                        | `HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA`                        |
| `"parotiditis"`, `"paperas"`                                                                           | `PAROTIDITIS`                                                             |
| `"depresión"`, `"tristeza"`, `"depresivo"`                                                             | `DEPRESIÓN`                                                               |
| `"suicidio"`, `"intentar suicidarse"`, `"autolesión"`                                                  | `INTENTO DE SUICIDIO`                                                     |
| `"vih"`, `"sida"`, `"hiv"`                                                                             | `VIH/SIDA - MORTALIDAD POR SIDA`                                          |
| `"cáncer"`, `"cáncer de mama"`, `"cuello uterino"`, `"cáncer cervical"`                                | `CÁNCER DE LA MAMA Y CUELLO UTERINO`                                      |
| `"defectos de nacimiento"`, `"malformaciones"`, `"congénitos"`                                         | `DEFECTOS CONGENITOS`                                                     |
| `"víbora"`, `"serpiente"`, `"mordedura de serpiente"`, `"ofidismo"`                                    | `ACCIDENTE OFIDICO`                                                       |
| `"chikungunya"`, `"chikunguña"`, `"fiebre chik"`                                                       | `CHIKUNGUYA`                                                              |
| `"tuberculosis"`, `"tb"`, `"tisis"`                                                                    | `TUBERCULOSIS`                                                            |
| `"malaria"`, `"paludismo"`                                                                             | `MALARIA`                                                                 |
| `"tos ferina"`, `"pertussis"`, `"tos convulsa"`                                                        | `TOS FERINA`                                                              |
| `"chagas"`, `"mal de chagas"`, `"enfermedad de chagas"`                                                | `CHAGAS`                                                                  |
| `"spa"`, `"drogas"`, `"sustancias"`, `"adicción"`, `"consumo de drogas"`                               | `CONSUMO DE SPA`                                                          |
| `"lesiones"`, `"heridas"`, `"trauma"`                                                                  | `LESIONES DE CAUSA EXTERNA`                                               |
| `"eventos adversos"`, `"vacuna"`, `"efectos de vacuna"`                                                | `EVENTO ADVERSO SEGUIDO A LA VACUNACION`                                  |
| `"eta"`, `"enfermedad transmitida por alimentos"`, `"contaminación alimentaria"`                       | `ENFERMEDAD TRANSMITIDA POR ALIMENTOS O AGUA (ETA)`                       |
| `"sífilis"`, `"sífilis gestacional"`                                                                   | `SIFILIS GESTACIONAL`                                                     |
| `"mortalidad materna"`, `"muerte materna"`, `"muerte de madre"`                                        | `MORTALIDAD MATERNA`                                                      |
| `"mortalidad perinatal"`, `"muerte neonatal"`, `"muerte de bebé"`                                      | `MORTALIDAD PERINATAL Y/O NEONATAL TARDÍA`                                |
| `"bajo peso"`, `"prematuro"`, `"bebé pequeño"`                                                         | `BAJO PESO AL NACER`                                                      |
| `"infección quirúrgica"`, `"infección de sitio quirúrgico"`                                            | `INFECCIONES DE SITIO QUIRÚRGICO...`                                      |
| `"espirometría"`, `"esi-irag"`, `"vigilancia centinela"`                                               | `ESI-IRAG (VIGILANCIA CENTINELA)`                                         |


3. NORMALIZACIÓN DE TEXTO
Implementa una función _normalizar_texto(self, texto) que:
Convierte a minúsculas
Elimina tildes y diacríticos (á → a, é → e, í → i, ó → o, ú → u, ñ → n)
Elimina signos de puntuación (.,;:!?¿¡ etc.)
Elimina espacios extra (strip, collapse múltiples espacios)
Maneja abreviaturas comunes: "tb" → "tuberculosis", "vih" → "vih sida", "spa" → "consumo de spa"
Tokeniza para búsqueda por palabras individuales

def _normalizar_texto(self, texto):
    """Normaliza texto para búsqueda robusta"""
    if not texto:
        return ""
    # Minúsculas
    texto = texto.lower()
    # Eliminar tildes
    tildes = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 
              'Á': 'a', 'É': 'e', 'Í': 'i', 'Ó': 'o', 'Ú': 'u',
              'ñ': 'n', 'Ñ': 'n'}
    for orig, repl in tildes.items():
        texto = texto.replace(orig, repl)
    # Eliminar puntuación
    import re
    texto = re.sub(r'[^\w\s]', '', texto)
    # Collapse espacios
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto

    4. MANEJO DE AMBIGÜEDAD
Cuando una búsqueda arroje múltiples coincidencias, el bot debe:
Detectar ambigüedad: Si hay más de 1 coincidencia, no adivinar.
Presentar opciones: Listar los eventos encontrados con número de casos.
Solicitar clarificación: Pedir al usuario que elija o sea más específico.
Implementa resolver_ambiguedad(self, coincidencias, texto_original):

def resolver_ambiguedad(self, coincidencias, texto_original):
    """
    Cuando hay múltiples coincidencias, genera mensaje de clarificación.
    
    Ejemplo de salida:
    "Encontré 3 eventos relacionados con 'hepatitis':
     1. HEPATITIS A (5 casos)
     2. HEPATITIS B (3 casos)  
     3. HEPATITIS B, C Y COINFECCIÓN HEPATITIS B Y DELTA (7 casos)
     
     ¿Cuál te interesa? Escribe el número o el nombre exacto."
    """

    Reglas de ambigüedad:
Si el usuario escribe "hepatitis" → ambiguo (hay Hepatitis A, B, B/C)
Si el usuario escribe "hepatitis b" → desambiguar entre Hepatitis B y Hepatitis B/C
Si el usuario escribe "dengue" → único, no hay ambigüedad
Si el usuario escribe "violencia" → único (solo hay uno con esa palabra)
5. RESPUESTAS CON CONTEXTO (Natural Language Generation)
No devuelvas solo números. Genera frases completas y contextuales.
Implementa _formatear_respuesta(self, datos, tipo) que reciba:
datos: diccionario con los valores numéricos
tipo: tipo de consulta ("total", "comparacion", "ranking", "zona", "sexo", "edad", "categoria")
Ejemplos de formato de salida:

| Tipo de consulta | Datos de entrada                                                    | Respuesta generada                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Total**        | `{"evento": "DENGUE", "total": 117}`                                | *"El evento **DENGUE** registra **117 casos** en total."*                                                                                                                                                 |
| **Zona**         | `{"evento": "DENGUE", "urbano": 56, "rural": 61}`                   | *"El **DENGUE** se distribuye así: **56 casos en zona urbana** (47.9%) y **61 casos en zona rural** (52.1%). Predomina levemente en zona rural."*                                                         |
| **Sexo**         | `{"evento": "DENGUE", "femenino": 57, "masculino": 60}`             | *"El **DENGUE** afecta a **57 mujeres** (48.7%) y **60 hombres** (51.3%). Hay una ligera predominancia masculina."*                                                                                       |
| **Edad**         | `{"evento": "DENGUE", "primera_infancia": 35, "infancia": 34, ...}` | *"Por grupos de edad, el **DENGUE** afecta principalmente a **primera infancia con 35 casos** (29.9%), seguido de **infancia con 34 casos** (29.1%)."*                                                    |
| **Comparación**  | `{"e1": "DENGUE", "v1": 117, "e2": "ZIKA", "v2": 22}`               | *"El **DENGUE** (117 casos) tiene **95 casos más** que el **ZIKA** (22 casos), lo que representa un **431.8% más**."*                                                                                     |
| **Ranking**      | `{"top": [("DENGUE", 117), ("VARICELA", 84), ...]}`                 | *"Los 3 eventos más frecuentes son:\n1. 🥇 **DENGUE**: 117 casos\n2. 🥈 **VARICELA INDIVIDUAL**: 84 casos\n3. 🥉 **AGRESIONES POR ANIMALES...**: 71 casos"*                                               |
| **Categoría**    | `{"categoria": "infecciosos", "eventos": [...], "total": 184}`      | *"La categoría **Infecciosos** incluye 16 eventos con un total de **184 casos**. Los principales son: Dengue (117), Varicela (84), Agresiones por animales potencialmente transmisores de rabia (71)..."* |


Reglas de formato:
Usar negritas para nombres de eventos y números clave
Incluir porcentajes siempre que sea posible
Agregar emojis para categorías: 🦠 infecciosos, ⚠️ violencia, 👶 materno, 🧠 mental, 💼 laboral, 🍎 nutricional, 🎗️ oncológico, 🏭 ambiental
Para comparaciones, indicar cuál es mayor y la magnitud de la diferencia
Para rankings, usar medallas 🥇🥈🥉 para top 3
6. FALLBACK INTELIGENTE
Cuando el bot no encuentre el evento solicitado, debe:
Implementa _fallback(self, texto_normalizado):
Buscar coincidencias aproximadas usando difflib.SequenceMatcher o fuzzywuzzy
Sugerir el evento más similar
Ofrecer búsqueda por categoría como alternativa
Mostrar lista de eventos disponibles si todo falla
Ejemplo de interacción:
Usuario: "dengu"
Bot: "No encontré exactamente 'dengu'. ¿Quizás te refieres a DENGUE (117 casos)? Escribe sí para confirmar o dime qué otro evento buscas."
Usuario: "cancer"
Bot: "No encontré 'cancer'. Los eventos más similares son:\n- CÁNCER DE LA MAMA Y CUELLO UTERINO (3 casos)\n- LESIONES ESCAMOSAS INTRAEPITELIALES DE BAJO GRADO (NIC 1) (9 casos)\n\n¿Cuál de estos te interesa? O escribe 'listar todo' para ver todos los eventos."
Usuario: "gripe" (no existe en el dataset)
Bot: "No encontré eventos relacionados con 'gripe'. ¿Te gustaría buscar en alguna categoría?\n- 🦠 Infecciosos (16 eventos)\n- 🧠 Mental (4 eventos)\n- 👶 Materno (7 eventos)\n\nO escribe 'listar todo' para ver los 52 eventos disponibles."
7. ROUTER DE INTENCIONES (NLP Básico)
Implementa procesar_pregunta(self, texto) que detecte la intención del usuario y enrute al método correcto.
Intenciones a detectar:

| Intención   | Palabras clave                                                                    | Método a invocar          |
| ----------- | --------------------------------------------------------------------------------- | ------------------------- |
| `CUANTOS`   | "cuántos", "cuantos", "número", "total", "casos", "cuanto", "cuánto"              | `_intencion_cuantos()`    |
| `TOP`       | "top", "más comunes", "principales", "mayores", "ranking", "lista de"             | `_intencion_top()`        |
| `COMPARAR`  | "comparar", "vs", "versus", "más que", "menos que", "diferencia", "entre"         | `_intencion_comparar()`   |
| `DONDE`     | "dónde", "donde", "zona", "urbano", "rural", "lugar", "área", "region"            | `_intencion_donde()`      |
| `QUIEN`     | "quién", "quien", "sexo", "hombres", "mujeres", "femenino", "masculino", "genero" | `_intencion_quien()`      |
| `EDAD`      | "edad", "niños", "adultos", "adolescentes", "mayores", "infancia", "jóvenes"      | `_intencion_edad()`       |
| `CATEGORIA` | "categoría", "tipo", "grupo", "enfermedades", "eventos de", "clase"               | `_intencion_categoria()`  |
| `QUE_ES`    | "qué es", "definición", "información sobre", "dime sobre", "explica"              | `_intencion_definicion()` |
| `LISTAR`    | "listar", "mostrar todo", "ver todos", "cuáles hay", "que eventos hay"            | `listar_eventos()`        |
| `AYUDA`     | "ayuda", "help", "como funciona", "qué puedes hacer", "opciones"                  | `_intencion_ayuda()`      |


Implementación del router:

def procesar_pregunta(self, texto):
    texto_norm = self._normalizar_texto(texto)
    
    # Detectar intención por keywords
    if any(k in texto_norm for k in ['cuantos', 'cuanto', 'numero', 'total', 'casos']):
        return self._intencion_cuantos(texto_norm)
    elif any(k in texto_norm for k in ['top', 'mas comunes', 'principales', 'mayores', 'ranking']):
        return self._intencion_top(texto_norm)
    elif any(k in texto_norm for k in ['comparar', 'vs', 'versus', 'mas que', 'menos que', 'diferencia', 'entre']):
        return self._intencion_comparar(texto_norm)
    # ... etc
    
    # Fallback: buscar evento directamente
    evento = self.buscar_evento(texto)
    if evento:
        return self._formatear_respuesta(evento, "total")
    
    # Último fallback
    return self._fallback(texto_norm)

    8. MÉTODO DE AYUDA / MENÚ
Implementa _intencion_ayuda(self) que muestre al usuario todo lo que el bot puede hacer:

def _intencion_ayuda(self):
    return """🤖 **¡Hola! Soy tu asistente de Salud Pública.** 

Puedo ayudarte con estas consultas:

📊 **Estadísticas generales**
- "¿Cuántos casos totales hay?"
- "¿Cuántos eventos hay?"
- "Lista todos los eventos"

🏆 **Rankings**
- "Top 5 eventos más comunes"
- "Eventos con menos casos"
- "Ranking completo"

🔍 **Buscar eventos específicos**
- "¿Cuántos casos de dengue hay?"
- "¿Qué es la fluorosis?"
- "Dime sobre violencia de género"

🗺️ **Por zona geográfica**
- "¿Dónde ocurre más el dengue?"
- "Eventos más rurales"
- "¿Qué hay en zona urbana?"

👥 **Por sexo**
- "¿Qué eventos afectan más a mujeres?"
- "¿Quién se ve más afectado por el dengue?"

👶 **Por edad**
- "¿Qué eventos afectan a niños?"
- "Eventos de adolescentes"
- "¿Cuál es el grupo más afectado?"

⚖️ **Comparaciones**
- "Compara dengue y chikungunya"
- "¿Hay más dengue o zika?"

📂 **Por categoría**
- "Eventos infecciosos"
- "Eventos de violencia"
- "Eventos materno-infantiles"

💡 **Tip:** Puedes usar sinónimos. Por ejemplo, "mordeduras de perro", "rabia" o "agresiones por animales" todos funcionan.
"""

📋 FORMATO DE SALIDA ESPERADO
Genera el código en un solo archivo Python (salud_publica_bot.py) con:
Imports necesarios (xml.etree.ElementTree, pandas, re, difflib, unicodedata)
Clase SaludPublicaBot con TODOS los métodos descritos
Bloque de ejecución con ejemplos de uso:

if __name__ == "__main__":
    bot = SaludPublicaBot("Eventos_de_Interés_en_Salud_Pública.xml")
    
    # Ejemplos de consultas
    print(bot.procesar_pregunta("¿Cuántos casos de dengue hay?"))
    print(bot.procesar_pregunta("Top 3 eventos más comunes"))
    print(bot.procesar_pregunta("Compara dengue y chikungunya"))
    print(bot.procesar_pregunta("¿Qué eventos afectan más a mujeres?"))
    print(bot.procesar_pregunta("Eventos infecciosos"))
    print(bot.procesar_pregunta("dengu"))  # Prueba de fallback




CRITERIOS DE CALIDAD
El código debe cumplir:
[ ] Sin errores de ejecución con el XML proporcionado
[ ] Manejo robusto de excepciones (evento no encontrado, XML malformado, etc.)
[ ] Respuestas en español natural y con contexto
[ ] Sinónimos extensos (mínimo 80 mapeos)
[ ] Normalización completa (tildes, mayúsculas, puntuación)
[ ] Ambigüedad resuelta con clarificación al usuario
[ ] Fallback inteligente con sugerencias aproximadas
[ ] Código comentado y con docstrings en cada método
[ ] Ejemplos funcionales en el bloque __main__
