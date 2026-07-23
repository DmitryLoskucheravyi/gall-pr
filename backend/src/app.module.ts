import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { User } from './users/entities/user.entity';
import { Painting } from './paintings/entities/painting.entity';
import { Material } from './materials/entities/material.entity';
import { Technique } from './techniques/entities/technique.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';

import { PaintingsModule } from './paintings/paintings.module';
import { MaterialsModule } from './materials/materials.module';
import { TechniquesModule } from './techniques/techniques.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';

import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,

      entities: [
        User,
        Painting,
        Material,
        Technique,
        CartItem,
        Order,
        OrderItem,
      ],

      synchronize: false,

      ssl: { rejectUnauthorized: true },
    }),
    UsersModule,

    AuthModule,

    PaintingsModule,

    MaterialsModule,

    TechniquesModule,

    CartModule,

    OrdersModule,

    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
