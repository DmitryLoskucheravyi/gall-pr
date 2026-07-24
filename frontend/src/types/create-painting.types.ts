export type CreatePaintingDto = {
  title: string;

  subtitle?: string;

  cardImage: string;

  images: string[];

  price: number;

  isFeatured?: boolean;

  techniqueId?: number;

  materialId?: number;

  width?: number;

  height?: number;

  year?: number;

  description: string;
};
