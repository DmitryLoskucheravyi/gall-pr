// Shared bits for the Cloudflare Pages Functions that make this SPA legible to
// crawlers.
//
// The problem these solve: the app sets its <title> and description from
// JavaScript (see usePageMeta), which Googlebot eventually runs — but the
// preview bots of Telegram, Instagram, Facebook, Viber and X do not run
// JavaScript at all. They read the raw HTML and nothing else. So every painting
// link shared in a messenger showed the generic gallery card instead of the
// work, which for a shop that sells through those channels is a broken sales
// channel rather than an SEO nicety.
//
// A function here fetches the painting from the API, rewrites the tags in the
// static index.html, and serves that. The app still boots and re-renders
// exactly as before; this only changes what a bot sees before any of that.

export const LOCALES = ['ua', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

// Where the site itself lives, used for canonical and og:url. Taken from the
// request rather than hard-coded so previews work on a preview deployment too.
export function siteOrigin(request: Request): string {
  return new URL(request.url).origin;
}

// The API this is reading from. A Pages environment variable, because a Vite
// `VITE_*` value is baked into the bundle at build time and a Function runs on
// the server where that never existed.
export function apiBase(env: { API_URL?: string }): string | null {
  return env.API_URL ? env.API_URL.replace(/\/$/, '') : null;
}

// Anything interpolated into an attribute or a text node. The values come from
// the database — a painting's title is whatever the admin typed — so they are
// never trusted to be markup-safe.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// JSON embedded in a <script> block is parsed as HTML first, so "</script>"
// inside any value would end the block early. Same reasoning as the app's own
// safeJsonLd.
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

// Descriptions come from prose written for the page, not for a search result,
// so they get cut to something a listing will actually show.
export function clip(text: string, limit = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();

  if (flat.length <= limit) return flat;

  // Cut on a word boundary rather than mid-syllable.
  const cut = flat.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');

  return `${lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

// Cloudinary serves the catalogue images. Social cards want something closer
// to 1200×630 than to a full-resolution photograph, and a transform is a URL
// segment rather than a separate upload.
export function socialImage(url: string | null | undefined): string | null {
  if (!url) return null;

  const marker = '/image/upload/';
  const at = url.indexOf(marker);

  if (at === -1) return url;

  return `${url.slice(0, at + marker.length)}c_fill,g_auto,w_1200,h_630,f_jpg,q_auto/${url.slice(at + marker.length)}`;
}

export type MetaTags = {
  title: string;
  description: string;
  canonical: string;
  image: string | null;
  imageAlt?: string;
  ogType: 'website' | 'article' | 'product';
  locale: Locale;
  // The same page in the other language, for hreflang.
  alternates: { locale: Locale; url: string }[];
  // Rendered into its own <script type="application/ld+json"> block.
  jsonLd?: unknown;
};

const OG_LOCALE: Record<Locale, string> = { ua: 'uk_UA', en: 'en_US' };

// Rewrites the tags in the shipped index.html.
//
// Plain string replacement rather than HTMLRewriter: the template is ours, its
// shape is known, and this keeps the Function free of Cloudflare-specific
// globals — which in turn means it can be type-checked and reasoned about
// without pulling in a whole runtime's type package.
export function injectMeta(html: string, meta: MetaTags): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(meta.canonical);
  const image = meta.image ? escapeHtml(meta.image) : null;

  let out = html;

  const setMeta = (attr: 'property' | 'name', key: string, value: string) => {
    // Matches the tag however its attributes are ordered, and only rewrites the
    // content — so a tag that isn't in the template is left alone rather than
    // silently invented.
    const pattern = new RegExp(
      `(<meta\\s+[^>]*${attr}="${key}"[^>]*content=")[^"]*(")`,
      'i',
    );

    if (pattern.test(out)) {
      out = out.replace(pattern, `$1${value}$2`);
    }
  };

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:type', meta.ogType);
  setMeta('property', 'og:locale', OG_LOCALE[meta.locale]);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);

  if (image) {
    setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:image', image);

    if (meta.imageAlt) {
      setMeta('property', 'og:image:alt', escapeHtml(meta.imageAlt));
    }
  }

  // The template carries a single canonical for the home page; a per-page one
  // replaces it outright.
  const canonicalTag = `<link rel="canonical" href="${canonical}" />`;
  out = /<link\s+rel="canonical"[^>]*>/i.test(out)
    ? out.replace(/<link\s+rel="canonical"[^>]*>/i, canonicalTag)
    : out.replace('</head>', `    ${canonicalTag}\n  </head>`);

  // hreflang. Two languages served on distinct paths with no link between them
  // is how the same work ends up competing with itself in two languages.
  const alternates = meta.alternates
    .map(
      (alt) =>
        `<link rel="alternate" hreflang="${alt.locale === 'ua' ? 'uk' : 'en'}" href="${escapeHtml(alt.url)}" />`,
    )
    .concat(
      // x-default points at the Ukrainian version: this is a Ukrainian gallery
      // and that is the sensible landing for an unmatched language.
      meta.alternates
        .filter((alt) => alt.locale === 'ua')
        .map(
          (alt) =>
            `<link rel="alternate" hreflang="x-default" href="${escapeHtml(alt.url)}" />`,
        ),
    )
    .join('\n    ');

  if (alternates) {
    out = out.replace('</head>', `    ${alternates}\n  </head>`);
  }

  if (meta.jsonLd) {
    out = out.replace(
      '</head>',
      `    <script type="application/ld+json">${safeJsonLd(meta.jsonLd)}</script>\n  </head>`,
    );
  }

  return out;
}

// One place that decides how long the CDN may hold a rendered shell.
//
// The browser is told not to cache at all, so a visitor always gets the live
// app; Cloudflare holds the bot-facing HTML for a few minutes, which is what
// keeps a burst of preview requests from becoming a burst of API calls.
export const SHELL_CACHE = 'public, max-age=0, s-maxage=300';

// Every failure path in these functions ends here: serve the app exactly as it
// would have been served without the Function. A bot seeing the generic card
// is the status quo; a bot seeing an error page is worse than the bug.
export function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}
