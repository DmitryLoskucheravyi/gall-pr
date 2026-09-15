import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Painting } from '../../paintings/entities/painting.entity';

@Entity('giveaways')
export class Giveaway {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ name: 'title_en', type: 'varchar', nullable: true })
  titleEn: string | null;

  @Column('text')
  description: string;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({ type: 'text', nullable: true })
  conditions: string | null;

  @Column({ name: 'conditions_en', type: 'text', nullable: true })
  conditionsEn: string | null;

  @Column({ name: 'painting_id' })
  paintingId: number;

  @ManyToOne(() => Painting, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'painting_id' })
  painting: Painting;

  @Column({ type: 'datetime' })
  deadline: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
