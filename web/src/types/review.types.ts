// Mirrors backend/src/reviews.

export type ReviewPainting = {
  id: number;
  title: string;
  titleEn: string | null;
  cardImage: string;
};

/** As the homepage shows it: published only. */
export type PublicReview = {
  id: number;
  rating: number;
  text: string;
  authorName: string;
  createdAt: string;
  painting: ReviewPainting | null;
};

/** As the admin sees it: every review, published or waiting. */
export type AdminReview = PublicReview & {
  orderId: number;
  isPublished: boolean;
  updatedAt: string;
};

/** As it comes back on the customer's own order. */
export type OrderReview = {
  id: number;
  rating: number;
  text: string;
  isPublished: boolean;
  createdAt: string;
};

export type CreateReviewDto = {
  orderId: number;
  rating: number;
  text: string;
};

export type UpdateReviewDto = Partial<{
  rating: number;
  text: string;
  isPublished: boolean;
}>;
