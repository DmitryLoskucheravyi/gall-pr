import { api } from './client';
import type {
  AdminReview,
  CreateReviewDto,
  OrderReview,
  PublicReview,
  UpdateReviewDto,
} from '../types/review.types';

class ReviewsService {
  // Published reviews, newest first — the homepage's section.
  async getPublished(): Promise<PublicReview[]> {
    const response = await api.get('/reviews');
    return response.data;
  }

  // The customer's review of their own delivered order. Sent as whoever the
  // client is — signed in, or the guest token the order was placed under.
  async create(dto: CreateReviewDto): Promise<OrderReview> {
    const response = await api.post('/reviews', dto);
    return response.data;
  }

  async getAdmin(): Promise<AdminReview[]> {
    const response = await api.get('/reviews/admin');
    return response.data;
  }

  async update(id: number, dto: UpdateReviewDto): Promise<AdminReview> {
    const response = await api.patch(`/reviews/${id}`, dto);
    return response.data;
  }

  async remove(id: number): Promise<void> {
    await api.delete(`/reviews/${id}`);
  }
}

export const reviewsService = new ReviewsService();
