import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'src/lib/data');
const reports = JSON.parse(readFileSync(path.join(dataDir, 'reports-4471.json'), 'utf8'));
const notes = JSON.parse(readFileSync(path.join(dataDir, 'desk-notes.json'), 'utf8'));
const tenantDir = path.join(dataDir, 'tenants');
const tenantFiles = [
  'alder.physio.json', 'copper.studio.json', 'harbour.dental.json', 'kettle.books.json',
  'lantern.row.json', 'long.table.json', 'morrow.tax.json', 'nine.lanterns.json',
  'pale.harbour.json', 'ridge.clinic.json', 'stone.and.sons.json',
];
const tenants = new Map(tenantFiles.map((file) => {
  const tenant = JSON.parse(readFileSync(path.join(tenantDir, file), 'utf8'));
  return [tenant.handle, tenant];
}));

function dayFirst(locale) {
  const order = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(Date.UTC(2026, 0, 2, 12)))
    .map((part) => part.type);
  return order.indexOf('day') < order.indexOf('month');
}
function causeOf(report, tenant) {
  if (!tenant || !dayFirst(tenant.locale)) return 'unplaced';
  const hint = tenant.form === 'booking-v3' ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
  return report.channel === 'form' && hint.startsWith('MM') ? 'hint' : 'parser';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function deskRef(signature) {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function fnv1a(text, seed) {
    let h = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }
  const t = signature.trim();
  let bits = (BigInt(fnv1a(t, 0x811c9dc5)) << 8n) | BigInt(fnv1a(t, 0x9e3779b9) & 0xff);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out = alphabet[Number(bits & 31n)] + out;
    bits >>= 5n;
  }
  return `DR-${out.slice(0, 4)}-${out.slice(4)}`;
}

const unique = [...new Map(reports.map((report) => [report.id, report])).values()]
  .filter((report) => report.mergedInto === 4471);
