import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // What an uptime check should watch, rather than the root route.
  //
  // The root answers from memory and so stays up long after the shop has
  // stopped working: the database sits in TiDB Cloud, and losing it takes the
  // catalogue, the cart and checkout with it while the process carries on
  // answering 200. This touches the connection, so a monitor pointed here
  // goes red for the same reasons a customer would.
  //
  // Unauthenticated on purpose — an uptime service cannot hold a token — and
  // it answers with nothing but a status, so there is nothing here worth
  // reading for anyone else.
  @Get('health')
  async health() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      // 503 rather than 500: the process is fine, its dependency is not, and
      // that is the distinction a monitor's alert should carry.
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'down',
      });
    }

    return {
      status: 'ok',
      database: 'up',
      uptime: Math.round(process.uptime()),
    };
  }
}
