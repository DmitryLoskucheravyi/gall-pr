import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('news')
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ name: 'title_en', type: 'varchar', nullable: true })
  titleEn: string | null;

  @Column('text')
  text: string;

  @Column({ name: 'text_en', type: 'text', nullable: true })
  textEn: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  // Further photos, shown as a slider on the homepage once there are three or
  // more. Replaced as a whole list from the admin form. See
  // backend/temp/2026-10-news-gallery.sql.
  @Column({ type: 'json', nullable: true })
  gallery: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
