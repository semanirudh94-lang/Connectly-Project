const TAG_CHARS = /^[\p{L}\p{N}_]+$/u;

// Pulls #tags out of caption text.
export function extractHashtags(caption = "") {
  const found = String(caption).matchAll(/(?:^|\s)#([\p{L}\p{N}_]{1,30})/gu);
  return [...found].map((m) => m[1]);
}

// Accepts an array of tags or one comma/space separated string, strips leading
// '#', lowercases, dedupes and caps the list. Invalid tokens are dropped.
export function normalizeHashtags(input) {
  const raw = Array.isArray(input)
    ? input
    : String(input ?? "")
        .split(/[\s,]+/)
        .filter(Boolean);

  const cleaned = raw
    .map((t) => String(t).trim().replace(/^#+/, "").toLowerCase())
    .filter((t) => t.length > 0 && t.length <= 30 && TAG_CHARS.test(t));

  return [...new Set(cleaned)].slice(0, 30);
}

// Explicit tags win; otherwise the tags typed inside the caption are used, so a
// post always carries a queryable hashtag list.
export function resolveHashtags({ hashtags, caption }) {
  const explicit = normalizeHashtags(hashtags);
  if (explicit.length > 0) return explicit;
  return normalizeHashtags(extractHashtags(caption));
}
