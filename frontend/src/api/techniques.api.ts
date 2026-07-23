import { api } from './index';

import { Technique } from '../types/dictionaries.types';

class TechniquesService {
  async getTechniques(): Promise<Technique[]> {
    const response = await api.get('/techniques');
    return response.data;
  }

  async createTechnique(name: string): Promise<Technique> {
    const response = await api.post('/techniques', { name });
    return response.data;
  }

  async updateTechnique(id: number, name: string): Promise<Technique> {
    const response = await api.patch(`/techniques/${id}`, { name });
    return response.data;
  }

  async deleteTechnique(id: number) {
    const response = await api.delete(`/techniques/${id}`);
    return response.data;
  }
}

export const techniquesService = new TechniquesService();
