const STORAGE_MARKER = "/storage/v1/object/public/task-evidence/";
const ANSWER_FILE_SUFFIX = "/answer.txt";

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

/** Stable key for dedupe / hidden-set lookups */
export function evidenceUrlKey(url: string): string {
  return evidenceStoragePath(url) ?? url;
}

/** Text-answer file stored in the evidence bucket (not a photo). */
export function isAnswerEvidenceUrl(url: string): boolean {
  const path = evidenceStoragePath(url);
  if (path?.endsWith("answer.txt")) return true;
  return url.includes(ANSWER_FILE_SUFFIX);
}

export function dedupeEvidenceUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    const key = evidenceUrlKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(url);
  }
  return result;
}
