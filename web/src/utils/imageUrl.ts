// Paintings are uploaded to Cloudinary at full camera resolution and the API
// hands back the untouched delivery URL — around 3.4 MB for a typical work.
// Cloudinary resizes and re-encodes on the fly when the transformation is
// spliced into the path, which brings the same photo down to roughly 270 KB
// at 1400px wide. Nothing about the stored original changes; this only picks
// a derived version.
//
//   .../image/upload/v123/gallery/abc.jpg
//   .../image/upload/f_auto,q_auto,w_1400/v123/gallery/abc.jpg
//
// f_auto serves AVIF or WebP to browsers that accept them and falls back to
// JPEG elsewhere; q_auto picks a quality per image rather than a fixed one.
const CLOUDINARY_UPLOAD_MARKER = '/image/upload/';

export function cdnImage(url: string, width: number): string {
  if (!url) return url;

  const marker = url.indexOf(CLOUDINARY_UPLOAD_MARKER);
  // Anything not served from Cloudinary — a local asset, a full URL from
  // somewhere else — is passed through untouched.
  if (marker === -1) return url;

  const cut = marker + CLOUDINARY_UPLOAD_MARKER.length;
  const rest = url.slice(cut);

  // Already transformed (the admin preview builds its own URLs): leave it be
  // rather than stacking a second transformation on top.
  if (/^[a-z]{1,3}_[^/]+\//.test(rest)) return url;

  // dpr_auto covers retina without asking every caller to double its width.
  return `${url.slice(0, cut)}f_auto,q_auto,dpr_auto,w_${width}/${rest}`;
}
