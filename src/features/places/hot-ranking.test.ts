import assert from "node:assert/strict";
import test from "node:test";
import { hasHotActivity, hotBreakdown, hotScore, rankPublicPlaces } from "./hot-ranking.ts";

const item = (id: string, props: Record<string, unknown> = {}) => ({ id, name: id, rating_avg: 0,
  rating_count: 0, like_count: 0, views_30d: 0, ...props });

test("nothing fabricated: no activity has zero score and no rank", () => {
  const [entry] = rankPublicPlaces([item("empty")]);
  assert.equal(entry.hot_rank, null);
  assert.equal(entry.hot_score, 0);
  assert.equal(hasHotActivity(entry), false);
});

test("reviews need volume: one five-star review is below many strong reviews", () => {
  assert.ok(hotScore(item("many", { rating_avg: 4.7, rating_count: 40 }))
    > hotScore(item("one", { rating_avg: 5, rating_count: 1 })));
});

test("likes and current views count, lifetime views alone do not", () => {
  const [old, newPlace] = rankPublicPlaces([
    item("old", { view_count: 50000 }),
    item("new", { like_count: 10, views_30d: 100 }),
  ]);
  assert.equal(old.hot_rank, null);
  assert.equal(newPlace.hot_rank, 1);
  assert.ok(newPlace.hot_breakdown.likes > 0);
  assert.ok(newPlace.hot_breakdown.views > 0);
});

test("scores capped at 100 and ranking ties are stable", () => {
  const [b, a] = rankPublicPlaces([
    item("b", { rating_avg: 5, rating_count: 300, like_count: 50000, views_30d: 1000000 }),
    item("a", { rating_avg: 5, rating_count: 300, like_count: 50000, views_30d: 1000000 }),
  ]);
  assert.equal(a.hot_rank, 1);
  assert.equal(b.hot_rank, 2);
  assert.ok(a.hot_score <= 100);
  const bd = hotBreakdown(a);
  assert.equal(a.hot_score, Math.round((bd.ratings + bd.likes + bd.views) * 10) / 10);
});

test("invalid values do not cause NaN scores", () => {
  const [p] = rankPublicPlaces([item("bad", { rating_avg: "oops", rating_count: -5,
    like_count: "NaN", views_30d: Infinity })]);
  assert.equal(p.hot_score, 0);
  assert.equal(p.hot_rank, null);
});
