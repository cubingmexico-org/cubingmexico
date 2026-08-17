# Web hosting constraints (Vercel free tier)

Cubing México’s web app runs on the **Vercel free tier**. A few settings look like “tech debt” but are intentional. Do not “optimize” them without checking cost and crawl impact first.

Relevant code:

- Images: [`apps/web/next.config.mjs`](../apps/web/next.config.mjs) (`images.unoptimized`)
- Legacy URL redirects: same file (`redirects()`)
- Legacy URL crawl cleanup: [`apps/web/proxy.ts`](../apps/web/proxy.ts) (410 Gone)

---

## Images: `unoptimized: true`

Next.js Image Optimization on Vercel consumes **Image Optimization** quota. With many remote assets (WCA avatars, GCS / UploadThing team media), that quota was burning too fast on the free plan.

**Policy:** keep `images.unoptimized: true` so `<Image>` still handles layout/`remotePatterns`, but Vercel does not transform or cache resized variants.

**When to revisit:** after upgrading the Vercel plan, or if you self-host image resizing (e.g. UploadThing / CDN transforms) and no longer need the Vercel optimizer.

---

## Legacy routes: redirects vs 410

Old path shapes still get hit by crawlers and bookmarks. We handle them in two layers on purpose:

### Permanent redirects (`next.config.mjs`)

Known, migratable URLs get a **301** to the current route (or query-param equivalent), for example:

| Old                                       | New                                      |
| ----------------------------------------- | ---------------------------------------- |
| `/team/:id`                               | `/teams/:id`                             |
| `/records/:state` (2–3 letter code)       | `/records?state=:state`                  |
| `/rankings/a/:eventId/:rankType…`         | `/rankings/:eventId/:rankType…`          |
| `/rankings/:gender/:eventId/:rankType…`   | `/rankings/:eventId/:rankType?gender=…`  |
| `/rankings/333mbf/average` (+ `/results`) | `/rankings/333mbf/single` (+ `/results`) |

These keep share links and bookmarks working while teaching search engines the new location.

### 410 Gone (`proxy.ts`)

Matching prefixes under the proxy matcher also return **410 Gone**:

- `/records/*`
- `/team/*`
- `/rankings/a/*`

That tells crawlers those trees are gone and reduces wasted server work from obsolete crawl patterns, especially when the request does not match a clean redirect rule.

**Policy:** do not remove the redirects or the 410s “for consistency” without checking crawl logs. Prefer documenting edge cases here over flipping status codes casually.

**When to revisit:** if crawl noise dies down and redirects alone are enough, or if you want a single strategy (all 301 or all 410) after measuring SEO impact.

---

## Related free-tier choices (elsewhere)

- Prefer Server Components, `"use cache"`, and cache tags over paid observability.
- Prefer unit tests (web + organizer pure helpers) over heavy e2e on CI.
- Query failures should throw into `error.tsx` rather than returning cached empty data (see recent query-error work in `apps/web`).
