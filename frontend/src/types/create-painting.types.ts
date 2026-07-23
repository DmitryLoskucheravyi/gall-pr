export type CreatePaintingDto = {
  title: string;

  subtitle?: string;

  cardImage: string;

  images: string[];

  price: number;

  discount?: number;

  isFeatured?: boolean;

  author?: string;

  techniqueId?: number;

  materialId?: number;

  width?: number;

  height?: number;

  year?: number;

  description: string;
};
