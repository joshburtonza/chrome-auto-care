export function isUsableImageUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;

  // DB values like "/src/assets/..." won't resolve in production builds.
  if (u.startsWith('/src/')) return false;

  return (
    u.startsWith('http://') ||
    u.startsWith('https://') ||
    u.startsWith('data:') ||
    u.startsWith('blob:') ||
    u.startsWith('/')
  );
}

export function resolveImageUrl(dbUrl: string | null | undefined, fallback: string | null): string | null {
  return isUsableImageUrl(dbUrl) ? (dbUrl as string) : fallback;
}
