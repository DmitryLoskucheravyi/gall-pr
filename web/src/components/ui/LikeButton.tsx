import { useNavigate } from 'react-router-dom';

import { useIsLiked } from '../../hooks/queries/useLikedIds';
import { useLikeMutation } from '../../hooks/mutations/useLikeMutation';
import { useAppSelector } from '../../store/hooks';
import styles from './LikeButton.module.scss';

type Props = {
  paintingId: number;
  likesCount: number;
  variant?: 'overlay' | 'inline';
  showCount?: boolean;
  hoverReveal?: boolean;
};

export default function LikeButton({
  paintingId,
  likesCount,
  variant = 'inline',
  showCount = true,
  hoverReveal = false,
}: Props) {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const isLiked = useIsLiked(paintingId);
  const likeMutation = useLikeMutation();

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    if (likeMutation.isPending) return;

    likeMutation.mutate(paintingId);
  };

  const heart = (
    <svg
      viewBox="0 0 24 24"
      fill={isLiked ? 'currentColor' : 'none'}
      className={styles.icon}
    >
      <path
        d="M12 20.25c-.19 0-.38-.05-.55-.16-.66-.42-1.62-1.04-2.67-1.83C5.02 15.6 2.25 12.7 2.25 9.15 2.25 6.3 4.53 4 7.35 4c1.85 0 3.47.98 4.65 2.53C13.18 4.98 14.8 4 16.65 4c2.82 0 5.1 2.3 5.1 5.15 0 3.55-2.77 6.45-6.53 9.11-1.05.79-2.01 1.41-2.67 1.83-.17.11-.36.16-.55.16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={isLiked ? 'Прибрати лайк' : 'Лайкнути'}
        className={`${styles.overlay} ${isLiked ? styles.liked : ''} ${
          hoverReveal ? styles.hoverReveal : ''
        }`}
      >
        {heart}
        {showCount && <span className={styles.overlayCount}>{likesCount}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isLiked ? 'Прибрати лайк' : 'Лайкнути'}
      className={`${styles.button} ${isLiked ? styles.liked : ''}`}
    >
      {heart}
      {showCount && <span className={styles.count}>{likesCount}</span>}
    </button>
  );
}
