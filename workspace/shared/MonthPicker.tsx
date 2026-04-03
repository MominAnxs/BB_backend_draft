'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function MonthPicker({
  month,
  year,
  onSelect,
  onClose,
  minYear = 2023,
  maxYear = 2026,
}: {
  month: number;
  year: number;
  onSelect: (m: number, y: number) => void;
  onClose: () => void;
  minYear?: number;
  maxYear?: number;
}) {
  const [viewYear, setViewYear] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-black/[0.06] p-4 z-50 w-[280px]">
      {/* Year nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewYear(y => Math.max(y - 1, minYear))} className="p-1 hover:bg-black/[0.04] rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4 text-black/50" />
        </button>
        <span className="text-black/80 text-body font-semibold">{viewYear}</span>
        <button onClick={() => setViewYear(y => Math.min(y + 1, maxYear))} className="p-1 hover:bg-black/[0.04] rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4 text-black/50" />
        </button>
      </div>
      {/* Month grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {MONTHS.map((m, i) => {
          const isSelected = i === month && viewYear === year;
          const isCurrent = i === currentMonth && viewYear === currentYear;
          const isFuture = viewYear > currentYear || (viewYear === currentYear && i > currentMonth);
          return (
            <button
              key={m}
              disabled={isFuture}
              onClick={() => { onSelect(i, viewYear); onClose(); }}
              className={`py-2 px-1 rounded-lg transition-all text-center text-caption ${
                isSelected ? 'bg-[#EEF1FB] text-[#204CC7]' :
                isCurrent ? 'bg-[#EEF1FB] text-[#3D5EC7]' :
                isFuture ? 'text-black/20 cursor-not-allowed' :
                'text-black/65 hover:bg-black/[0.04]'
              }`}
              style={{ fontWeight: isSelected ? 600 : 500 }}
            >
              {m.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
