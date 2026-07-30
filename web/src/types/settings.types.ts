export type AppSettings = {
  id: number;
  authorName: string;
  cardTransferIban: string;
  updatedAt: string;
};

export type UpdateSettingsDto = {
  authorName: string;
  cardTransferIban: string;
};
