import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

export type FaqItem = {
  title: string;
  text: string;
  order: number;
};

export type FaqMap = Record<string, FaqItem>;

@Entity('app_settings')
export class AppSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'author_name', default: '' })
  authorName: string;

  @Column({ name: 'card_transfer_iban', default: '' })
  cardTransferIban: string;

  @Column({ name: 'nova_poshta_sender_city_ref', default: '' })
  novaPoshtaSenderCityRef: string;

  @Column({ name: 'nova_poshta_sender_city_name', default: '' })
  novaPoshtaSenderCityName: string;

  // Support contact channels shown alongside the live chat. Empty string = not
  // configured, so the frontend simply hides that row.
  @Column({ name: 'support_email', default: '' })
  supportEmail: string;

  @Column({ name: 'support_phone', default: '' })
  supportPhone: string;

  @Column({ name: 'support_telegram_url', default: '' })
  supportTelegramUrl: string;

  // Telegram chat id the bot sends admin notifications to (new orders, payment
  // proofs, new support messages). Obtained by messaging the bot with /start
  // and pasting back the id it replies with.
  @Column({ name: 'admin_telegram_chat_id', default: '' })
  adminTelegramChatId: string;

  // Keyed by generated id rather than a plain array — drag-and-drop reorder
  // just rewrites each item's `order`, no array splicing/reindexing.
  @Column('simple-json', { default: '{}' })
  faq: FaqMap;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
