import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { User } from './users/entities/user.entity';
import { Painting } from './paintings/entities/painting.entity';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';


import { PaintingsModule } from './paintings/paintings.module';

import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,

      entities: [User, Painting],

      synchronize: false,

      ssl: {
        rejectUnauthorized: true,
      },
    }),
    UsersModule,

    AuthModule,

    PaintingsModule,

    UploadsModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }