import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { NovaPoshtaOption } from '../../types/novaPoshta.types';
import { useNovaPoshtaCities } from '../../hooks/queries/useNovaPoshta';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import selectStyles from './Select.module.scss';
import styles from './NovaPoshtaCityPicker.module.scss';

type Props = {
  value: NovaPoshtaOption | null;
  onChange: (city: NovaPoshtaOption | null) => void;
  placeholder?: string;
  className?: string;
};

export default function NovaPoshtaCityPicker({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const { t } = useTranslation('common');
  const resolvedPlaceholder = placeholder ?? t('cityPlaceholder');
  const [query, setQuery] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: cityOptions = [] } = useNovaPoshtaCities(debouncedQuery);

  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={resolvedPlaceholder}
        className={styles.input}
      />
      {open && cityOptions.length > 0 && (
        <ul className={selectStyles.menu}>
          {cityOptions.map((city) => (
            <li key={city.ref}>
              <button
                type="button"
                onMouseDown={() => {
                  setQuery(city.name);
                  onChange(city);
                  setOpen(false);
                }}
                className={selectStyles.option}
              >
                {city.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
