// When seasonal episodes are allowed to play by themselves.

// Lunar holidays (main day), so the seasonal episodes know when it's 설날 or 추석.
const LUNAR = {
  seollal: ['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31', '2034-02-19', '2035-02-08'],
  chuseok: ['2025-10-06', '2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01', '2032-09-19', '2033-09-08', '2034-09-27', '2035-09-16'],
};

export function isInSeason(ep, date) {
  const s = ep.season;
  if (!s) return true;
  if (s.lunar) {
    return LUNAR[s.lunar].some((d) => {
      const [y, m, day] = d.split('-').map(Number);
      return Math.abs(new Date(y, m - 1, day) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) <= 3 * 86400000;
    });
  }
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const from = s.from[0] * 100 + s.from[1];
  const to = s.to[0] * 100 + s.to[1];
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}
