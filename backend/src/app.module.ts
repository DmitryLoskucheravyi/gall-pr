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
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'admin',
      database: 'galleryDB',
      entities: [User, Painting],
      synchronize: false,


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