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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
