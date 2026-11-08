import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTimelineDate, groupMilestones } from "./family-timeline.ts";
import type { Milestone } from "./family.ts";

const milestone = (id: string, event_date: string): Milestone => ({
  id,
  event_date,
  title: id,
  details: "",
  album_id: null,
});

test("groups real milestones into descending year/month branches", () => {
  const input = [
    milestone("a", "2025-03-01"),
    milestone("b", "2026-06-20"),
    milestone("c", "2026-06-04"),
    milestone("d", "2026-01-09"),
  ];
  const groups = groupMilestones(input);
  assert.deepEqual(
    groups.map((g) => ({ year: g.year, count: g.count, months: g.months.map((m) => m.month) })),
    [
      { year: "2026", count: 3, months: [6, 1] },
      { year: "2025", count: 1, months: [3] },
    ],
  );
  assert.deepEqual(groups[0].months[0].events.map((m) => m.id), ["b", "c"]);
  assert.equal(input[0].id, "a", "original query result remains unchanged");
});

test("handles empty data and date display without manufacturing memories", () => {
  assert.deepEqual(groupMilestones([]), []);
  assert.equal(formatTimelineDate("2026-11-09"), "09/11/2026");
  assert.equal(formatTimelineDate("chưa rõ"), "chưa rõ");
});
