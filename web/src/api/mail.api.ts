import { api } from './client';
import type { MailLetter, MailLogEntry, MailStatus } from '../types/mail.types';

class MailApiService {
  async getOutbox(status?: MailStatus): Promise<MailLogEntry[]> {
    const response = await api.get('/mail/outbox', {
      params: status ? { status } : undefined,
    });
    return response.data;
  }

  async getLetter(id: number): Promise<MailLetter> {
    const response = await api.get(`/mail/outbox/${id}`);
    return response.data;
  }

  async retry(id: number): Promise<MailLetter> {
    const response = await api.post(`/mail/outbox/${id}/retry`);
    return response.data;
  }

  async clearSettled(): Promise<{ removed: number }> {
    const response = await api.delete('/mail/outbox/settled');
    return response.data;
  }
}

export const mailService = new MailApiService();
