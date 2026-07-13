import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { MentalHealthQuestionsService } from '../questions/mental-health-questions.service';
import { normalizeString } from '../../shared/health-utils';

@Injectable()
export class MentalHealthHandler {
    private readonly logger = new Logger(MentalHealthHandler.name);

    constructor(private readonly mentalHealthQuestionsService: MentalHealthQuestionsService) {}

    async handle(ctx: Context, text: string): Promise<boolean> {
        this.logger.log(`MentalHealthHandler processing text`);
        return await this.mentalHealthQuestionsService.handleMentalHealthQuery(ctx, text);
    }
}
