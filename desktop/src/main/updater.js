'use strict';

// "새 버전이 나왔어요": looks at the GitHub releases of this repository for a newer
// `desktop-v*` tag. Any failure (offline, private repo, rate limit) just means "no update".

function parseVersion(v) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(String(v || ''));
  return m ? m.slice(1, 4).map(Number) : null;
}

function isNewer(candidate, current) {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}

/**
 * @param {string} current running version
 * @param {string} api releases list endpoint
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{version: string, url: string, notes: string} | null>}
 */
async function checkForUpdate(current, api, fetchImpl) {
  const res = await fetchImpl(api, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) return null;
  const releases = await res.json();
  if (!Array.isArray(releases)) return null;
  let best = null;
  for (const r of releases) {
    if (r.draft || r.prerelease || !/^desktop-v/.test(r.tag_name || '')) continue;
    const version = r.tag_name.replace(/^desktop-v/, '');
    if (isNewer(version, current) && (!best || isNewer(version, best.version))) {
      best = { version, url: r.html_url, notes: String(r.body || '').slice(0, 500) };
    }
  }
  return best;
}

module.exports = { checkForUpdate, isNewer, parseVersion };
