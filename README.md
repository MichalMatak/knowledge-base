# #4471 · date causes

Public S01E03 knowledge-base contribution for the two date causes found in support ticket #4471.

## Deliverables

- Source page: [`src/routes/kb/incidents/4471/causes/+page.svx`](src/routes/kb/incidents/4471/causes/+page.svx)
- Rendered page: [`rendered/kb/incidents/4471/causes/index.html`](rendered/kb/incidents/4471/causes/index.html)
- [Issue #1 — shared parser (379 reports)](https://github.com/MichalMatak/knowledge-base/issues/1)
- [Issue #2 — booking-v3 hint (33 reports)](https://github.com/MichalMatak/knowledge-base/issues/2)

The 412 unique reports divide into 379 parser reports and 33 booking-v3 hint reports. The two issue counts sum to 412.

## Public-data scope

The original export contains free-text report subjects and bodies. They are not included here. The sanitized dataset retains only report ID, calendar day, tenant handle, channel, intake tag, and merge target; it also retains only tenant handle, locale, and form metadata and the five desk-note IDs needed for the page. The page and issue summaries name the three booking-v3 tenants and show the five one-day-move IDs, as approved.

The supplied export did not include a site build configuration. The rendered HTML is a self-contained static rendering of the signed `.svx` page and the sanitized data. Regenerate it with `node scripts/render-static-page.mjs`.
