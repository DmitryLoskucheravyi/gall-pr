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
  adminTelegramChatId: string;
};
