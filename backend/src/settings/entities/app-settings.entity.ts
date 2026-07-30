import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
