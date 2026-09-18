import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en_admin from './locales/en/admin.json';
import en_auth from './locales/en/auth.json';
import en_bottomNav from './locales/en/bottomNav.json';
import en_cart from './locales/en/cart.json';
import en_catalog from './locales/en/catalog.json';
import en_common from './locales/en/common.json';
import en_faq from './locales/en/faq.json';
import en_favorites from './locales/en/favorites.json';
import en_footer from './locales/en/footer.json';
import en_gallery from './locales/en/gallery.json';
import en_giveaway from './locales/en/giveaway.json';
import en_header from './locales/en/header.json';
import en_home from './locales/en/home.json';
import en_orders from './locales/en/orders.json';
import en_painting from './locales/en/painting.json';
import en_profile from './locales/en/profile.json';
import en_support from './locales/en/support.json';

import ua_admin from './locales/ua/admin.json';
import ua_auth from './locales/ua/auth.json';
import ua_bottomNav from './locales/ua/bottomNav.json';
import ua_cart from './locales/ua/cart.json';
import ua_catalog from './locales/ua/catalog.json';
import ua_common from './locales/ua/common.json';
import ua_faq from './locales/ua/faq.json';
import ua_favorites from './locales/ua/favorites.json';
import ua_footer from './locales/ua/footer.json';
import ua_gallery from './locales/ua/gallery.json';
import ua_giveaway from './locales/ua/giveaway.json';
import ua_header from './locales/ua/header.json';
import ua_home from './locales/ua/home.json';
import ua_orders from './locales/ua/orders.json';
import ua_painting from './locales/ua/painting.json';
import ua_profile from './locales/ua/profile.json';
import ua_support from './locales/ua/support.json';

// One JSON file per area of the site, per language — src/locales/<lng>/
// <namespace>.json. Vite picked these up with import.meta.glob; Next has no
// equivalent, so the list is explicit. Adding a namespace means adding two
// files and two lines here.
const resources = {
  en: {
    admin: en_admin,
    auth: en_auth,
    bottomNav: en_bottomNav,
    cart: en_cart,
    catalog: en_catalog,
    common: en_common,
    faq: en_faq,
    favorites: en_favorites,
    footer: en_footer,
    gallery: en_gallery,
    giveaway: en_giveaway,
    header: en_header,
    home: en_home,
    orders: en_orders,
    painting: en_painting,
    profile: en_profile,
    support: en_support,
  },
  ua: {
    admin: ua_admin,
    auth: ua_auth,
    bottomNav: ua_bottomNav,
    cart: ua_cart,
    catalog: ua_catalog,
    common: ua_common,
    faq: ua_faq,
    favorites: ua_favorites,
    footer: ua_footer,
    gallery: ua_gallery,
    giveaway: ua_giveaway,
    header: ua_header,
    home: ua_home,
    orders: ua_orders,
    painting: ua_painting,
    profile: ua_profile,
    support: ua_support,
  },
} as const;

export const NAMESPACES = [
  'admin',
  'auth',
  'bottomNav',
  'cart',
  'catalog',
  'common',
  'faq',
  'favorites',
  'footer',
  'gallery',
  'giveaway',
  'header',
  'home',
  'orders',
  'painting',
  'profile',
  'support',
];

// Initialised once. The URL is the only place the language lives, so there
// is no browser-language detection and nothing cached: the locale segment of
// the path decides, and I18nProvider keeps i18next in step with it.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'ua',
    fallbackLng: 'ua',
    ns: NAMESPACES,
    defaultNS: 'common',
    interpolation: {
      // React already escapes everything it renders.
      escapeValue: false,
    },
    // Server and client must produce identical markup, or hydration warns
    // and React throws the server pass away.
    react: { useSuspense: false },
  });
}

export default i18n;
