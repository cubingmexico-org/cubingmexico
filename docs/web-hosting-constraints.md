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

## Rate limiting: Vercel Firewall rules

There is no rate limiting in application code. An in-memory limiter only counts per serverless instance, so it gives little protection on Vercel. Public and expensive endpoints are protected by **Vercel Firewall rate-limit rules** configured in the dashboard instead (Project → Firewall → Rules → New rule → Rate Limit).

Rules to keep in place (all keyed by **IP**, action **Deny / 429**):

| Project                       | Path condition                                   | Limit               | Why                                                                             |
| ----------------------------- | ------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------- |
| `web`                         | path equals `/api/search`                        | 30 requests / 10 s  | Public, unauthenticated, hits Postgres on every request                         |
| `web`                         | path starts with `/api/auth/`                    | 20 requests / 60 s  | Slows down sign-in / OAuth callback abuse                                       |
| `organizer`                   | path equals `/api/image-proxy`                   | 120 requests / 60 s | Badge and certificate exports fetch many avatars in a burst; keep this generous |
| `web`, `organizer` (optional) | path starts with `/api/admin/` or `/api/designs` | 300 requests / 60 s | Backstop for authenticated endpoints                                            |

**Policy:** keep the limits in the dashboard rather than in code. The free plan has a small number of rate-limit rules; if a rule has to be dropped, keep `/api/search` and `/api/image-proxy` first.

**Tuning:** check Firewall analytics after a large competition (badge exports) and after search-heavy traffic. Raise limits that block real users before adding new rules. If you change a limit, update this table.

---

## Related free-tier choices (elsewhere)

- Prefer Server Components, `"use cache"`, and cache tags over paid observability.
- Prefer unit tests (web + organizer pure helpers) over heavy e2e on CI.
- Query failures should throw into `error.tsx` rather than returning cached empty data (see recent query-error work in `apps/web`).
