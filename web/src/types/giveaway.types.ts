import type { Painting } from './painting.types';

export type Giveaway = {
  id: number;
  title: string;
  description: string;
  conditions: string | null;
  painting: Painting;
  deadline: string;
  isActive: boolean;
  participantsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateGiveawayDto = {
  title: string;
  description: string;
  conditions?: string;
  paintingId: number;
  deadline: string;
};
