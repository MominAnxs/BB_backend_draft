'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  Share,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Link2,
  Plus,
  GripVertical,
  Pencil,
  Trash,
  Copy,
  X,
  MoreHorizontal,
  Clock,
  FileText,
  Lock,
  AlertCircle,
  Check,
} from 'lucide-react';
import { MonthNavigator, MONTHS } from './shared/MonthNavigator';
import { PeriodLabel } from './shared/PeriodLabel';

// ─── TYPES ───────────────────────────────────────────────────────

interface ClientDetailViewProps {
  client: {
    id: string;
    name: string;
    team: { initials: string; color: string }[];
  };
  onBack: () => void;
  monthIdx: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}

interface Column {
  id: string;
  name: string;
  type: 'Text' | 'Number' | 'Status' | 'Date' | 'People' | 'Link';
}

interface Row {
  id: string;
  cells: Record<string, string>;
  isTotal?: boolean;
}

interface MediaPlanGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  columns: Column[];
  rows: Row[];
}

interface MediaPlanVersion {
  id: string;
  createdAt: string;        // ISO date string
  label: string;            // e.g. "Mar 5, 2026"
  groups: MediaPlanGroup[];
  isModified?: boolean;     // true if a historical plan was edited after creation
  modifiedAt?: string;      // ISO date string of last edit
}

// key = "YYYY-MM", value = array of versions for that month
type MediaPlanHistory = Record<string, MediaPlanVersion[]>;

interface EditingCell {
  groupId: string;
  rowId: string;
  colId: string;
}

// ─── CONSTANTS ───────────────────────────────────────────────────

const GROUP_COLORS = [
  '#204CC7', '#00C875', '#FDAB3D', '#E2445C', '#A25DDC', '#579BFC',
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  hit: { bg: '#EEF1FB', text: '#204CC7' },
  miss: { bg: '#FFE7E7', text: '#E2445C' },
  approved: { bg: '#E8F8F5', text: '#00C875' },
  pending: { bg: '#FFF4E6', text: '#FDAB3D' },
  'in progress': { bg: '#DBEAFE', text: '#1D4ED8' },
  done: { bg: '#E8F8F5', text: '#00C875' },
};

function cycleStatus(current: string): string {
  const taskCycle = ['Pending', 'In Progress', 'Done'];
  const mediaCycle = ['Hit', 'Miss', 'Approved', 'Pending'];
  if (mediaCycle.includes(current)) {
    return mediaCycle[(mediaCycle.indexOf(current) + 1) % mediaCycle.length];
  }
  const idx = taskCycle.indexOf(current);
  return taskCycle[(idx >= 0 ? idx + 1 : 0) % taskCycle.length];
}

// ─── HELPERS ─────────────────────────────────────────────────────

