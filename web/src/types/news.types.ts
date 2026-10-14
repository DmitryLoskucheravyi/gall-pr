export type News = {
  id: number;
  title: string;
  titleEn: string | null;
  text: string;
  textEn: string | null;
  imageUrl: string | null;
  /** Further photos; the homepage shows them as a slider from three up. */
  gallery: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNewsDto = {
  title: string;
  titleEn?: string;
  text: string;
  textEn?: string;
  imageUrl?: string;
  gallery?: string[];
};
