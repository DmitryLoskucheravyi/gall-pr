export type FaqItem = {
  title: string;
  titleEn?: string;
  text: string;
  textEn?: string;
  order: number;
};

export type FaqMap = Record<string, FaqItem>;

export type FaqEntry = FaqItem & { id: string };
