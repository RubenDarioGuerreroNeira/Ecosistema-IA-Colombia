import { Module } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';

@Module({
  providers: [
    {
      provide: 'TENSORFLOW',
      useValue: tf
    }
  ],
  exports: ['TENSORFLOW']
})
export class TensorflowModule {}
