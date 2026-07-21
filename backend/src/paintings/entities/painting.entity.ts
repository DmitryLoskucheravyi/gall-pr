import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('paintings')
export class Painting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ name: 'card_image' })
  cardImage: string;

  @Column('simple-json')
  images: string[];

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  discount: number;

  @Column({ default: 1 })
  amount: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  technique: string;

  @Column({ nullable: true })
  material: string;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ nullable: true })
  year: number;

  @Column('text')
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
