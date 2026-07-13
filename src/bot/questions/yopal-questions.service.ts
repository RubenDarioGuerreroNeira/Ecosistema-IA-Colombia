import { Injectable } from '@nestjs/common';
import { YopalHealthService } from '../yopal/yopal-health.service';
import { normalizeString } from '../../shared/health-utils';

@Injectable()
export class YopalQuestionsService {
  constructor(private readonly yopalHealthService: YopalHealthService) { }

  getAvailableQuestions(): string {
    return `💊 **Preguntas que puedo responder sobre datos de Centros o Prestadores de Salud en Yopal:**

🩺 **Servicios médicos específicos**
“¿Dónde puedo hacerme una radiografía en Yopal?”
“¿En qué centro puedo hacerme una mamografía?”
“¿Hay tomografía en Yopal?”
“Clínicas de odontología en Yopal”
“Fisioterapia en Yopal”
“Laboratorio clínico en Yopal”
“Centros de optometría u oftalmología”
“¿Dónde hacen ecografías?”
“Endodoncia en Yopal”

⏱️ **Atención 24 horas / urgencias**
“¿Qué clínicas atienden 24 horas en Yopal?”
“Servicios de urgencias en Yopal”
“Centros de atención inmediata”
“Hospital con emergencia las 24h”

🩺 **Recomendaciones por condición médica**
“Necesito un especialista para diabetes en Yopal”
“Médico para hipertensión”
“Atención para embarazo o control prenatal”
“Tratamiento para dolor de cabeza”
“Atención de fracturas”
“Caries – odontólogo en Yopal”
“Problemas de visión – ¿dónde ir?”

🚨 **Urgencias / emergencias (genérico)**
“Urgencias médicas en Yopal”
“Accidente, necesito una clínica”
“Atención para heridas graves”

📍 **Ubicación / dirección de un prestador**
“¿Dónde queda CAPRESOCA en Yopal?”
“Dirección de Hospital Regional de la Orinoquia”
“¿Dónde está la clínica URMEDICAS 24 HORAS?”
“Ubicación de COOMEVA en Yopal”

🏥 **Categorías de prestadores**
“¿Qué EPS hay en Yopal?”
“Lista de hospitales y clínicas”
“Laboratorios clínicos en Yopal”
“Opticas u oftalmólogos en Yopal”
“Ambulancias o transporte asistencial”
“Centros de radiología e imágenes diagnósticas”

👤 **Gerentes / directivos**
“¿Quién es el gerente de CAPRESOCA?”
“Nombre del director del hospital”
“Persona a cargo de SANITAS en Yopal”
“¿Quién dirige la clínica CASANARE S.A.?”

📊 **Estadísticas y resúmenes**
“¿Cuántos prestadores de salud hay en Yopal?”
“Resumen de servicios de salud en Yopal”
“Estadísticas de hospitales y EPS”
“¿Cuál es la cobertura geográfica de los centros de salud?”

🔍 **Búsqueda general (nombre, teléfono, dirección)**
“Buscar MEDIMAS en Yopal”
“Buscar SANITAS en Yopal”
“Buscar NUEVA EPS en Yopal”
“Teléfono de CRUZ ROJA en Yopal”
“Dirección de Clínica del Oriente”
“Correo electrónico de SERVINSALUD”

📍 **Búsqueda por cercanía (requiere compartir ubicación)**
“¿Hay un hospital cerca de mí?”
“Centros médicos cercanos”
“Clínicas a mi alrededor”

✨ **Nota:** Para consultas de cercanía, **comparte tu ubicación** usando el botón 📍 que aparece en el chat. Así podré calcular la distancia real.

Si quieres saber algo específico, solo pregúntame. ¡Estoy aquí para ayudarte con información de salud en Yopal!`;
  }

  /**
   * Detecta si una consulta es de cercanía (necesita ubicación).
   */
  isProximityQuery(text: string): boolean {
    const norm = normalizeString(text);
    const proximityKeywords = [
      'cerca', 'cercano', 'cercana', 'cercanos', 'alrededor',
      'proximidad', 'cerca de mi', 'a mi alrededor', 'donde queda cerca',
      'centro medico cerca', 'hospital cerca', 'clinica cerca',
      'farmacia cerca', 'urgencias cerca', 'atencion cerca',
    ];
    return proximityKeywords.some(keyword => norm.includes(keyword));
  }

  /**
   * Procesa una consulta de texto y retorna una respuesta formateada.
   * Si es una consulta de cercanía, retorna un mensaje especial pidiendo ubicación.
   */
  async processYopalQuery(text: string): Promise<string | null> {
    const norm = normalizeString(text);

    // Si es una pregunta genérica sobre qué sabe el bot de Yopal
    if (
      norm.includes('yopal') ||
      norm.includes('que sabes de yopal') ||
      norm.includes('hospitales en yopal') ||
      norm.includes('clinicas en yopal') ||
      norm.includes('prestadores de salud en yopal') ||
      norm.includes('centros de salud en yopal') ||
      norm.includes('centros de atencion en yopal') ||
      norm.includes('que información tienes de yopal') ||
      norm.includes('que informacion tienes de yopal') ||
      norm.includes('tienes alguna informacion sobre yopal')
    ) {
      return this.getAvailableQuestions();
    }

    // Detectar consulta de cercanía
    if (this.isProximityQuery(text)) {
      return `📍 Para ayudarte a encontrar **centros médicos cercanos en Yopal**, necesito que compartas tu ubicación actual. Usa el botón de ubicación 📍 que aparece en el chat (o en el menú de adjuntos). Así podré calcular la distancia y mostrarte los más cercanos.`;
    }

    // Para cualquier otra consulta, usar el método de lenguaje natural de YopalHealthService
    const { content, found } = await this.yopalHealthService.answerNaturalQuestion(text);
    return found ? content : null;
  }
}