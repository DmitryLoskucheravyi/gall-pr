import type { Painting } from './painting.types';

export type Giveaway = {
  id: number;
  title: string;
  titleEn: string | null;
  description: string;
  descriptionEn: string | null;
  conditions: string | null;
  conditionsEn: string | null;
  painting: Painting;
  deadline: string;
  isActive: boolean;
  participantsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateGiveawayDto = {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  conditions?: string;
  conditionsEn?: string;
  paintingId: number;
  deadline: string;
};
