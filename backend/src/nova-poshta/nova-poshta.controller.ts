import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';

import { NovaPoshtaService } from './nova-poshta.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { OptionalAuthenticatedRequest } from '../auth/types/optional-authenticated-request.type';
import { resolveIdentity } from '../common/identity.util';

@Controller('nova-poshta')
export class NovaPoshtaController {
  constructor(private readonly novaPoshtaService: NovaPoshtaService) {}

  @Get('cities')
  searchCities(@Query('query') query?: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    return this.novaPoshtaService.searchCities(query.trim());
  }

  @Get('warehouses')
  getWarehouses(@Query('cityRef') cityRef?: string) {
    if (!cityRef) {
      return [];
    }

    return this.novaPoshtaService.getWarehouses(cityRef);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('delivery-price')
  getDeliveryPrice(
    @Request() req: OptionalAuthenticatedRequest,
    @Query('cityRecipientRef') cityRecipientRef?: string,
    @Query('withRedelivery') withRedelivery?: string,
  ) {
    if (!cityRecipientRef) {
      return null;
    }

    return this.novaPoshtaService.calculateDeliveryPriceForIdentity(
      resolveIdentity(req),
      cityRecipientRef,
      withRedelivery === 'true',
    );
  }
}
