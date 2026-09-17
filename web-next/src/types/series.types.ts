import type { Painting } from './painting.types';

// A named body of work. One series holds many paintings; a painting belongs to
// at most one, so the foreign key lives on the painting (`seriesId`).
export type Series = {
  id: number;
  name: string;
  nameEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  coverImage: string | null;
  sortOrder: number;
  isPublished: boolean;
  // Always the true total, even when `paintings` below is capped.
  paintingsCount: number;
  createdAt: string;
  updatedAt: string;
};

// What the catalogue's "Серії" tab renders: the series, and the row of works
// under its name. `paintings` is capped server-side — compare its length with
// `paintingsCount` to know whether anything was left out.
export type SeriesWithPaintings = Series & {
  paintings: Painting[];
};

export type SeriesInput = {
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  coverImage?: string;
  sortOrder?: number;
  isPublished?: boolean;
};
