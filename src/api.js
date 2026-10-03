// Thin wrapper around testmail.app's JSON API.
// Docs: https://testmail.app/docs/
// Calls go through Vite's dev/preview proxy at /tm-api so the browser never
// talks to api.testmail.app directly (sidesteps CORS, keeps the key off the
// public internet's radar in network logs).

const BASE = '/tm-api/json';

export class TestmailError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'TestmailError';
    this.details = details;
  }
}

/**
 * Fetch emails from a namespace.
 * @param {object} opts
 * @param {string} opts.apikey
 * @param {string} opts.namespace
 * @param {string} [opts.tag] - filter to a single tag
 * @param {string} [opts.tag_prefix]
 * @param {number} [opts.limit]
 * @param {number} [opts.offset]
 */
export async function fetchEmails({
  apikey,
  namespace,
  tag,
  tag_prefix,
  limit = 30,
  offset = 0,
  signal,
}) {
  if (!apikey || !namespace) {
    throw new TestmailError('API key and namespace are required.');
  }

  const params = new URLSearchParams({
    apikey,
    namespace,
    limit: String(limit),
    offset: String(offset),
    pretty: 'false',
  });
  if (tag) params.set('tag', tag);
  if (tag_prefix) params.set('tag_prefix', tag_prefix);

  let res;
  try {
    res = await fetch(`${BASE}?${params.toString()}`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new TestmailError(
      'Could not reach testmail.app. Check your connection and that the Vite dev server is running.'
    );
  }

  // Read as text first (not res.json()) so a non-JSON error page — e.g. the
  // proxy's own failure response, or a rare HTML error page from an
  // intermediary — can still be surfaced instead of collapsing into a vague
  // "unexpected response" message.
  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 200);
    throw new TestmailError(
      `Got a non-JSON response (HTTP ${res.status} ${res.statusText || ''}).` +
        (snippet ? ` Response started with: "${snippet}"` : ' The response body was empty.')
    );
  }

  if (!res.ok || data.result === 'fail') {
    throw new TestmailError(
      data.message || `Request failed (HTTP ${res.status}).`,
      data
    );
  }

  return data;
}
