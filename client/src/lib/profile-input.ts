export function extractHandle(value: string) {
  const trimmed = value.trim().replace(/^@/, "");
  const githubUrl = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)/i);
  return (githubUrl?.[1] ?? trimmed).replace(/\/$/, "");
}

export function isValidGitHubHandle(value: string) {
  return /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value);
}

export function safeUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return "";
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}
