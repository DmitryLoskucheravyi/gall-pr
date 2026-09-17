import { api } from './client';
import type { Technique } from '../types/dictionaries.types';

type TechniqueInput = { name: string; nameEn?: string };

class TechniquesService {
  async getTechniques(): Promise<Technique[]> {
    const response = await api.get('/techniques');
    return response.data;
  }

  async createTechnique(input: TechniqueInput): Promise<Technique> {
    const response = await api.post('/techniques', input);
    return response.data;
  }

  async updateTechnique(id: number, input: TechniqueInput): Promise<Technique> {
    const response = await api.patch(`/techniques/${id}`, input);
    return response.data;
  }

  async deleteTechnique(id: number) {
    const response = await api.delete(`/techniques/${id}`);
    return response.data;
  }
}

export const techniquesService = new TechniquesService();
