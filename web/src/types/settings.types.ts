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
  // The three paintings behind the home hero. Null means "pick automatically"
  // for that slot.
  heroPaintingId1: number | null;
  heroPaintingId2: number | null;
  heroPaintingId3: number | null;
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
  heroPaintingId1: number | null;
  heroPaintingId2: number | null;
  heroPaintingId3: number | null;
};
