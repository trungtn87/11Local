import assert from 'node:assert/strict';
import test from 'node:test';
import { createMonitorResourceSampler } from './monitor-resources.ts';

test('Nhà của Gấu reports cgroup v2 CPU deltas and current RAM, not host totals', () => {
  let at = 10;
  let cpu = 1000000;
  const MiB = 1024 * 1024;
  const sample = createMonitorResourceSampler({
    clock: () => at,
    now: () => new Date('2026-11-04T10:00:00Z'),
    readText: path => ({
      '/sys/fs/cgroup/cpu.stat': `usage_usec ${cpu}\n`,
      '/sys/fs/cgroup/memory.current': String(128 * MiB),
      '/sys/fs/cgroup/memory.max': String(640 * MiB),
    })[path] ?? '',
  });
  const cold = sample();
  assert.equal(cold.schema, 1);
  assert.equal(cold.service, '11local');
  assert.equal(cold.cpuVcpu, null);
  assert.equal(cold.ramUsedMb, 128);
  assert.equal(cold.ramLimitMb, 640);
  assert.equal(cold.sourceCpu, 'CGROUP_V2');
  assert.equal(cold.sourceRam, 'CGROUP_V2');
  at = 12;
  cpu = 2000000;
  const warmed = sample();
  assert.equal(warmed.cpuVcpu, 0.5);
  assert.equal(warmed.sampledAt, '2026-11-04T10:00:00.000Z');
  assert.deepEqual(Object.keys(warmed).sort(), [
    'schema','service','sampledAt','cpuVcpu','ramUsedMb','ramLimitMb','sourceCpu','sourceRam'
  ].sort());
});

test('Nhà của Gấu reports PROCESS fallback instead of inventing container limits', () => {
  let at = 5, used = 3;
  const sample = createMonitorResourceSampler({
    clock: () => at,
    readText: () => { throw new Error('cgroup unavailable'); },
    processCpuSeconds: () => used,
    processRssBytes: () => 70 * 1024 * 1024,
  });
  assert.equal(sample().cpuVcpu, null);
  at = 7; used = 3.2;
  const again = sample();
  assert.equal(again.cpuVcpu, 0.1);
  assert.equal(again.sourceCpu, 'PROCESS');
  assert.equal(again.sourceRam, 'PROCESS');
  assert.equal(again.ramUsedMb, 70);
  assert.equal(again.ramLimitMb, null);
});
