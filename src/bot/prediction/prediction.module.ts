import { Module } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { SharedDataModule } from '../../shared/data/shared-data.module';
import { TensorflowModule } from '../../shared/tensorflow/tensorflow.module';

@Module({
  imports: [SharedDataModule, TensorflowModule],
  providers: [PredictionService],
  exports: [PredictionService],
})
export class PredictionModule {}
