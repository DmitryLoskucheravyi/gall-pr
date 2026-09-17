export type News = {
  id: number;
  title: string;
  titleEn: string | null;
  text: string;
  textEn: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNewsDto = {
  title: string;
  titleEn?: string;
  text: string;
  textEn?: string;
  imageUrl?: string;
};
