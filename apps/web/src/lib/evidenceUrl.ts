const STORAGE_MARKER = "/storage/v1/object/public/task-evidence/";

/** Path inside bucket, e.g. "2/1712345678.jpg" */
export function evidenceStoragePath(photoUrl: string): string | null {
  const index = photoUrl.indexOf(STORAGE_MARKER);
  if (index === -1) return null;
  return decodeURIComponent(photoUrl.slice(index + STORAGE_MARKER.length));
}

export function evidenceUrlsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const pathA = evidenceStoragePath(a);
  const pathB = evidenceStoragePath(b);
  if (pathA && pathB) return pathA === pathB;
  try {
    return new URL(a).href === new URL(b).href;
  } catch {
    return false;
  }
}
