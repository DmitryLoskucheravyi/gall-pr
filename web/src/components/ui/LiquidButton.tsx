import { useRef, type ButtonHTMLAttributes } from 'react';

import { useLiquidButton } from '../../hooks/useLiquidButton';
import styles from './LiquidButton.module.scss';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function LiquidButton({ children, className, ...rest }: Props) {
  const containerRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLiquidButton(containerRef, canvasRef);

  return (
    <button
      {...rest}
      ref={containerRef}
      className={`${styles.liquidButton} ${className ?? ''}`}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <span className={styles.inner}>{children}</span>
    </button>
  );
}
