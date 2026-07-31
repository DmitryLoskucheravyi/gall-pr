export type FaqItem = {
  title: string;
  text: string;
  order: number;
};

export type FaqMap = Record<string, FaqItem>;

export type FaqEntry = FaqItem & { id: string };
