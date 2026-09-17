import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Material } from '../../materials/entities/material.entity';
import { Series } from '../../series/entities/series.entity';
import { Technique } from '../../techniques/entities/technique.entity';

@Entity('paintings')
export class Painting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  title: string;

  // English counterpart of `title`/`subtitle`/`description` below — set by
  // the admin, optional. The frontend falls back to the Ukrainian value
  // wherever one of these is empty, so a row nobody has translated yet never
  // renders blank on the English site.
  @Column({ name: 'title_en', type: 'varchar', nullable: true })
  titleEn: string | null;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ name: 'subtitle_en', type: 'varchar', nullable: true })
  subtitleEn: string | null;

  @Column({ name: 'card_image' })
  cardImage: string;

  @Column('simple-json')
  images: string[];

  // Whether the artist will paint this one again to order.
  //
  // False — the default — means the work is one of a kind: when it's sold,
  // it's gone. True means a sold-out work can still be commissioned as a
  // repeat, which is a different transaction entirely (nothing in stock, no
  // cart, price and timing agreed with the customer), so it gets its own
  // route rather than pretending to be a purchase.
  @Column({ name: 'is_repeatable', default: false })
  isRepeatable: boolean;

  // Photographs of this work hanging in a room, set by the admin when the
  // painting is created or edited. Not a self-service preview the visitor
  // composes — these are chosen shots, so the room, the light and the scale
  // are all deliberate.
  //
  // Null or empty means the painting simply has no interior section. Two is
  // the minimum worth showing as a sequence, and six is where a carousel
  // stops being something anyone waits through; both are enforced on the way
  // in, in PaintingsService.
  @Column({ name: 'interior_images', type: 'simple-json', nullable: true })
  interiorImages: string[] | null;

  // Reserved for a future 3D-animation feature; intentionally not exposed
  // anywhere in the public UI yet, just persisted as the admin sets it.
  @Column({
    name: 'animation_3d_image',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  animation3dImage: string | null;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ default: 1 })
  amount: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'technique_id', nullable: true })
  techniqueId: number | null;

  @ManyToOne(() => Technique, { nullable: true, eager: true })
  @JoinColumn({ name: 'technique_id' })
  technique: Technique | null;

  @Column({ name: 'material_id', nullable: true })
  materialId: number | null;

  @ManyToOne(() => Material, { nullable: true, eager: true })
  @JoinColumn({ name: 'material_id' })
  material: Material | null;

  // The "many" side of the series relation — one series holds many paintings,
  // so the foreign key lives here. Nullable: a work that belongs to no series
  // is the ordinary case.
  //
  // Eager, like technique and material: the painting page and every card name
  // the series it came from, so loading it separately would be a query per
  // card. The inverse side (Series.paintings) is deliberately lazy.
  @Column({ name: 'series_id', type: 'int', nullable: true })
  seriesId: number | null;

  @ManyToOne(() => Series, (series) => series.paintings, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'series_id' })
  series: Series | null;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ nullable: true })
  year: number;

  // Kilograms, used for Nova Poshta shipping price calculation. Nullable
  // for paintings created before this field existed.
  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  weight: number | null;

  @Column('text')
  description: string;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
