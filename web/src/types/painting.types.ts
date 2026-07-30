import type { Material, Technique } from './dictionaries.types';

export type Painting = {
  id: number;

  title: string;
  subtitle: string | null;

  cardImage: string;
  images: string[];
  animation3dImage: string | null;

  price: string;

  amount: number;

  isAvailable: boolean;
  isFeatured: boolean;
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
