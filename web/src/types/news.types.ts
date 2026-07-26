export type News = {
  id: number;
  title: string;
  text: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateNewsDto = {
  title: string;
  text: string;
  imageUrl?: string;
};
