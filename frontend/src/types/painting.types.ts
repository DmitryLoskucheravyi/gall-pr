export type Painting = {
  id: number;

  title: string;
  subtitle: string | null;

  cardImage: string;
  images: string[];

  price: string;

  discount: number;

  amount: number;

  isAvailable: boolean;
  isFeatured: boolean;

  author: string | null;
  technique: string | null;
  material: string | null;

  width: number | null;
  height: number | null;

  year: number | null;

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
