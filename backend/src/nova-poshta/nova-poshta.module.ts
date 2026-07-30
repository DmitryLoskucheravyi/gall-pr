import { Module } from '@nestjs/common';

import { CartModule } from '../cart/cart.module';
import { SettingsModule } from '../settings/settings.module';
import { NovaPoshtaController } from './nova-poshta.controller';
import { NovaPoshtaService } from './nova-poshta.service';

@Module({
  imports: [CartModule, SettingsModule],
  providers: [NovaPoshtaService],
  controllers: [NovaPoshtaController],
  exports: [NovaPoshtaService],
})
export class NovaPoshtaModule {}
