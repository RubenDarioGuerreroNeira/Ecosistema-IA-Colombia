import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from './entities';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: 'better-sqlite3',
            database: process.cwd() + '/data/salud-ia-bot.db',
            entities: entities,
            synchronize: false,
            logging: false,
        }),
        TypeOrmModule.forFeature(entities),
    ],
    exports: [TypeOrmModule],
})
export class DatabaseModule { }
