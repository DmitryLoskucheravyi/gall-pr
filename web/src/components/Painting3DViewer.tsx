import { useEffect, useRef, useState } from 'react';

import styles from './Painting3DViewer.module.scss';

type Rotation = { x: number; y: number };

const MAX_TILT = 20;
const DEFAULT_ASPECT = 4 / 5;

function clamp(value: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, value));
}

export default function Painting3DViewer({
  imageUrl,
}: {
  imageUrl: string;
}) {
  const [rotation, setRotation] = useState<Rotation>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startRotation: Rotation;
  } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const handlePointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    setDragging(true);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
    };
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    setRotation({
      y: drag.startRotation.y + dx * 0.4,
      x: clamp(drag.startRotation.x - dy * 0.4, -MAX_TILT, MAX_TILT),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const handleReset = () => setRotation({ x: 0, y: 0 });

  const normalizedY = ((rotation.y % 360) + 360) % 360;
  const shadowAngleX = Math.sin((rotation.y * Math.PI) / 180);
  const shadowAngleY = Math.sin((rotation.x * Math.PI) / 180);
  const shadowSquash = 1 - Math.min(0.55, Math.abs(shadowAngleX) * 0.55);

  return (
    <div className={styles.stage}>
      <div
        className={styles.card}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleReset}
        style={{
          aspectRatio: `${aspectRatio}`,
          transform: `rotateX(${rotation.x}deg) rotateY(${normalizedY}deg)`,
          transition: dragging ? 'none' : 'transform 0.4s ease-out',
        }}
      >
        <div className={styles.face}>
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className={styles.image}
          />
        </div>

        <div className={styles.faceBack}>
          <div className={styles.frame}>
            <div className={styles.canvasBack}>
              <span className={styles.strutH} />
              <span className={styles.strutV} />
            </div>
          </div>
        </div>
      </div>

      <div
        className={styles.shadow}
        style={{
          transform: `translateX(${shadowAngleX * 28}px) scaleX(${shadowSquash})`,
          opacity: 0.45 - Math.abs(shadowAngleY) * 0.15,
          transition: dragging ? 'none' : 'transform 0.4s ease-out',
        }}
      />

      <p className={styles.hint}>Перетягніть, щоб покрутити</p>
    </div>
  );
}
