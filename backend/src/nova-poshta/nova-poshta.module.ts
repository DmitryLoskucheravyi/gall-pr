import { Module } from '@nestjs/common';

import { NovaPoshtaController } from './nova-poshta.controller';
import { NovaPoshtaService } from './nova-poshta.service';

@Module({
  providers: [NovaPoshtaService],
  controllers: [NovaPoshtaController],
})
export class NovaPoshtaModule {}
