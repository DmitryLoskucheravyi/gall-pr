export type AppSettings = {
  id: number;
  authorName: string;
  cardTransferIban: string;
  novaPoshtaSenderCityRef: string;
  novaPoshtaSenderCityName: string;
  supportEmail: string;
  supportPhone: string;
  supportTelegramUrl: string;
  adminTelegramChatId: string;
  // Painting behind the home hero. Null means "pick automatically".
  heroPaintingId: number | null;
  updatedAt: string;
};

export type UpdateSettingsDto = {
  authorName: string;
  cardTransferIban: string;
  novaPoshtaSenderCityRef: string;
  novaPoshtaSenderCityName: string;
  supportEmail: string;
  supportPhone: string;
  supportTelegramUrl: string;
  heroPaintingId: number | null;
};
