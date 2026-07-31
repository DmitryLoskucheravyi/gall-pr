import { useState } from 'react';

import type { FaqEntry } from '../../types/faq.types';
import styles from './FaqAccordion.module.scss';

type Props = {
  items: FaqEntry[];
};

export default function FaqAccordion({ items }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className={styles.empty}>Питань поки немає</p>;
  }

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const isOpen = item.id === openId;

        return (
          <div key={item.id} className={styles.item}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className={styles.header}
            >
              <span className={styles.title}>{item.title}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
              >
                <path
                  d="m6 9 6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isOpen && <p className={styles.text}>{item.text}</p>}
          </div>
        );
      })}
    </div>
  );
}
