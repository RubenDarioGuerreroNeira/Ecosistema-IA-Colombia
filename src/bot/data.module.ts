import { Module } from '@nestjs/common';
// Servicios existentes...
import { EnvironmentalModule } from './environmental/environmental.module';
import { PredictionModule } from './prediction/prediction.module';
import { AlertsModule } from './alerts/alerts.module';
import { SharedDataModule } from '../shared/data/shared-data.module';
import { TensorflowModule } from '../shared/tensorflow/tensorflow.module';

@Module({
  imports: [
    EnvironmentalModule,
    PredictionModule,
    AlertsModule,
    SharedDataModule,
    TensorflowModule
  ],
  providers: [
    // Servicios existentes...
  ],
  exports: [
    // Servicios existentes...
    EnvironmentalModule,
    PredictionModule,
    AlertsModule
  ],
})
export class DataModule {}
