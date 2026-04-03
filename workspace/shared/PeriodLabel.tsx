'use client';
import { useMemo } from 'react';
import { MONTHS } from './MonthPicker';

interface PeriodLabelProps {
  monthIdx: number;
  year: number;
}

export function PeriodLabel({ monthIdx, year }: PeriodLabelProps) {
  const { text, color } = useMemo(() => {
    const now = new Date();
    if (year === now.getFullYear() && monthIdx === now.getMonth()) {
      const lastDay = new Date(year, monthIdx + 1, 0).getDate();
      const left = lastDay - now.getDate();
      return { text: `Days left in ${MONTHS[monthIdx].slice(0, 3)}: ${left}`, color: 'amber' as const };
    }
    const isPast = year < now.getFullYear() || (year === now.getFullYear() && monthIdx < now.getMonth());
    if (isPast) return { text: `${MONTHS[monthIdx].slice(0, 3)} ${year} — Closed`, color: 'slate' as const };
    return { text: `${MONTHS[monthIdx].slice(0, 3)} ${year} — Upcoming`, color: 'blue' as const };
  }, [monthIdx, year]);

  return (
    <div className={`px-2.5 py-1.5 rounded-lg border ${
      color === 'amber' ? 'bg-amber-50 border-amber-100' :
      color === 'slate' ? 'bg-slate-50 border-slate-100' :
      'bg-[#EEF1FB] border-[#D6DEFA]'
    }`}>
      <span className={`text-caption ${
        color === 'amber' ? 'text-amber-700' :
        color === 'slate' ? 'text-slate-500' :
        'text-[#3D5EC7]'
      }`}>{text}</span>
    </div>
  );
}
