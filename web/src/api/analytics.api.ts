import { api } from './client';
import type { AnalyticsOverview, AnalyticsPeriod } from '../types/analytics.types';

class AnalyticsService {
  // Admin-only: everything the dashboard draws for one period.
  async getOverview(days: AnalyticsPeriod): Promise<AnalyticsOverview> {
    const response = await api.get('/analytics/overview', { params: { days } });
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
