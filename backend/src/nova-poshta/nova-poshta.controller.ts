import { Controller, Get, Query } from '@nestjs/common';

import { NovaPoshtaService } from './nova-poshta.service';

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
}
