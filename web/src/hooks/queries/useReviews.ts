import { useQuery } from '@tanstack/react-query';

import { reviewsService } from '../../api/reviews.api';
import { queryKeys } from '../../lib/queryKeys';
import { useAppSelector } from '../../store/hooks';

export function usePublicReviews() {
  return useQuery({
    queryKey: queryKeys.reviews.public,
    queryFn: () => reviewsService.getPublished(),
    staleTime: 5 * 60_000,
  });
}

export function useAdminReviews() {
  return useQuery({
    queryKey: queryKeys.reviews.admin,
    queryFn: () => reviewsService.getAdmin(),
  });
}

// Reviews waiting for the admin's decision, for the badge in the admin menu.
// Shares the admin list's cache entry, so opening the page costs nothing more.
export function useAdminPendingReviewsCount(): number {
  const isAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN');

  const { data } = useQuery({
    queryKey: queryKeys.reviews.admin,
    queryFn: () => reviewsService.getAdmin(),
    enabled: isAdmin,
    staleTime: 30_000,
    select: (reviews) => reviews.filter((r) => !r.isPublished).length,
  });

  return data ?? 0;
}
