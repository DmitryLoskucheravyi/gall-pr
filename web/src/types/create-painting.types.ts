export type CreatePaintingDto = {
  title: string;

  subtitle?: string;

  cardImage: string;

  images: string[];

  // Empty array clears the interior section; otherwise 2..6.
  interiorImages?: string[];

  animation3dImage?: string;

  price: number;

  isFeatured?: boolean;

  techniqueId?: number;

  materialId?: number;

  width?: number;

  height?: number;

  year?: number;
  weight?: number;

  description: string;
};
