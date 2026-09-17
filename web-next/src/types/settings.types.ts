// What GET /settings returns to anyone: only the fields the storefront
// renders. The admin's Telegram chat id and its one-time link code used to
// come down this route too — see PublicSettings on the backend.
export type PublicAppSettings = {
  authorName: string;
  authorNameEn: string | null;
  cardTransferIban: string;
  supportEmail: string;
  supportPhone: string;
  supportTelegramUrl: string;
  instagramUrl: string;
  // The three paintings behind the home hero. Null means "pick automatically"
  // for that slot.
  heroPaintingId1: number | null;
  heroPaintingId2: number | null;
  heroPaintingId3: number | null;
};

// The full row, from the admin-only GET /settings/admin. Only the settings
// screen has any use for it.
export type AppSettings = PublicAppSettings & {
  id: number;
  novaPoshtaSenderCityRef: string;
  novaPoshtaSenderCityName: string;
  adminTelegramChatId: string;
  updatedAt: string;
};

export type UpdateSettingsDto = {
  authorName: string;
  authorNameEn?: string;
  cardTransferIban: string;
  novaPoshtaSenderCityRef: string;
  novaPoshtaSenderCityName: string;
  supportEmail: string;
  supportPhone: string;
  supportTelegramUrl: string;
  instagramUrl: string;
  heroPaintingId1: number | null;
  heroPaintingId2: number | null;
  heroPaintingId3: number | null;
};
