/**
 * Resolves static media and file URLs (photos, PDFs) across dev and production.
 */
export function getMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase}${cleanPath}`;
}
