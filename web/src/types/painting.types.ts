import type { Material, Technique } from './dictionaries.types';

export type Painting = {
  id: number;

  title: string;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;

  cardImage: string;
  images: string[];
  // Photographs of the work hanging in a room, chosen by the admin. Null or
  // empty means the painting has no interior section; otherwise 2..6, which
  // the backend enforces.
  interiorImages: string[] | null;
  animation3dImage: string | null;

  price: string;

  amount: number;

  isAvailable: boolean;
  isFeatured: boolean;
  // False means one of a kind: sold is gone. True means a sold-out work can
  // still be commissioned as a repeat.
  isRepeatable: boolean;
  likesCount: number;

  techniqueId: number | null;
  technique: Technique | null;

  materialId: number | null;
  material: Material | null;

  width: number | null;
  height: number | null;

  year: number | null;
  weight: number | null;

  description: string;
  descriptionEn: string | null;

  createdAt: string;
  updatedAt: string;
};

export type PaintingsResponse = {
  data: Painting[];

  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
