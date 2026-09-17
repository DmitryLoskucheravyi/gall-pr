import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { User } from './users/entities/user.entity';
import { Painting } from './paintings/entities/painting.entity';
import { Material } from './materials/entities/material.entity';
import { Series } from './series/entities/series.entity';
import { Technique } from './techniques/entities/technique.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { AppSettings } from './settings/entities/app-settings.entity';
import { PaintingLike } from './likes/entities/painting-like.entity';
import { SupportChat } from './support/entities/support-chat.entity';
import { SupportMessage } from './support/entities/support-message.entity';
import { Giveaway } from './giveaways/entities/giveaway.entity';
import { GiveawayParticipant } from './giveaways/entities/giveaway-participant.entity';
import { News } from './news/entities/news.entity';
import { TelegramPendingLink } from './telegram/entities/telegram-pending-link.entity';
import { MailOutbox } from './mail/entities/mail-outbox.entity';
import { RefreshSession } from './auth/entities/refresh-session.entity';
import { PasswordReset } from './auth/entities/password-reset.entity';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';

import { PaintingsModule } from './paintings/paintings.module';
import { MaterialsModule } from './materials/materials.module';
import { SeriesModule } from './series/series.module';
import { TechniquesModule } from './techniques/techniques.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { SettingsModule } from './settings/settings.module';
import { LikesModule } from './likes/likes.module';
import { SupportModule } from './support/support.module';
import { GiveawaysModule } from './giveaways/giveaways.module';
import { NewsModule } from './news/news.module';
import { NovaPoshtaModule } from './nova-poshta/nova-poshta.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';

import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { HttpOnlyThrottlerGuard } from './common/throttler.guard';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // A baseline ceiling on everything, so no route is completely unmetered
    // just because nobody thought about it. Routes worth guarding harder —
    // login, register, the Telegram code, guest-cart claims — carry their own
    // stricter @Throttle. Generous enough that ordinary browsing (a catalogue
    // page fires a burst of requests) never trips it.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
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
        Series,
        Technique,
        CartItem,
        Order,
        OrderItem,
        AppSettings,
        PaintingLike,
        SupportChat,
        SupportMessage,
        Giveaway,
        GiveawayParticipant,
        News,
        TelegramPendingLink,
        MailOutbox,
        RefreshSession,
        PasswordReset,
      ],

      synchronize: false,

      ssl: { rejectUnauthorized: true },
    }),
    UsersModule,

    AuthModule,

    PaintingsModule,

    MaterialsModule,

    SeriesModule,

    TechniquesModule,

    CartModule,

    OrdersModule,

    SettingsModule,

    LikesModule,

    SupportModule,

    GiveawaysModule,

    NewsModule,

    UploadsModule,

    NovaPoshtaModule,

    ExchangeRateModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: HttpOnlyThrottlerGuard },
  ],
})
export class AppModule {}
