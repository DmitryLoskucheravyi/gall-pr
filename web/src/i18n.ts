import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// One JSON file per area of the site, per language — web/src/locales/<lng>/
// <namespace>.json — picked up automatically so adding a namespace is just
// adding the two files, nothing to register by hand here. `eager: true`
// because these are small and the app needs its own UI text before first
// paint, not on a later chunk.
const modules = import.meta.glob<{ default: Record<string, unknown> }>(
  './locales/*/*.json',
  { eager: true },
);

const resources: Record<string, Record<string, Record<string, unknown>>> = {};
const namespaces = new Set<string>();

for (const [path, mod] of Object.entries(modules)) {
  const match = /\.\/locales\/([^/]+)\/([^/]+)\.json$/.exec(path);
  if (!match) continue;
  const [, lng, ns] = match;
  (resources[lng] ??= {})[ns] = mod.default;
  namespaces.add(ns);
}

void i18n.use(initReactI18next).init({
  resources,
  lng: 'ua',
  fallbackLng: 'ua',
  ns: Array.from(namespaces),
  defaultNS: 'common',
  interpolation: {
    // React already escapes everything it renders.
    escapeValue: false,
  },
  // The URL is the only place the language lives (see LocaleLayout) — no
  // browser-language detection, no caching a guess.
  detection: undefined,
});

export default i18n;
