'use client';

import { useTranslation } from 'react-i18next';

import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import styles from './ShareButton.module.scss';

// Copies a link to the clipboard and says so in a toast. The link is what is
// being shared — the current page unless the caller names another — so the
// button can sit beside the like on a painting, or anywhere else, unchanged.

type Props = {
  /** Absolute or site-relative; defaults to the page it is on. */
  url?: string;
  className?: string;
};

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Safari, or a page not served over HTTPS: the textarea fallback.
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ShareButton({ url, className }: Props) {
  const { t } = useTranslation('common');

  const share = async () => {
    const href = new URL(url ?? window.location.pathname, window.location.origin).toString();
    const ok = await copy(href);
    store.dispatch(
      showToast(
        ok
          ? { message: t('share.copied') }
          : { message: t('share.failed'), variant: 'error' },
      ),
    );
  };

  return (
    <button
      type="button"
      className={`${styles.button} ${className ?? ''}`}
      onClick={share}
      aria-label={t('share.label')}
      title={t('share.label')}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* An arrow leaving a tray: the share mark every phone uses. */}
        <path d="M12 14.6V3.8M8.2 7.4 12 3.6l3.8 3.8" />
        <path d="M8.4 10.4H6.6c-.9 0-1.6.7-1.6 1.6v7c0 .9.7 1.6 1.6 1.6h10.8c.9 0 1.6-.7 1.6-1.6v-7c0-.9-.7-1.6-1.6-1.6h-1.8" />
      </svg>
    </button>
  );
}
