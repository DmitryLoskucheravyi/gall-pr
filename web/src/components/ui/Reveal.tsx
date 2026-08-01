import type { CSSProperties, ElementType, ReactNode } from 'react';

import { useInView } from '../../hooks/useInView';
import styles from './Reveal.module.scss';

type Props = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
};

// Wraps content so it rises + fades in the first time it scrolls into view.
export default function Reveal({
  children,
  className = '',
  as: Tag = 'div',
  delay = 0,
}: Props) {
  const { ref, inView } = useInView<HTMLElement>();

  const cls = [styles.reveal, inView ? styles.shown : '', className]
    .filter(Boolean)
    .join(' ');

  const style: CSSProperties | undefined = delay
    ? { transitionDelay: `${delay}ms` }
    : undefined;

  return (
    <Tag ref={ref} className={cls} style={style}>
      {children}
    </Tag>
  );
}
