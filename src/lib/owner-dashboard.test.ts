import test from 'node:test';
import assert from 'node:assert/strict';
import { previousRange,trafficSummary,ratingSummary,menuReminder,vietnamDate } from './owner-dashboard.ts';
test('comparisons use inclusive equal-length periods, including leap day',()=>{
  assert.deepEqual(previousRange({start:'2026-11-04',end:'2026-11-04'}),{start:'2026-11-03',end:'2026-11-03'});
  assert.deepEqual(previousRange({start:'2024-03-01',end:'2024-03-07'}),{start:'2024-02-23',end:'2024-02-29'});
});
test('incomplete history is not treated as zero; zero baseline never produces infinity',()=>{
  const range={start:'2026-11-04',end:'2026-11-04'};
  assert.equal(trafficSummary(range,'2026-11-03T10:00:00Z',10,0).comparable,false);
  const noHistory=trafficSummary(range,null,0,0);assert.equal(noHistory.hasMeasuredDays,false);assert.equal(noHistory.previous,null);
  assert.equal(trafficSummary({start:'2026-10-01',end:'2026-10-02'},'2026-11-03T10:00:00Z',0,0).hasMeasuredDays,false);
  const zero=trafficSummary(range,'2026-11-01T10:00:00Z',10,0);
  assert.equal(zero.comparable,true);assert.equal(zero.percentChange,null);
  assert.equal(trafficSummary(range,'2026-11-01T10:00:00Z',15,10).percentChange,50);
  assert.equal(trafficSummary(range,'2026-11-01T10:00:00Z',5,10).percentChange,-50);
});
test('Vietnam midnight controls the measured day',()=>{
  assert.equal(vietnamDate('2026-11-04T18:00:00Z'),'2026-11-05');
  assert.equal(trafficSummary({start:'2026-11-04',end:'2026-11-04'},'2026-11-04T18:00:00Z',0,0).hasMeasuredDays,false);
});
test('ratings are weighted by count, keep all five bins and use no fictitious score',()=>{
  assert.deepEqual(ratingSummary([]),{average:null,total:0,distribution:[5,4,3,2,1].map(stars=>({stars,count:0}))});
  const summary=ratingSummary([{stars:5,count:3},{stars:1,count:1}]);assert.equal(summary.average,4);assert.equal(summary.total,4);assert.equal(summary.distribution[0].count,3);
});
test('price reminders use approved publication timestamp and exact 90-day boundary',()=>{
  const now=new Date('2026-11-04T10:00:00Z');const boundary=new Date(now.getTime()-90*86400000);
  assert.equal(menuReminder(null,now).state,'missing');
  assert.equal(menuReminder({has_content:false,hidden:false,published_at:boundary},now).state,'missing');
  assert.equal(menuReminder({has_content:true,hidden:true,published_at:boundary},now).state,'outdated');
  assert.equal(menuReminder({has_content:true,hidden:false,published_at:new Date(boundary.getTime()+1)},now).state,'current');
});
