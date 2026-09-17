import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Painting } from '../../paintings/entities/painting.entity';

// A named grouping of works — a series the artist painted as one body of work.
//
// One series holds many paintings and a painting belongs to at most one, so
// the foreign key lives on `paintings.series_id` (that is what a 1:N relation
// is: the "many" side carries the key). Nullable on purpose — a work that
// belongs to no series is the ordinary case, not an error.
//
// "Series" is its own plural, so the table, the route and the class all read
// the same in both numbers. Arrays of them are named for what they hold
// (`allSeries`, `rows`) rather than pluralised again.
@Entity('series')
export class Series {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ name: 'name_en', type: 'varchar', length: 255, nullable: true })
  nameEn: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  // One picture to stand for the series wherever it is listed. Optional: a
  // series is usable the moment it has a name.
  @Column({ name: 'cover_image', type: 'varchar', length: 500, nullable: true })
  coverImage: string | null;

  // The artist's own ordering, which is rarely alphabetical. Ties break by id
  // so the list never reshuffles between requests.
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  // Hidden series stay in the admin but never reach the storefront —
  // somewhere to assemble a body of work before it is announced.
  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished: boolean;

  // Not eager: the admin list wants counts, not every painting of every
  // series, and the storefront loads a series' works through the ordinary
  // catalogue query.
  @OneToMany(() => Painting, (painting) => painting.series)
  paintings: Painting[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
