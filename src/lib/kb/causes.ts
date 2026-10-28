// Cause rules for the sanitized #4471 view. Free-text report fields are not published.
export type Report = {
  id: string;
  receivedAt: string;
  tenant: string;
  channel: 'app' | 'email' | 'form';
  meta: { intakeTag: string };
  mergedInto: number | null;
};

export type Tenant = { handle: string; locale: string; form: 'booking-v2' | 'booking-v3' };
export type Cause = 'parser' | 'hint';
export const CAUSES: readonly Cause[] = ['parser', 'hint'];

const DATE_HINT: Record<Tenant['form'], string> = {
  'booking-v2': 'DD/MM/YYYY',
  'booking-v3': 'MM/DD/YYYY',
};

export function dayFirst(locale: string): boolean {
  const order = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(Date.UTC(2026, 0, 2, 12)))
    .map((p) => p.type);
  return order.indexOf('day') < order.indexOf('month');
}

export function causeOf(r: Pick<Report, 'channel'>, t: Tenant | undefined): Cause | null {
  if (!t || !dayFirst(t.locale)) return null;
  return r.channel === 'form' && DATE_HINT[t.form].startsWith('MM') ? 'hint' : 'parser';
}

export function uniqueById(reports: Report[]): Report[] {
  return [...new Map(reports.map((r) => [r.id, r])).values()];
}

export type CauseGroup = {
  cause: Cause | 'unplaced';
  reports: Report[];
  taggedAs: Record<string, number>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  mergedInto: number[];
};

export function groupByCause(reports: Report[], tenantOf: (r: Report) => Tenant | undefined): CauseGroup[] {
  const byCause = new Map<CauseGroup['cause'], Report[]>();
  for (const r of reports) {
    const cause = causeOf(r, tenantOf(r)) ?? 'unplaced';
    byCause.set(cause, [...(byCause.get(cause) ?? []), r]);
  }
  return [...byCause.entries()]
    .map(([cause, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        cause,
        reports: rs,
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        mergedInto: [...new Set(rs.flatMap((r) => (r.mergedInto ? [r.mergedInto] : [])))],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

export function ticketCause(groups: CauseGroup[], ticket: number): CauseGroup['cause'] | null {
  return groups.find((g) => g.mergedInto.includes(ticket))?.cause ?? null;
}

export function readAs(g: CauseGroup, ids: readonly string[]): number {
  return g.reports.filter((r) => ids.includes(r.id)).length;
}
