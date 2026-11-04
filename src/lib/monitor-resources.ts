// A minimal and public, read-only cgroup-v2 sampler for 11Local on Vibe.
// Never inspect DB, request headers, users, environment variables or secrets.
import { readFileSync } from 'node:fs';

type Source = 'CGROUP_V2' | 'PROCESS';
export type MonitorResourceSnapshot = {
  schema: 1;
  service: '11local';
  sampledAt: string;
  cpuVcpu: number | null;
  ramUsedMb: number;
  ramLimitMb: number | null;
  sourceCpu: Source;
  sourceRam: Source;
};

const MiB = 1024 * 1024;
type SamplerOptions = {
  clock?: () => number;
  now?: () => Date;
  readText?: (path: string) => string;
  processCpuSeconds?: () => number;
  processRssBytes?: () => number;
};

export function createMonitorResourceSampler(options: SamplerOptions = {}) {
  const clock = options.clock ?? (() => performance.now() / 1000);
  const now = options.now ?? (() => new Date());
  const readText = options.readText ?? ((path: string) => readFileSync(path, 'utf8'));
  const processCpuSeconds = options.processCpuSeconds ?? (() => {
    const cpu = process.cpuUsage();
    return (cpu.user + cpu.system) / 1_000_000;
  });
  const processRssBytes = options.processRssBytes ?? (() => process.memoryUsage().rss);
  let last: { at: number; cpuSeconds: number; source: Source } | null = null;

  return function sample(): MonitorResourceSnapshot {
    const at = clock();
    let cpuSeconds: number;
    let sourceCpu: Source = 'CGROUP_V2';
    try {
      const raw = readText('/sys/fs/cgroup/cpu.stat');
      const match = /^usage_usec\s+(\d+)$/m.exec(raw);
      if (!match) throw new Error('Missing cgroup CPU usage');
      cpuSeconds = Number(match[1]) / 1_000_000;
      if (!Number.isFinite(cpuSeconds) || cpuSeconds < 0) throw new Error('Invalid cgroup CPU');
    } catch {
      sourceCpu = 'PROCESS';
      cpuSeconds = processCpuSeconds();
    }

    let cpuVcpu: number | null = null;
    if (last && last.source === sourceCpu && at > last.at && cpuSeconds >= last.cpuSeconds) {
      cpuVcpu = Math.round((cpuSeconds - last.cpuSeconds) / (at - last.at) * 100000) / 100000;
    }
    last = { at, cpuSeconds, source: sourceCpu };

    let sourceRam: Source = 'CGROUP_V2';
    let ramUsedMb: number;
    let ramLimitMb: number | null;
    try {
      const bytes = Number(readText('/sys/fs/cgroup/memory.current').trim());
      const rawMax = readText('/sys/fs/cgroup/memory.max').trim();
      const maxBytes = rawMax === 'max' ? null : Number(rawMax);
      if (!Number.isFinite(bytes) || bytes < 0 || (
        maxBytes !== null && (!Number.isFinite(maxBytes) || maxBytes <= 0)
      )) throw new Error('Invalid cgroup RAM');
      ramUsedMb = Math.round(bytes / MiB * 100) / 100;
      ramLimitMb = maxBytes === null ? null : Math.round(maxBytes / MiB * 100) / 100;
    } catch {
      sourceRam = 'PROCESS';
      ramUsedMb = Math.round(processRssBytes() / MiB * 100) / 100;
      ramLimitMb = null;
    }

    return {
      schema: 1,
      service: '11local',
      sampledAt: now().toISOString(),
      cpuVcpu,
      ramUsedMb,
      ramLimitMb,
      sourceCpu,
      sourceRam,
    };
  };
}

export const sampleMonitorResources = createMonitorResourceSampler();
