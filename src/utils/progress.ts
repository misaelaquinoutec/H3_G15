import type { FileProgress } from '../api/types'

type Loose = Partial<FileProgress> & { percentage?: number; bins?: Partial<Record<'WO' | 'FC' | 'DR' | 'MA', number>> }

/** Reads progress tolerating both flat (`WO`) and nested (`bins.WO`) shapes. */
export function progressOf(p: unknown): FileProgress {
  const l = (p ?? {}) as Loose
  return {
    overall: l.overall ?? l.percentage ?? 0,
    WO: l.WO ?? l.bins?.WO ?? 0,
    FC: l.FC ?? l.bins?.FC ?? 0,
    DR: l.DR ?? l.bins?.DR ?? 0,
    MA: l.MA ?? l.bins?.MA ?? 0,
  }
}