const grouped = new Map();
for (const report of unique) {
  const cause = causeOf(report, tenants.get(report.tenant));
  if (!grouped.has(cause)) grouped.set(cause, []);
  grouped.get(cause).push(report);
}
const groups = [...grouped.entries()].map(([cause, rows]) => {
  const tags = {};
  for (const row of rows) tags[row.meta.intakeTag] = (tags[row.meta.intakeTag] ?? 0) + 1;
  const days = rows.map((row) => row.receivedAt.slice(0, 10)).sort();
  return {
    cause, rows, tags,
    tenantCount: new Set(rows.map((row) => row.tenant)).size,
    firstSeen: days[0], lastSeen: days.at(-1),
    mergedInto: [...new Set(rows.map((row) => row.mergedInto).filter(Boolean))],
  };
}).sort((a, b) => b.rows.length - a.rows.length);
const owner = groups.find((group) => group.mergedInto.includes(4471))?.cause ?? null;
const movedIds = notes.oneDayMove;
const movedByCause = Object.fromEntries(groups.map((group) => [
  group.cause, group.rows.filter((row) => movedIds.includes(row.id)).length,
]));
const tagText = (tags) => Object.entries(tags)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([tag, count]) => `${escapeHtml(tag)} ×${count}`).join(' · ');
const rowsHtml = groups.map((group) => {
  const wrong = group.cause !== owner;
  return `<tr${wrong ? ' class="wrong"' : ''}><td><code>${escapeHtml(group.cause)}</code></td><td>${group.rows.length}</td><td class="tags">${tagText(group.tags)}</td><td>${group.tenantCount}</td><td>${escapeHtml(group.firstSeen)} → ${escapeHtml(group.lastSeen)}</td><td>${group.cause === owner ? '#4471' : 'not this ticket — no ticket of its own'}</td></tr>`;
}).join('\n');
const notesHtml = groups.filter((group) => movedByCause[group.cause] > 0).map((group) =>
  `<p class="note">${movedByCause[group.cause]} reports read as a one-day move; filed under <code>${escapeHtml(group.cause)}</code> by tenant.</p>`
).join('\n');
const today = new Date();
const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
const reviewedUtc = Date.UTC(2026, 9, 28);
const age = Math.floor((todayUtc - reviewedUtc) / 86400000);
const stale = age > 180;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>#4471 · two date causes · support kb</title>
<style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a66;--line:#e3e0d8;--accent:#2f6f5e;--warn:#b4501f;--warn-bg:#fbeee6;--mono:ui-monospace,'Cascadia Code',Menlo,monospace}
@media(prefers-color-scheme:dark){:root{--bg:#171716;--fg:#ecebe6;--muted:#9c9a93;--line:#34332f;--accent:#6fbfa6;--warn:#f0905d;--warn-bg:#3a2418}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,sans-serif}.kb{max-width:920px;margin:0 auto;padding:2rem 16px 4rem}.crumb{font:.8rem var(--mono);text-decoration:none;color:var(--muted)}h1{margin:.25rem 0 .5rem;line-height:1.2}.meta{display:flex;flex-wrap:wrap;gap:.5rem 1rem;color:var(--muted);font-size:.85rem;margin:0}.status{border:1px solid var(--line);border-radius:99px;padding:0 .6rem}.stale{color:var(--warn);font-weight:600}.banner{background:var(--warn-bg);color:var(--warn);padding:.6rem 1rem;border-radius:6px}h2{margin-top:2rem}table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}th,td{border-bottom:1px solid var(--line);padding:.45rem .5rem;text-align:left;vertical-align:top}code{font-family:var(--mono);font-size:.88em}.tags{color:var(--muted);font-size:.85em}.note{color:var(--muted);font-size:.85em}.wrong td{background:var(--warn-bg)}.wrong td:last-child{color:var(--warn);font-weight:600}a{color:var(--accent)}.sum{font-size:1.1rem}.stamp{margin:2rem 0 0;font:.85rem var(--mono);color:var(--muted)}.stamp b{color:var(--accent);letter-spacing:.04em}footer{margin-top:3rem;color:var(--muted);font-size:.8rem;border-top:1px solid var(--line);padding-top:1rem}
@media(max-width:720px){.table-wrap{overflow-x:auto}table{min-width:700px}}
</style>
</head>
<body><div class="kb">
<header><a class="crumb" href="/kb">support desk · kb</a><h1>#4471 · two date causes</h1>
<p class="meta"><span>owner <b>support desk</b></span><span class="status">follow-up</span><span${stale ? ' class="stale"' : ''}>reviewed 2026-10-28 · ${age} days ago${stale ? ' · stale' : ''}</span></p></header>
${stale ? `<p class="banner">Nobody has re-read this page in ${age} days. Check it against the live views before you rely on it.</p>` : ''}
<main>
<p>Ticket #4471 contains reports merged by intake. This view deduplicates repeated export rows by report ID. The intake tag is a guess; the cause follows each tenant's locale and booking form.</p>
<h2>Causes in the export</h2>
<p class="sum"><strong>${unique.length}</strong> reports merged into #4471 · <strong>${groups.length}</strong> ${groups.length === 1 ? 'cause' : 'causes'}</p>
<div class="table-wrap"><table><thead><tr><th>cause</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th></th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
${notesHtml}
<h2>Shared parser: day and month flipped</h2>
<p>The shared parser reads dates month-first even when a tenant's locale writes day-first. This cause covers app, email, and booking-v2 form reports across the day-first tenants.</p>
<p><strong>GitHub follow-up:</strong> <a href="https://github.com/MichalMatak/knowledge-base/issues/1">Issue #1</a>.</p>
<h2>Booking-v3 hint conflicts with a day-first locale</h2>
<p>The booking-v3 form shows an <code>MM/DD/YYYY</code> hint for day-first tenants. Customers following that hint enter a month-first date, while the form parses it according to the tenant's day-first locale. This cause covers Alder Physio (<code>de-DE</code>), Copper Studio (<code>es-ES</code>), and Pale Harbour (<code>pt-PT</code>).</p>
<p><strong>GitHub follow-up:</strong> <a href="https://github.com/MichalMatak/knowledge-base/issues/2">Issue #2</a>.</p>
<h2>One-day moves</h2>
<p>The desk notes flag <code>R-41202</code>, <code>R-41209</code>, <code>R-41236</code>, <code>R-41344</code>, and <code>R-41620</code> as one-day moves. The tenant/form rule still places them in the shared-parser group; the notes do not establish a third cause.</p>
<p class="stamp">desk ref <b>${deskRef('MichalMatak')}</b></p>
</main><footer>Pages are written by people. Tables and charts are built from data at render time.</footer>
</div></body></html>
`;
const output = path.join(root, 'rendered/kb/incidents/4471/causes/index.html');
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(`Rendered ${unique.length} unique reports into ${groups.length} causes at ${path.relative(root, output)}`);