function monthKey(monthIdx: number, year: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isCurrentMonth(monthIdx: number, year: number): boolean {
  const now = new Date();
  return now.getMonth() === monthIdx && now.getFullYear() === year;
}

function isPastMonth(monthIdx: number, year: number): boolean {
  const now = new Date();
  const nowKey = now.getFullYear() * 12 + now.getMonth();
  const checkKey = year * 12 + monthIdx;
  return checkKey < nowKey;
}

// ─── SEED DATA ───────────────────────────────────────────────────

function createSeedGroups(): MediaPlanGroup[] {
  return [
    {
      id: 'group-1',
      name: 'Combined Plan',
      color: GROUP_COLORS[0],
      collapsed: false,
      columns: [
        { id: 'col-1', name: 'Campaign', type: 'Text' },
        { id: 'col-2', name: 'Budget', type: 'Number' },
        { id: 'col-3', name: 'Avg CPC', type: 'Number' },
        { id: 'col-4', name: 'Conv. Rate', type: 'Number' },
        { id: 'col-5', name: 'Purchase', type: 'Number' },
        { id: 'col-6', name: 'ROAS', type: 'Number' },
        { id: 'col-7', name: 'CPM', type: 'Number' },
        { id: 'col-8', name: 'CTR', type: 'Number' },
        { id: 'col-9', name: 'CPA', type: 'Number' },
      ],
      rows: [
        { id: 'row-1', cells: { 'col-1': 'Google', 'col-2': '₹50,000', 'col-3': '₹12.40', 'col-4': '3.5%', 'col-5': '175', 'col-6': '3.2x', 'col-7': '₹85', 'col-8': '2.1%', 'col-9': '₹286' } },
        { id: 'row-2', cells: { 'col-1': 'Meta', 'col-2': '₹35,000', 'col-3': '₹9.50', 'col-4': '4.2%', 'col-5': '147', 'col-6': '3.8x', 'col-7': '₹62', 'col-8': '2.8%', 'col-9': '₹238' } },
        { id: 'row-3', cells: { 'col-1': 'Total', 'col-2': '₹85,000', 'col-3': '₹10.75', 'col-4': '3.85%', 'col-5': '322', 'col-6': '3.5x', 'col-7': '₹73.50', 'col-8': '2.45%', 'col-9': '₹262' }, isTotal: true },
      ],
    },
    {
      id: 'group-2',
      name: 'Offers for the coming month',
      color: GROUP_COLORS[1],
      collapsed: false,
      columns: [
        { id: 'col-10', name: 'Dates', type: 'Text' },
        { id: 'col-11', name: 'Offer', type: 'Text' },
        { id: 'col-12', name: 'Communication', type: 'Text' },
        { id: 'col-13', name: 'Targeting', type: 'Text' },
        { id: 'col-14', name: 'Comments', type: 'Text' },
      ],
      rows: [
        { id: 'row-4', cells: { 'col-10': '1st – 10th Apr', 'col-11': 'Spring Sale 20% Off', 'col-12': 'Email + Social Ads', 'col-13': 'All Customers', 'col-14': 'Focus on email drip campaign' } },
        { id: 'row-5', cells: { 'col-10': '15th – 18th Apr', 'col-11': 'Flash Deal – Buy 1 Get 1', 'col-12': 'Social Only', 'col-13': 'Top 100 Repeat Buyers', 'col-14': 'Limited 72-hour window' } },
        { id: 'row-6', cells: { 'col-10': '1st – 31st May', 'col-11': 'Summer Campaign', 'col-12': 'Multi-channel', 'col-13': 'New Customers (Lookalike)', 'col-14': 'Budget TBD — pending approval' } },
      ],
    },
  ];
}

function createSeedHistory(): MediaPlanHistory {
  const now = new Date();
  const curKey = monthKey(now.getMonth(), now.getFullYear());

  // Past months with sample data
  const history: MediaPlanHistory = {};

  // Feb 2026 — two versions (mid-month revision)
  const febKey = monthKey(1, 2026);
  history[febKey] = [
    {
      id: 'v-feb-1',
      createdAt: '2026-02-03T10:00:00Z',
      label: 'Feb 3, 2026',
      groups: [
        {
          id: 'g-feb-1', name: 'Combined Plan', color: GROUP_COLORS[0], collapsed: false,
          columns: [
            { id: 'c1', name: 'Campaign', type: 'Text' },
            { id: 'c2', name: 'Budget', type: 'Number' },
            { id: 'c3', name: 'Avg CPC', type: 'Number' },
            { id: 'c4', name: 'ROAS', type: 'Number' },
            { id: 'c5', name: 'Purchases', type: 'Number' },
          ],
          rows: [
            { id: 'r1', cells: { c1: 'Google', c2: '₹40,000', c3: '₹11.20', c4: '2.8x', c5: '142' } },
            { id: 'r2', cells: { c1: 'Meta', c2: '₹30,000', c3: '₹8.90', c4: '3.1x', c5: '118' } },
            { id: 'r3', cells: { c1: 'Total', c2: '₹70,000', c3: '₹10.05', c4: '2.95x', c5: '260' }, isTotal: true },
          ],
        },
      ],
    },
    {
      id: 'v-feb-2',
      createdAt: '2026-02-17T14:30:00Z',
      label: 'Feb 17, 2026',
      isModified: true,
      modifiedAt: '2026-02-24T09:15:00Z',
      groups: [
        {
          id: 'g-feb-2', name: 'Combined Plan (Revised)', color: GROUP_COLORS[0], collapsed: false,
          columns: [
            { id: 'c1', name: 'Campaign', type: 'Text' },
            { id: 'c2', name: 'Budget', type: 'Number' },
            { id: 'c3', name: 'Avg CPC', type: 'Number' },
            { id: 'c4', name: 'ROAS', type: 'Number' },
            { id: 'c5', name: 'Purchases', type: 'Number' },
          ],
          rows: [
            { id: 'r1', cells: { c1: 'Google', c2: '₹45,000', c3: '₹10.80', c4: '3.0x', c5: '158' } },
            { id: 'r2', cells: { c1: 'Meta', c2: '₹32,000', c3: '₹9.10', c4: '3.4x', c5: '130' } },
            { id: 'r3', cells: { c1: 'Total', c2: '₹77,000', c3: '₹9.95', c4: '3.2x', c5: '288' }, isTotal: true },
          ],
        },
      ],
    },
  ];

  // Jan 2026 — single version
  const janKey = monthKey(0, 2026);
  history[janKey] = [
    {
      id: 'v-jan-1',
      createdAt: '2026-01-05T10:00:00Z',
      label: 'Jan 5, 2026',
      groups: [
        {
          id: 'g-jan-1', name: 'Combined Plan', color: GROUP_COLORS[0], collapsed: false,
          columns: [
            { id: 'c1', name: 'Campaign', type: 'Text' },
            { id: 'c2', name: 'Budget', type: 'Number' },
            { id: 'c3', name: 'ROAS', type: 'Number' },
            { id: 'c4', name: 'Purchases', type: 'Number' },
          ],
          rows: [
            { id: 'r1', cells: { c1: 'Google', c2: '₹35,000', c3: '2.6x', c4: '120' } },
            { id: 'r2', cells: { c1: 'Meta', c2: '₹28,000', c3: '2.9x', c4: '105' } },
            { id: 'r3', cells: { c1: 'Total', c2: '₹63,000', c3: '2.75x', c4: '225' }, isTotal: true },
          ],
        },
      ],
    },
  ];

  // Current month
  history[curKey] = [
    {
      id: 'v-cur-1',
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
      label: formatDateLabel(new Date(now.getFullYear(), now.getMonth(), 5)),
      groups: createSeedGroups(),
    },
  ];

  return history;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  onBack,
  monthIdx,
  year,
  onMonthChange,
  onYearChange,
}) => {
  // ── History State ──
  const [planHistory, setPlanHistory] = useState<MediaPlanHistory>(() => createSeedHistory());
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const versionPickerRef = useRef<HTMLDivElement>(null);

  // ── UI State ──
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [addColumnGroupId, setAddColumnGroupId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<Column['type']>('Text');
  const [columnMenuOpen, setColumnMenuOpen] = useState<{ groupId: string; colId: string } | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingColumnHeader, setEditingColumnHeader] = useState<{ groupId: string; colId: string } | null>(null);

  // ── Derived State ──
  const currentKey = monthKey(monthIdx, year);
  const versionsForMonth = planHistory[currentKey] || [];
  const isCurrent = isCurrentMonth(monthIdx, year);
  const isPast = isPastMonth(monthIdx, year);

  // Auto-select latest version when month changes
  useEffect(() => {
    const versions = planHistory[currentKey];
    if (versions && versions.length > 0) {
      setActiveVersionId(versions[versions.length - 1].id);
    } else {
      setActiveVersionId(null);
    }
    setShowVersionPicker(false);
  }, [currentKey, planHistory]);

  const activeVersion = useMemo(() => {
    if (!activeVersionId) return null;
    return versionsForMonth.find((v) => v.id === activeVersionId) || null;
  }, [activeVersionId, versionsForMonth]);

  const activeGroups = activeVersion?.groups || [];

  // Whether this version is the latest for its month
  const isLatestVersion = activeVersion
    ? versionsForMonth[versionsForMonth.length - 1]?.id === activeVersion.id
    : false;

  // Editable if current month and latest version, OR past but we allow editing (with modified tag)
  const isEditable = activeVersion != null;

  // Close version picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (versionPickerRef.current && !versionPickerRef.current.contains(e.target as Node)) {
        setShowVersionPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Helpers to update the active version's groups ──
  const updateActiveGroups = (updater: (groups: MediaPlanGroup[]) => MediaPlanGroup[]) => {
    if (!activeVersionId) return;
    setPlanHistory((prev) => {
      const versions = prev[currentKey];
      if (!versions) return prev;
      const isHistorical = isPast;
      return {
        ...prev,
        [currentKey]: versions.map((v) =>
          v.id === activeVersionId
            ? {
                ...v,
                groups: updater(v.groups),
                ...(isHistorical && !v.isModified
                  ? { isModified: true, modifiedAt: new Date().toISOString() }
                  : isHistorical
                  ? { modifiedAt: new Date().toISOString() }
                  : {}),
              }
            : v
        ),
      };
    });
  };

  // ── CRUD Operations (delegating to updateActiveGroups) ──


  const toggleGroupCollapse = (groupId: string) => {
    updateActiveGroups((groups) =>
      groups.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    );
  };

  const addColumn = (groupId: string) => {
    if (!newColumnName.trim()) return;
    updateActiveGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const newColId = `col-${Date.now()}`;
        return { ...g, columns: [...g.columns, { id: newColId, name: newColumnName, type: newColumnType }] };
      })
    );
    setNewColumnName('');
    setNewColumnType('Text');
    setAddColumnGroupId(null);
  };

  const deleteColumn = (groupId: string, colId: string) => {
    updateActiveGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          columns: g.columns.filter((c) => c.id !== colId),
          rows: g.rows.map((r) => { const c = { ...r.cells }; delete c[colId]; return { ...r, cells: c }; }),
        };
      })
    );
    setColumnMenuOpen(null);
  };

  const renameColumn = (groupId: string, colId: string, newName: string) => {
    updateActiveGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, columns: g.columns.map((c) => (c.id === colId ? { ...c, name: newName } : c)) };
      })
    );
    setColumnMenuOpen(null);
  };

  const renameGroup = (groupId: string, newName: string) => {
    if (!newName.trim()) return;
    updateActiveGroups((groups) =>
      groups.map((g) => (g.id === groupId ? { ...g, name: newName.trim() } : g))
    );
  };

  const duplicateColumn = (groupId: string, colId: string) => {
    updateActiveGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const col = g.columns.find((c) => c.id === colId);
        if (!col) return g;
        const newColId = `col-${Date.now()}`;
        return {
          ...g,
          columns: [...g.columns, { ...col, id: newColId, name: `${col.name} (copy)` }],
          rows: g.rows.map((r) => ({ ...r, cells: { ...r.cells, [newColId]: r.cells[colId] || '' } })),
        };
      })
    );
    setColumnMenuOpen(null);
  };

  const updateCell = (groupId: string, rowId: string, colId: string, value: string) => {
    updateActiveGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          rows: g.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r)),
        };
      })
    );
  };

  const addRow = (groupId: string) => {
    updateActiveGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const newCells: Record<string, string> = {};
        g.columns.forEach((col) => { newCells[col.id] = ''; });
        return { ...g, rows: [...g.rows, { id: `row-${Date.now()}`, cells: newCells }] };
      })
    );
  };

  const deleteRow = (groupId: string, rowId: string) => {
    updateActiveGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, rows: g.rows.filter((r) => r.id !== rowId) };
      })
    );
  };

  const addNewGroup = () => {
    const colorIndex = activeGroups.length % GROUP_COLORS.length;
    updateActiveGroups((groups) => [
      ...groups,
      {
        id: `group-${Date.now()}`,
        name: 'New Group',
        color: GROUP_COLORS[colorIndex],
        collapsed: false,
        columns: [{ id: `col-${Date.now()}-1`, name: 'Column 1', type: 'Text' as const }],
        rows: [],
      },
    ]);
  };

  // ── New Plan Version ──
  const createNewPlan = () => {
    const now = new Date();
    const label = formatDateLabel(now);
    const newVersion: MediaPlanVersion = {
      id: `v-${Date.now()}`,
      createdAt: now.toISOString(),
      label,
      groups: [
        {
          id: `group-${Date.now()}`,
          name: 'Combined Plan',
          color: GROUP_COLORS[0],
          collapsed: false,
          columns: [
            { id: `col-${Date.now()}-1`, name: 'Campaign', type: 'Text' },
            { id: `col-${Date.now()}-2`, name: 'Budget', type: 'Number' },
            { id: `col-${Date.now()}-3`, name: 'ROAS', type: 'Number' },
          ],
          rows: [],
        },
      ],
    };
    setPlanHistory((prev) => ({
      ...prev,
      [currentKey]: [...(prev[currentKey] || []), newVersion],
    }));
    setActiveVersionId(newVersion.id);
  };

  // Duplicate existing plan as a new version
  const duplicatePlanAsNew = () => {
    if (!activeVersion) return;
    const now = new Date();
    const label = formatDateLabel(now);
    const deepCopyGroups: MediaPlanGroup[] = JSON.parse(JSON.stringify(activeVersion.groups));
    // Re-key IDs to avoid collisions
    const ts = Date.now();
    deepCopyGroups.forEach((g, gi) => {
      g.id = `group-${ts}-${gi}`;
      g.columns.forEach((c, ci) => { c.id = `col-${ts}-${gi}-${ci}`; });
      g.rows.forEach((r, ri) => {
        const oldCells = r.cells;
        const newCells: Record<string, string> = {};
        g.columns.forEach((c, ci) => {
          const oldColId = activeVersion.groups[gi]?.columns[ci]?.id;
          newCells[c.id] = oldColId ? (oldCells[oldColId] || '') : '';
        });
        r.id = `row-${ts}-${gi}-${ri}`;
        r.cells = newCells;
      });
    });
    const newVersion: MediaPlanVersion = {
      id: `v-${ts}`,
      createdAt: now.toISOString(),
      label,
      groups: deepCopyGroups,
    };
    setPlanHistory((prev) => ({
      ...prev,
      [currentKey]: [...(prev[currentKey] || []), newVersion],
    }));
    setActiveVersionId(newVersion.id);
  };

  // ── Delete Plan Version ──
  const deletePlan = (versionId: string) => {
    setPlanHistory((prev) => {
      const versions = prev[currentKey];
      if (!versions) return prev;
      const updated = versions.filter((v) => v.id !== versionId);
      if (updated.length === 0) {
        const next = { ...prev };
        delete next[currentKey];
        return next;
      }
      return { ...prev, [currentKey]: updated };
    });
    // If we just deleted the active version, switch to the latest remaining (or null)
    if (activeVersionId === versionId) {
      const remaining = (planHistory[currentKey] || []).filter((v) => v.id !== versionId);
      setActiveVersionId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
    setConfirmingDeleteId(null);
  };

  // ── Render Helpers ──

  const renderCellContent = (column: Column, value: string) => {
    switch (column.type) {
      case 'Number':
        return <span className="text-right">{value}</span>;
      case 'Date':
        return value;
      case 'Status': {
        const statusKey = value.toLowerCase();
        const statusStyle = STATUS_COLORS[statusKey] || STATUS_COLORS.pending;
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
            {value}
          </span>
        );
      }
      case 'Link':
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#204CC7] hover:underline">
            <Link2 size={14} />
          </a>
        );
      case 'People':
        return (
          <div className="flex gap-2">
            {value.split(',').map((person, idx) => (
              <div key={idx} className="w-6 h-6 rounded-full bg-[#204CC7] text-white flex items-center justify-center text-xs font-bold">
                {person.trim().charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        );
      default:
        return value;
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────

  return (
    <div className="-mx-8 -mt-6">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-black/5 sticky -top-6 z-30 px-6">
        <div className="flex items-center justify-between py-4">
          {/* Left: Back + Client Name + Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-black/[0.04] rounded-xl transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-black/60" />
            </button>
            <h1 className="text-black/90 text-body font-semibold">{client.name}</h1>
          </div>

          {/* Right: Month Navigator + Filter + Export */}
          <div className="flex items-center gap-2">
            <MonthNavigator
              monthIdx={monthIdx}
              year={year}
              onMonthChange={onMonthChange}
              onYearChange={onYearChange}
              minYear={2024}
            />
            <div className="w-px h-8 bg-black/8" />
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65 transition-all active:scale-[0.98] text-caption font-medium">
              <Share className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="p-6">
        <div className="space-y-5">

            {/* ── Version Bar ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Version Picker */}
                <div className="relative" ref={versionPickerRef}>
                  <button
                    onClick={() => setShowVersionPicker((p) => !p)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all text-caption font-medium ${
                      showVersionPicker
                        ? 'bg-[#EEF1FB] border-[#204CC7]/20 text-[#204CC7]'
                        : 'border-black/8 hover:bg-black/[0.03] hover:border-black/12 text-black/65'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {activeVersion ? activeVersion.label : 'No plans'}
                    {versionsForMonth.length > 1 && (
                      <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-black/[0.06] text-micro font-semibold text-black/50">
                        {versionsForMonth.length}
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-black/35" />
                  </button>

                  {/* Version Dropdown */}
                  {showVersionPicker && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-black/8 rounded-xl shadow-lg z-40 py-2 max-h-80 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-black/[0.06]">
                        <p className="text-micro font-semibold text-black/45 uppercase tracking-wider">
                          {MONTHS[monthIdx]} {year} — {versionsForMonth.length} {versionsForMonth.length === 1 ? 'plan' : 'plans'}
                        </p>
                      </div>

                      {versionsForMonth.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <FileText className="w-8 h-8 text-black/15 mx-auto mb-2" />
                          <p className="text-caption text-black/45 font-medium">No media plans for this month</p>
                        </div>
                      ) : (
                        versionsForMonth.map((version, idx) => {
                          const isActive = version.id === activeVersionId;
                          const isLast = idx === versionsForMonth.length - 1;
                          const isConfirmingThis = confirmingDeleteId === version.id;
                          return (
                            <div key={version.id}>
                              <div
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors group/version cursor-pointer ${
                                  isActive ? 'bg-[#EEF1FB]/60' : 'hover:bg-[#F6F7FF]'
                                }`}
                                onClick={() => {
                                  setActiveVersionId(version.id);
                                  setShowVersionPicker(false);
                                  setConfirmingDeleteId(null);
                                }}
                              >
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-[#204CC7]' : 'bg-black/15'}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-caption font-semibold ${isActive ? 'text-[#204CC7]' : 'text-black/75'}`}>
                                      {version.label}
                                    </span>
                                    {isLast && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-[#00C875]/10 text-[#00C875] text-[10px] font-semibold uppercase">
                                        Latest
                                      </span>
                                    )}
                                    {version.isModified && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-[#FDAB3D]/10 text-[#FDAB3D] text-[10px] font-semibold uppercase">
                                        Edited
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-micro text-black/40 mt-0.5">
                                    Created {new Date(version.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    {version.modifiedAt && (
                                      <> · Modified {new Date(version.modifiedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmingDeleteId(isConfirmingThis ? null : version.id);
                                    }}
                                    className="p-1 rounded-md opacity-0 group-hover/version:opacity-100 hover:bg-red-50 text-black/25 hover:text-red-500 transition-all"
                                    title="Delete plan"
                                  >
                                    <Trash className="w-3.5 h-3.5" />
                                  </button>
                                  {isActive && <Check className="w-4 h-4 text-[#204CC7]" />}
                                </div>
                              </div>

                              {/* Inline delete confirmation */}
                              {isConfirmingThis && (
                                <div className="mx-4 mb-2 mt-1 p-3 rounded-xl bg-red-50/80 border border-red-100 flex items-center justify-between gap-3">
                                  <p className="text-caption text-red-600 font-medium">Delete this plan permanently?</p>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deletePlan(version.id); }}
                                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-caption font-semibold hover:bg-red-600 transition-colors active:scale-[0.97]"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setConfirmingDeleteId(null); }}
                                      className="px-3 py-1.5 rounded-lg border border-black/10 text-caption font-medium text-black/55 hover:bg-white transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      {/* New Plan Actions */}
                      <div className="border-t border-black/[0.06] mt-1 pt-1 px-2">
                        <button
                          onClick={() => { createNewPlan(); setShowVersionPicker(false); }}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-caption font-medium text-black/55 hover:text-[#204CC7] hover:bg-[#EEF1FB]/50 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> New blank plan
                        </button>
                        {activeVersion && (
                          <button
                            onClick={() => { duplicatePlanAsNew(); setShowVersionPicker(false); }}
                            className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-caption font-medium text-black/55 hover:text-[#204CC7] hover:bg-[#EEF1FB]/50 rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" /> Duplicate current plan
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modified Indicator */}
                {activeVersion?.isModified && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FDAB3D]/8 border border-[#FDAB3D]/15">
                    <AlertCircle className="w-3.5 h-3.5 text-[#FDAB3D]" />
                    <span className="text-micro font-medium text-[#FDAB3D]">
                      Modified {activeVersion.modifiedAt
                        ? new Date(activeVersion.modifiedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                        : ''}
                    </span>
                  </div>
                )}

                {/* Past month indicator */}
                {isPast && !activeVersion?.isModified && activeVersion && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/[0.03] border border-black/[0.06]">
                    <Lock className="w-3 h-3 text-black/35" />
                    <span className="text-micro font-medium text-black/40">Historical plan</span>
                  </div>
                )}
              </div>

              {/* Right side: New Plan button */}
              <button
                onClick={createNewPlan}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#204CC7] text-white hover:bg-[#1a3fa8] transition-all active:scale-[0.98] text-caption font-semibold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                New Plan
              </button>
            </div>

            {/* ── Empty State ── */}
            {!activeVersion && (
              <div className="bg-white rounded-xl border border-black/[0.06] py-16 text-center">
                <FileText className="w-12 h-12 text-black/10 mx-auto mb-3" />
                <h3 className="text-black/70 text-body font-semibold mb-1">No media plan for {MONTHS[monthIdx]} {year}</h3>
                <p className="text-caption text-black/45 mb-4">Create a new plan to get started</p>
                <button
                  onClick={createNewPlan}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#204CC7] text-white hover:bg-[#1a3fa8] transition-all active:scale-[0.98] text-caption font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Create Plan
                </button>
              </div>
            )}

            {/* ── Media Plan Groups ── */}
            {activeVersion && activeGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-xl border border-black/[0.06] overflow-hidden"
              >
                {/* Group Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleGroupCollapse(group.id)}
                  style={{ borderLeft: `4px solid ${group.color}` }}
                >
                  <div className="flex items-center gap-2.5">
                    <button className="p-0.5 hover:bg-black/5 rounded transition-colors">
                      {group.collapsed ? (
                        <ChevronRight className="w-4 h-4" style={{ color: group.color }} />
                      ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: group.color }} />
                      )}
                    </button>
                    {editingGroupName === group.id ? (
                      <input
                        autoFocus
                        type="text"
                        defaultValue={group.name}
                        onBlur={(e) => { renameGroup(group.id, e.target.value); setEditingGroupName(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { renameGroup(group.id, (e.target as HTMLInputElement).value); setEditingGroupName(null); } }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-body font-bold bg-transparent border-b-2 outline-none px-0.5"
                        style={{ color: group.color, borderColor: group.color }}
                      />
                    ) : (
                      <h2
                        className="text-body font-bold cursor-text"
                        style={{ color: group.color }}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingGroupName(group.id); }}
                      >
                        {group.name}
                      </h2>
                    )}
                    <span className="text-micro text-black/40 font-medium">
                      {group.rows.filter((r) => !r.isTotal).length} {group.rows.filter((r) => !r.isTotal).length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Group Content */}
                {!group.collapsed && (
                  <div className="border-t border-black/[0.04]">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-black/[0.06]" style={{ borderLeft: `4px solid ${group.color}` }}>
                            <th className="w-10" />
                            {group.columns.map((col) => (
                              <th key={col.id} className="py-3 px-4 text-left relative group/col">
                                <div className="flex items-center gap-1.5">
                                  {editingColumnHeader?.groupId === group.id && editingColumnHeader?.colId === col.id ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      defaultValue={col.name}
                                      onBlur={(e) => { renameColumn(group.id, col.id, e.target.value || col.name); setEditingColumnHeader(null); }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') { renameColumn(group.id, col.id, (e.target as HTMLInputElement).value || col.name); setEditingColumnHeader(null); }
                                        if (e.key === 'Escape') setEditingColumnHeader(null);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-black/70 text-micro font-semibold uppercase tracking-wider bg-transparent border-b-2 border-[#204CC7]/40 outline-none px-0.5 py-0 w-full"
                                    />
                                  ) : (
                                    <span
                                      className="text-black/50 text-micro font-semibold uppercase tracking-wider cursor-default"
                                      onDoubleClick={(e) => {
                                        if (isEditable) { e.stopPropagation(); setEditingColumnHeader({ groupId: group.id, colId: col.id }); }
                                      }}
                                    >
                                      {col.name}
                                    </span>
                                  )}
                                  {isEditable && !editingColumnHeader?.colId && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setColumnMenuOpen({ groupId: group.id, colId: col.id }); }}
                                      className="opacity-0 group-hover/col:opacity-100 transition-opacity p-0.5 hover:bg-black/[0.06] rounded"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5 text-black/40" />
                                    </button>
                                  )}
                                </div>

                                {/* Column Menu */}
                                {columnMenuOpen?.groupId === group.id && columnMenuOpen?.colId === col.id && (
                                  <div className="absolute top-full right-0 mt-1 bg-white border border-black/8 rounded-xl shadow-lg z-20 w-48 py-1">
                                    <button
                                      onClick={() => {
                                        const newName = prompt('Column name:', col.name);
                                        if (newName) renameColumn(group.id, col.id, newName);
                                      }}
                                      className="w-full text-left px-4 py-2.5 text-caption font-medium text-black/70 hover:bg-[#F6F7FF] hover:text-[#204CC7] flex items-center gap-2.5 transition-colors"
                                    >
                                      <Pencil size={14} /> Rename
                                    </button>
                                    <button
                                      onClick={() => duplicateColumn(group.id, col.id)}
                                      className="w-full text-left px-4 py-2.5 text-caption font-medium text-black/70 hover:bg-[#F6F7FF] hover:text-[#204CC7] flex items-center gap-2.5 transition-colors"
                                    >
                                      <Copy size={14} /> Duplicate
                                    </button>
                                    <div className="my-1 border-t border-black/[0.06]" />
                                    <button
                                      onClick={() => deleteColumn(group.id, col.id)}
                                      className="w-full text-left px-4 py-2.5 text-caption font-medium text-red-500 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                                    >
                                      <Trash size={14} /> Delete
                                    </button>
                                  </div>
                                )}
                              </th>
                            ))}
                            {isEditable && (
                              <th className="py-3 px-3 w-10">
                                <button
                                  onClick={() => setAddColumnGroupId(group.id)}
                                  className="p-1 hover:bg-black/[0.06] rounded-lg transition-colors"
                                  title="Add column"
                                >
                                  <Plus className="w-3.5 h-3.5 text-black/30" />
                                </button>
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => (
                            <tr
                              key={row.id}
                              className={`border-b border-black/[0.04] transition-colors group/row ${
                                row.isTotal ? 'bg-[#EEF1FB]/30' : 'hover:bg-black/[0.015]'
                              }`}
                              style={{ borderLeft: `4px solid ${row.isTotal ? group.color : 'transparent'}` }}
                            >
                              <td className="w-10 px-2 py-3.5 text-center">
                                {!row.isTotal && isEditable && (
                                  <div className="opacity-0 group-hover/row:opacity-100 transition-opacity cursor-grab">
                                    <GripVertical className="w-4 h-4 text-black/20" />
                                  </div>
                                )}
                              </td>
                              {group.columns.map((col, colIdx) => (
                                <td
                                  key={col.id}
                                  className={`py-3.5 px-4 text-caption border-r border-black/[0.04] last:border-r-0 transition-colors ${
                                    isEditable ? 'cursor-pointer' : ''
                                  } ${
                                    editingCell?.groupId === group.id && editingCell?.rowId === row.id && editingCell?.colId === col.id
                                      ? 'bg-[#EEF1FB]/50'
                                      : isEditable ? 'hover:bg-[#F6F7FF]/50' : ''
                                  } ${row.isTotal && colIdx === 0 ? 'font-semibold' : ''}`}
                                  style={row.isTotal ? { color: group.color, fontWeight: 600 } : {}}
                                  onClick={() => {
                                    if (isEditable) {
                                      if (col.type === 'Status') {
                                        const currentVal = row.cells[col.id] || 'Pending';
                                        updateCell(group.id, row.id, col.id, cycleStatus(currentVal));
                                      } else {
                                        setEditingCell({ groupId: group.id, rowId: row.id, colId: col.id });
                                      }
                                    }
                                  }}
                                >
                                  {editingCell?.groupId === group.id && editingCell?.rowId === row.id && editingCell?.colId === col.id ? (
                                    <input
                                      autoFocus
                                      type={col.type === 'Number' ? 'text' : 'text'}
                                      value={row.cells[col.id] || ''}
                                      onChange={(e) => updateCell(group.id, row.id, col.id, e.target.value)}
                                      onBlur={() => setEditingCell(null)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null); }}
                                      className="w-full px-2 py-0.5 border border-[#204CC7]/40 rounded-lg outline-none text-caption bg-white focus:ring-1 focus:ring-[#204CC7]/20"
                                    />
                                  ) : (
                                    <span className={row.isTotal ? '' : 'text-black/70'}>
                                      {renderCellContent(col, row.cells[col.id] || '')}
                                    </span>
                                  )}
                                </td>
                              ))}
                              {isEditable && (
                                <td className="py-3.5 px-2 w-10">
                                  {!row.isTotal && (
                                    <button
                                      onClick={() => deleteRow(group.id, row.id)}
                                      className="p-1 opacity-0 group-hover/row:opacity-100 hover:bg-red-50 rounded-lg transition-all text-red-400 hover:text-red-500"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Row */}
                    {isEditable && (
                      <div className="px-4 py-2.5 border-t border-black/[0.04]" style={{ borderLeft: '4px solid transparent' }}>
                        <button
                          onClick={() => addRow(group.id)}
                          className="flex items-center gap-1.5 px-2 py-1 text-caption font-medium text-black/40 hover:text-[#204CC7] hover:bg-[#EEF1FB]/50 rounded-lg transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add row
                        </button>
                      </div>
                    )}

                    {/* Add Column Popover */}
                    {addColumnGroupId === group.id && (
                      <div className="px-5 py-4 bg-black/[0.015] border-t border-black/[0.04]">
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-micro font-semibold text-black/50 uppercase tracking-wider mb-1.5">Column Name</label>
                            <input
                              autoFocus
                              type="text"
                              value={newColumnName}
                              onChange={(e) => setNewColumnName(e.target.value)}
                              placeholder="e.g. ROI, Status, Owner"
                              className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-[#204CC7]/30 focus:ring-1 focus:ring-[#204CC7]/10 text-caption transition-all"
                              onKeyDown={(e) => { if (e.key === 'Enter') addColumn(group.id); }}
                            />
                          </div>
                          <div className="w-36">
                            <label className="block text-micro font-semibold text-black/50 uppercase tracking-wider mb-1.5">Type</label>
                            <select
                              value={newColumnType}
                              onChange={(e) => setNewColumnType(e.target.value as Column['type'])}
                              className="w-full px-3 py-2 border border-black/10 rounded-xl outline-none focus:border-[#204CC7]/30 text-caption appearance-none bg-white cursor-pointer"
                            >
                              <option value="Text">Text</option>
                              <option value="Number">Number</option>
                              <option value="Status">Status</option>
                              <option value="Date">Date</option>
                              <option value="People">People</option>
                              <option value="Link">Link</option>
                            </select>
                          </div>
                          <button
                            onClick={() => addColumn(group.id)}
                            className="px-4 py-2 bg-[#204CC7] text-white rounded-xl text-caption font-semibold hover:bg-[#1a3fa8] transition-colors active:scale-[0.98]"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setAddColumnGroupId(null)}
                            className="px-4 py-2 border border-black/10 rounded-xl text-caption font-medium text-black/60 hover:bg-black/[0.03] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add New Group */}
            {activeVersion && isEditable && (
              <button
                onClick={addNewGroup}
                className="w-full py-4 border-2 border-dashed border-black/10 rounded-xl hover:border-[#5B7FD6]/40 hover:bg-[#EEF1FB]/50 transition-all flex items-center justify-center gap-2 text-body font-medium text-black/50 hover:text-[#204CC7]"
              >
                <Plus size={18} /> Add new group
              </button>
            )}
          </div>
      </div>
    </div>
  );
};
