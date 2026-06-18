import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Painting } from './entities/painting.entity';
import { PaintingsController } from './paintings.controller';
import { PaintingsService } from './paintings.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Painting,
        ]),
    ],
    providers: [PaintingsService],
    controllers: [PaintingsController],
    exports: [PaintingsService],
})
export class PaintingsModule {}