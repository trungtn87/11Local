import type { Milestone } from "./family";

export type TimelineMonth = {
  month: number;
  events: Milestone[];
};

export type TimelineYear = {
  year: string;
  count: number;
  months: TimelineMonth[];
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function groupMilestones(rows: readonly Milestone[]): TimelineYear[] {
  const sorted = [...rows].sort((a, b) => {
    const aDate = ISO_DATE.test(a.event_date) ? a.event_date : "";
    const bDate = ISO_DATE.test(b.event_date) ? b.event_date : "";
    return bDate.localeCompare(aDate) || a.id.localeCompare(b.id);
  });

  const years: TimelineYear[] = [];
  for (const memory of sorted) {
    const match = ISO_DATE.exec(memory.event_date);
    const year = match ? match[1] : "chưa rõ";
    const value = match ? Number(match[2]) : 0;
    const month = value >= 1 && value <= 12 ? value : 0;
    let yearGroup = years.find((item) => item.year === year);
    if (!yearGroup) {
      yearGroup = { year, count: 0, months: [] };
      years.push(yearGroup);
    }
    let monthGroup = yearGroup.months.find((item) => item.month === month);
    if (!monthGroup) {
      monthGroup = { month, events: [] };
      yearGroup.months.push(monthGroup);
    }
    monthGroup.events.push(memory);
    yearGroup.count += 1;
  }
  return years;
}

export function formatTimelineDate(date: string): string {
  const match = ISO_DATE.exec(date);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
}
