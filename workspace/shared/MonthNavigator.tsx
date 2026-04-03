'use client';
import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';
import { MonthPicker, MONTHS } from './MonthPicker';

export { MONTHS };

interface MonthNavigatorProps {
  monthIdx: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  minYear?: number;
}

export function MonthNavigator({ monthIdx, year, onMonthChange, onYearChange, minYear = 2023 }: MonthNavigatorProps) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const canGoPrev = year > minYear || monthIdx > 0;
  const canGoNext = useMemo(() => {
    const now = new Date();
    const nextM = monthIdx === 11 ? 0 : monthIdx + 1;
    const nextY = monthIdx === 11 ? year + 1 : year;
    return !(nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth()));
  }, [monthIdx, year]);

  const goToPrevMonth = useCallback(() => {
    if (monthIdx === 0) {
      if (year > minYear) { onMonthChange(11); onYearChange(year - 1); }
    } else { onMonthChange(monthIdx - 1); }
  }, [monthIdx, year, minYear, onMonthChange, onYearChange]);

  const goToNextMonth = useCallback(() => {
    if (!canGoNext) return;
    if (monthIdx === 11) { onMonthChange(0); onYearChange(year + 1); }
    else { onMonthChange(monthIdx + 1); }
  }, [monthIdx, year, canGoNext, onMonthChange, onYearChange]);

  return (
    <div className="relative flex items-center gap-0 bg-white border border-black/5 rounded-xl px-1 py-1">
      <button onClick={goToPrevMonth} disabled={!canGoPrev} className="p-1.5 hover:bg-black/[0.04] rounded-lg transition-colors active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed">
        <ChevronLeft className="w-4 h-4 text-black/55" />
      </button>
      <button
        onClick={() => setShowMonthPicker(p => !p)}
        className="flex items-center gap-1.5 px-2 cursor-pointer hover:bg-black/[0.03] rounded-lg py-1 transition-colors"
      >
        <Calendar className="w-3.5 h-3.5 text-black/55" />
        <span className="text-black/80 text-body font-semibold">{MONTHS[monthIdx]} {year}</span>
        <ChevronDown className="w-3 h-3 text-black/35" />
      </button>
      <button onClick={goToNextMonth} disabled={!canGoNext} className="p-1.5 hover:bg-black/[0.04] rounded-lg transition-colors active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed">
        <ChevronRight className="w-4 h-4 text-black/55" />
      </button>
      {showMonthPicker && (
        <MonthPicker
          month={monthIdx}
          year={year}
          minYear={minYear}
          onSelect={(m, y) => { onMonthChange(m); onYearChange(y); }}
          onClose={() => setShowMonthPicker(false)}
        />
      )}
    </div>
  );
}
