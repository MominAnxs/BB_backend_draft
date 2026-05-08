'use client';

/**
 * King & Queen — A&T annual compliance roll-up.
 *
 * One row per client across every yearly compliance touchpoint
 * (GSTR-9 / 9C, audit, ITR, advance tax, ROC, MIS, PT). The HOD uses
 * this view to scan the entire book in a single grid, switch a status
 * inline as work progresses, and reorder the columns so whichever
 * compliance is in season this week sits to the left of the eye.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Client Name │ Team │ GSTR-9 │ GSTR-9C │ Auditor │ … (scroll) │
 *   │ ◀── locked ──▶│        ◀── horizontal scroll ──▶            │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Mechanics:
 *   • First two columns (Client, Team) are sticky-left so the row
 *     identity is always visible while the rest scrolls.
 *   • Every status cell is a click-to-edit pill backed by a portal
 *     popover — no row-level edit mode, no separate save action.
 *   • Reorder by dragging any non-locked header. A drop indicator
 *     ring shows where the column will land. "Reset columns" appears
 *     in the top bar the moment the order diverges from the default.
 *   • All state is in-memory; the data shape mirrors what the schema
 *     would carry, so wiring this up to a real API later is a
 *     drop-in swap of the mock seed for a fetch.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, GripVertical, X, RotateCcw } from 'lucide-react';
import { TeamPopover, teamFor, TeamMember } from './AccountsTaxation';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type WIPStatus  = 'N/A' | 'Done' | 'Pending' | 'WIP';
type GSTRStatus = 'Applicable' | 'N/A' | 'Sales Email Shared' | 'Data shared with Auditor' | 'Done';
type Auditor    = 'External' | 'Yogesh';
type RegType    = 'Private LTD' | 'LLP' | 'Partnerships' | 'HUF' | 'Trust' | 'Proprietorship' | 'N/A';
type ITRFiling  = 'Client Consultant' | 'In-house' | 'NA';

interface KQRow {
  id: string;
  /** Specific legal entity / business filing this annual compliance.
   *  Mirrors the Recurring Checklist's primary identifier. */
  businessName: string;
  /** Parent client / group. Surfaces as a small caption beneath the
   *  business name when the two strings differ (multi-business
   *  clients); single-business clients render only the businessName
   *  to keep the row visually clean. */
  clientName: string;
  team: TeamMember[];
  gstr9: GSTRStatus;
  gstr9c: GSTRStatus;
  auditor: Auditor;
  regType: RegType;
  itrFiling: ITRFiling;
  ptReturn: WIPStatus;
  dataStatus: WIPStatus;
  auditItr: WIPStatus;
  advanceTax: WIPStatus;
  mis: WIPStatus;
  roc: WIPStatus;
}

type ColumnId =
  | 'name' | 'team'
  | 'gstr9' | 'gstr9c' | 'auditor' | 'regType' | 'itrFiling'
  | 'ptReturn' | 'dataStatus' | 'auditItr' | 'advanceTax' | 'mis' | 'roc';

interface ColumnDef {
  id: ColumnId;
  label: string;
  width: number;
  /** Locked columns cannot be reordered and stick to the left. */
  locked?: boolean;
  /** Discrete options for click-to-edit status cells. Omitted on the
   *  two locked columns (Client name / Team) since they're not
   *  enum-typed cells. */
  options?: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

const WIP_OPTIONS:     readonly WIPStatus[]  = ['N/A', 'Done', 'Pending', 'WIP'];
const GSTR_OPTIONS:    readonly GSTRStatus[] = ['Applicable', 'N/A', 'Sales Email Shared', 'Data shared with Auditor', 'Done'];
const AUDITOR_OPTIONS: readonly Auditor[]    = ['External', 'Yogesh'];
const REG_OPTIONS:     readonly RegType[]    = ['Private LTD', 'LLP', 'Partnerships', 'HUF', 'Trust', 'Proprietorship', 'N/A'];
const ITR_OPTIONS:     readonly ITRFiling[]  = ['Client Consultant', 'In-house', 'NA'];

// ─────────────────────────────────────────────────────────────────────────────
// COLUMNS
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS: Record<ColumnId, ColumnDef> = {
  name:       { id: 'name',       label: 'Client',              width: 240, locked: true },
  team:       { id: 'team',       label: 'Team',                width: 180, locked: true },
  gstr9:      { id: 'gstr9',      label: 'GSTR-9',              width: 240, options: GSTR_OPTIONS },
  gstr9c:     { id: 'gstr9c',     label: 'GSTR-9C',             width: 240, options: GSTR_OPTIONS },
  auditor:    { id: 'auditor',    label: 'Auditor',             width: 140, options: AUDITOR_OPTIONS },
  regType:    { id: 'regType',    label: 'Registration Type',   width: 180, options: REG_OPTIONS },
  itrFiling:  { id: 'itrFiling',  label: 'ITR Filing',          width: 200, options: ITR_OPTIONS },
  ptReturn:   { id: 'ptReturn',   label: 'PT Return',           width: 140, options: WIP_OPTIONS },
  dataStatus: { id: 'dataStatus', label: 'Data Status',         width: 140, options: WIP_OPTIONS },
  auditItr:   { id: 'auditItr',   label: 'Audit & ITR Status',  width: 200, options: WIP_OPTIONS },
  advanceTax: { id: 'advanceTax', label: 'Advance Tax',         width: 140, options: WIP_OPTIONS },
  mis:        { id: 'mis',        label: 'MIS',                 width: 140, options: WIP_OPTIONS },
  roc:        { id: 'roc',        label: 'ROC Compliance',      width: 180, options: WIP_OPTIONS },
};

const DEFAULT_ORDER: ColumnId[] = [
  'name', 'team',
  'gstr9', 'gstr9c', 'auditor', 'regType', 'itrFiling',
  'ptReturn', 'dataStatus', 'auditItr', 'advanceTax', 'mis', 'roc',
];

const LOCKED_COUNT = DEFAULT_ORDER.findIndex(id => !COLUMNS[id].locked);
//                                                  └─ first non-locked index ─ everything before this is sticky-left

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TONE
// ─────────────────────────────────────────────────────────────────────────────

interface Tone { bg: string; text: string; border: string }

function statusTone(value: string): Tone {
  switch (value) {
    case 'Done':
    case 'In-house':
      return { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-100' };
    case 'Pending':
      return { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-100'   };
    case 'WIP':
      return { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-100'    };
    case 'Applicable':
      return { bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-100'  };
    case 'Sales Email Shared':
      return { bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-100'  };
    case 'Data shared with Auditor':
      return { bg: 'bg-cyan-50',     text: 'text-cyan-700',    border: 'border-cyan-100'    };
    case 'External':
    case 'Client Consultant':
      return { bg: 'bg-violet-50',   text: 'text-violet-700',  border: 'border-violet-100'  };
    case 'Yogesh':
      return { bg: 'bg-[#EEF1FB]',   text: 'text-[#204CC7]',   border: 'border-[#D6DEFA]'   };
    case 'N/A':
    case 'NA':
      return { bg: 'bg-slate-50',    text: 'text-slate-500',   border: 'border-slate-100'   };
    // Registration types — neutral rock-solid grey chip family
    case 'Private LTD': case 'LLP': case 'Partnerships':
    case 'HUF': case 'Trust': case 'Proprietorship':
      return { bg: 'bg-black/[0.04]', text: 'text-black/75', border: 'border-black/[0.08]' };
    default:
      return { bg: 'bg-black/[0.04]', text: 'text-black/70', border: 'border-black/[0.08]' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA — teams pulled from the shared TEAM_POOL via teamFor() so
// roster, roles, and avatar tones stay 1:1 with the rest of A&T.
// ─────────────────────────────────────────────────────────────────────────────

const SEED_ROWS: KQRow[] = [
  // ── Multi-business groups: split into per-business rows so the
  //    Client/Business hierarchy reads like the Recurring Checklist.
  //    Each business under the same group gets its own annual filing
  //    status (GSTR-9, ITR, etc.) since these compliances are
  //    statutorily filed per legal entity. ──
  { id: 'kq01', businessName: 'Patel Constructions',  clientName: 'Patel Group',          team: teamFor(['ZS', 'RD', 'SP', 'VS']), gstr9: 'Done',                       gstr9c: 'Done',                       auditor: 'Yogesh',   regType: 'Private LTD',     itrFiling: 'In-house',          ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'Done',    advanceTax: 'WIP',     mis: 'Pending', roc: 'Done'    },
  { id: 'kq02', businessName: 'Patel Realty',         clientName: 'Patel Group',          team: teamFor(['ZS', 'RD', 'SP', 'VS']), gstr9: 'Done',                       gstr9c: 'Done',                       auditor: 'Yogesh',   regType: 'Private LTD',     itrFiling: 'In-house',          ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'Done',    advanceTax: 'Done',    mis: 'Done',    roc: 'Done'    },
  { id: 'kq03', businessName: 'Patel Trading Co',     clientName: 'Patel Group',          team: teamFor(['ZS', 'RD', 'SP', 'VS']), gstr9: 'Data shared with Auditor',   gstr9c: 'Sales Email Shared',         auditor: 'Yogesh',   regType: 'Partnerships',    itrFiling: 'In-house',          ptReturn: 'WIP',     dataStatus: 'Done',    auditItr: 'WIP',     advanceTax: 'Pending', mis: 'WIP',     roc: 'Pending' },
  { id: 'kq04', businessName: 'Bilawala & Co (Heena)',clientName: 'Bilawala Group',       team: teamFor(['IQ', 'NA', 'DJ', 'RG']), gstr9: 'Data shared with Auditor',   gstr9c: 'Sales Email Shared',         auditor: 'External', regType: 'Partnerships',    itrFiling: 'Client Consultant', ptReturn: 'Done',    dataStatus: 'WIP',     auditItr: 'Pending', advanceTax: 'Done',    mis: 'Done',    roc: 'Pending' },
  { id: 'kq05', businessName: 'Bilawala & Co (Ayaz)', clientName: 'Bilawala Group',       team: teamFor(['IQ', 'NA', 'DJ', 'RG']), gstr9: 'Sales Email Shared',         gstr9c: 'Applicable',                 auditor: 'External', regType: 'Partnerships',    itrFiling: 'Client Consultant', ptReturn: 'Pending', dataStatus: 'WIP',     auditItr: 'WIP',     advanceTax: 'Pending', mis: 'WIP',     roc: 'WIP'     },
  { id: 'kq06', businessName: 'FRR (BLOGS)',          clientName: 'FRR Group',            team: teamFor(['ZS', 'RD', 'AK', 'PJ']), gstr9: 'Sales Email Shared',         gstr9c: 'Applicable',                 auditor: 'Yogesh',   regType: 'Private LTD',     itrFiling: 'In-house',          ptReturn: 'WIP',     dataStatus: 'Pending', auditItr: 'WIP',     advanceTax: 'Pending', mis: 'WIP',     roc: 'WIP'     },
  { id: 'kq07', businessName: 'FRR (JAY + ADI)',      clientName: 'FRR Group',            team: teamFor(['ZS', 'RD', 'AK', 'PJ']), gstr9: 'Applicable',                 gstr9c: 'N/A',                        auditor: 'Yogesh',   regType: 'Private LTD',     itrFiling: 'In-house',          ptReturn: 'Pending', dataStatus: 'Pending', auditItr: 'Pending', advanceTax: 'WIP',     mis: 'Pending', roc: 'Pending' },
  // ── Single-business clients — businessName equals clientName, so
  //    the cell renderer suppresses the caption automatically. ──
  { id: 'kq08', businessName: 'Aryan Pharmaceuticals',clientName: 'Aryan Pharmaceuticals',team: teamFor(['IQ', 'NA', 'AV']),       gstr9: 'Done',                       gstr9c: 'Done',                       auditor: 'Yogesh',   regType: 'Private LTD',     itrFiling: 'In-house',          ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'Done',    advanceTax: 'Done',    mis: 'Done',    roc: 'Done'    },
  { id: 'kq09', businessName: 'Sahara Constructions', clientName: 'Sahara Constructions', team: teamFor(['ZS', 'SP', 'VS']),       gstr9: 'Applicable',                 gstr9c: 'N/A',                        auditor: 'External', regType: 'Partnerships',    itrFiling: 'Client Consultant', ptReturn: 'Pending', dataStatus: 'WIP',     auditItr: 'Pending', advanceTax: 'WIP',     mis: 'Pending', roc: 'N/A'     },
  { id: 'kq10', businessName: 'Atlas Capital',        clientName: 'Atlas Capital',        team: teamFor(['RD', 'AK', 'RS']),       gstr9: 'Data shared with Auditor',   gstr9c: 'Data shared with Auditor',   auditor: 'External', regType: 'Private LTD',     itrFiling: 'Client Consultant', ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'WIP',     advanceTax: 'Done',    mis: 'Done',    roc: 'WIP'     },
  { id: 'kq11', businessName: 'TechCorp India',       clientName: 'TechCorp India',       team: teamFor(['IQ', 'NA', 'DJ', 'PJ']), gstr9: 'Done',                       gstr9c: 'Done',                       auditor: 'Yogesh',   regType: 'Private LTD',     itrFiling: 'In-house',          ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'Done',    advanceTax: 'WIP',     mis: 'Done',    roc: 'Done'    },
  { id: 'kq12', businessName: 'Green Valley Ent.',    clientName: 'Green Valley Ent.',    team: teamFor(['RD', 'SP', 'VS', 'RG']), gstr9: 'Sales Email Shared',         gstr9c: 'Applicable',                 auditor: 'External', regType: 'Proprietorship',  itrFiling: 'Client Consultant', ptReturn: 'WIP',     dataStatus: 'Pending', auditItr: 'Pending', advanceTax: 'Pending', mis: 'WIP',     roc: 'N/A'     },
  { id: 'kq13', businessName: 'CEO Rules',            clientName: 'CEO Rules',            team: teamFor(['IQ', 'AK', 'AV']),       gstr9: 'Applicable',                 gstr9c: 'N/A',                        auditor: 'Yogesh',   regType: 'LLP',             itrFiling: 'In-house',          ptReturn: 'Pending', dataStatus: 'WIP',     auditItr: 'WIP',     advanceTax: 'WIP',     mis: 'Pending', roc: 'WIP'     },
  { id: 'kq14', businessName: 'Sanghvi Holdings',     clientName: 'Sanghvi Holdings',     team: teamFor(['ZS', 'RD', 'RS', 'PJ', 'DJ']), gstr9: 'Done',                 gstr9c: 'Done',                       auditor: 'External', regType: 'Trust',           itrFiling: 'Client Consultant', ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'Done',    advanceTax: 'Done',    mis: 'Done',    roc: 'Done'    },
  { id: 'kq15', businessName: 'Konark Foods',         clientName: 'Konark Foods',         team: teamFor(['IQ', 'NA', 'RG']),       gstr9: 'N/A',                        gstr9c: 'N/A',                        auditor: 'External', regType: 'HUF',             itrFiling: 'NA',                ptReturn: 'N/A',     dataStatus: 'Pending', auditItr: 'N/A',     advanceTax: 'WIP',     mis: 'Pending', roc: 'N/A'     },
  { id: 'kq16', businessName: 'Westwood Holdings',    clientName: 'Westwood Holdings',    team: teamFor(['ZS', 'AK', 'SP']),       gstr9: 'Data shared with Auditor',   gstr9c: 'Sales Email Shared',         auditor: 'Yogesh',   regType: 'Private LTD',     itrFiling: 'In-house',          ptReturn: 'WIP',     dataStatus: 'WIP',     auditItr: 'Pending', advanceTax: 'Pending', mis: 'WIP',     roc: 'Pending' },
  { id: 'kq17', businessName: 'Marathon Industries',  clientName: 'Marathon Industries',  team: teamFor(['RD', 'VS', 'AV', 'RG']), gstr9: 'Applicable',                 gstr9c: 'Applicable',                 auditor: 'External', regType: 'Partnerships',    itrFiling: 'Client Consultant', ptReturn: 'Pending', dataStatus: 'Pending', auditItr: 'WIP',     advanceTax: 'WIP',     mis: 'Pending', roc: 'WIP'     },
  { id: 'kq18', businessName: 'Mehul Family Trust',   clientName: 'Mehul Family Trust',   team: teamFor(['IQ', 'NA']),             gstr9: 'N/A',                        gstr9c: 'N/A',                        auditor: 'External', regType: 'Trust',           itrFiling: 'Client Consultant', ptReturn: 'N/A',     dataStatus: 'Done',    auditItr: 'Done',    advanceTax: 'Done',    mis: 'N/A',     roc: 'N/A'     },
  { id: 'kq19', businessName: 'Vijay Family Office',  clientName: 'Vijay Family Office',  team: teamFor(['ZS', 'RS', 'DJ', 'PJ']), gstr9: 'Done',                       gstr9c: 'Done',                       auditor: 'Yogesh',   regType: 'HUF',             itrFiling: 'In-house',          ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'Done',    advanceTax: 'Done',    mis: 'Done',    roc: 'Done'    },
  { id: 'kq20', businessName: 'Rajan Group',          clientName: 'Rajan Group',          team: teamFor(['IQ', 'AK', 'SP', 'RG']), gstr9: 'Sales Email Shared',         gstr9c: 'Applicable',                 auditor: 'External', regType: 'Private LTD',     itrFiling: 'Client Consultant', ptReturn: 'WIP',     dataStatus: 'WIP',     auditItr: 'WIP',     advanceTax: 'Pending', mis: 'WIP',     roc: 'WIP'     },
  { id: 'kq21', businessName: 'BlueWave Logistics',   clientName: 'BlueWave Logistics',   team: teamFor(['RD', 'VS', 'AV']),       gstr9: 'Done',                       gstr9c: 'Applicable',                 auditor: 'Yogesh',   regType: 'LLP',             itrFiling: 'In-house',          ptReturn: 'Done',    dataStatus: 'Done',    auditItr: 'WIP',     advanceTax: 'Done',    mis: 'Done',    roc: 'Done'    },
  { id: 'kq22', businessName: 'Greenfield Exports',   clientName: 'Greenfield Exports',   team: teamFor(['IQ', 'NA', 'PJ']),       gstr9: 'Data shared with Auditor',   gstr9c: 'Data shared with Auditor',   auditor: 'External', regType: 'Proprietorship',  itrFiling: 'Client Consultant', ptReturn: 'Pending', dataStatus: 'Done',    auditItr: 'Pending', advanceTax: 'WIP',     mis: 'Pending', roc: 'Pending' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function KingAndQueen() {
  const [rows, setRows] = useState<KQRow[]>(SEED_ROWS);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_ORDER);
  const [search, setSearch] = useState('');
  const [draggedCol, setDraggedCol] = useState<ColumnId | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnId | null>(null);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    // Search across both business + client so a query like "patel"
    // matches every business under Patel Group, not just the rows
    // whose primary label happens to contain "patel".
    return rows.filter(r =>
      r.businessName.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const updateCell = useCallback((rowId: string, colId: ColumnId, value: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colId]: value } as KQRow : r));
  }, []);

  // Drag-and-drop reorder. We refuse any move that would touch the
  // locked range (first two slots) so Client + Team always sit at
  // the left edge of the table.
  const reorderColumn = useCallback((from: ColumnId, to: ColumnId) => {
    setColumnOrder(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(from);
      const toIdx = next.indexOf(to);
      if (fromIdx < LOCKED_COUNT || toIdx < LOCKED_COUNT) return prev;
      if (fromIdx === toIdx) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      return next;
    });
  }, []);

  const resetOrder = () => setColumnOrder(DEFAULT_ORDER);
  const isReordered = useMemo(
    () => columnOrder.some((id, i) => id !== DEFAULT_ORDER[i]),
    [columnOrder]
  );

  // Sticky-left offsets — accumulate widths of preceding locked
  // columns so each locked cell knows its own `left:` value.
  const stickyOffsets = useMemo(() => {
    const offsets: Partial<Record<ColumnId, number>> = {};
    let acc = 0;
    for (const id of columnOrder) {
      if (!COLUMNS[id].locked) break;
      offsets[id] = acc;
      acc += COLUMNS[id].width;
    }
    return offsets;
  }, [columnOrder]);

  const totalWidth = useMemo(
    () => columnOrder.reduce((s, id) => s + COLUMNS[id].width, 0),
    [columnOrder]
  );

  return (
    <div>
      {/* ── Top bar — mirrors the A&T Overview / SubTabTopBar chrome:
          `text-body font-semibold` title + `text-caption font-normal`
          subtitle, `py-3` row, sticky white strip with `-mx-8 -mt-6
          px-8 mb-6` bleed (the workspace content area sits inside
          `px-8` so the bleed math uses 8 not 6). Body actions stay
          on the right. ── */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-8 -mt-6 px-8 mb-6">
        <div className="flex items-center justify-between py-3 gap-4 flex-wrap">
          <div className="shrink-0">
            <p className="text-black/90 text-body font-semibold">King &amp; Queen</p>
            <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">
              Annual compliance roll-up
              <span className="text-black/30 mx-1.5">·</span>
              {filteredRows.length} {filteredRows.length === 1 ? 'client' : 'clients'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-[260px] h-9">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/45 pointer-events-none" aria-hidden="true" />
              <label htmlFor="kq-search" className="sr-only">Search clients</label>
              <input
                id="kq-search"
                type="text"
                placeholder="Search clients…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-full pl-7 pr-7 rounded-md border border-black/10 bg-white text-caption placeholder:text-black/40 focus:outline-none focus:border-[#204CC7]/30 focus:ring-2 focus:ring-[#204CC7]/20 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3 text-black/45 hover:text-black/70" />
                </button>
              )}
            </div>

            {isReordered && (
              <button
                type="button"
                onClick={resetOrder}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-black/10 hover:bg-black/[0.03] text-caption font-medium text-black/70 transition-colors"
                aria-label="Reset column order to default"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reset columns
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table — parent SuperAdminHome wrapper already supplies
          `px-8 pt-6 pb-6`, and the top bar's `mb-6` covers the gap
          to the table; this container only carries the rounded-card
          chrome around the table itself. ── */}
      <div>
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-x-auto">
          <table
            className="border-collapse text-left"
            style={{ minWidth: totalWidth, width: totalWidth }}
            role="grid"
            aria-label="Annual compliance roll-up"
          >
            <thead>
              <tr className="bg-[#FAFBFC] border-b border-black/[0.06]">
                {columnOrder.map((id) => {
                  const col = COLUMNS[id];
                  const isLocked = !!col.locked;
                  const isLastLocked = isLocked && columnOrder[LOCKED_COUNT - 1] === id;
                  const isDraggable = !isLocked;
                  const isDragOver = dropTarget === id && draggedCol && draggedCol !== id;
                  const isSelf = draggedCol === id;

                  return (
                    <th
                      key={id}
                      scope="col"
                      draggable={isDraggable}
                      onDragStart={isDraggable ? (e) => {
                        setDraggedCol(id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', id);
                      } : undefined}
                      onDragOver={isDraggable ? (e) => {
                        if (!draggedCol || draggedCol === id) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDropTarget(id);
                      } : undefined}
                      onDragLeave={isDraggable ? () => {
                        setDropTarget(prev => (prev === id ? null : prev));
                      } : undefined}
                      onDrop={isDraggable ? (e) => {
                        e.preventDefault();
                        if (draggedCol && draggedCol !== id) reorderColumn(draggedCol, id);
                        setDraggedCol(null);
                        setDropTarget(null);
                      } : undefined}
                      onDragEnd={() => {
                        setDraggedCol(null);
                        setDropTarget(null);
                      }}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        ...(isLocked
                          ? { position: 'sticky', left: stickyOffsets[id], zIndex: 4 }
                          : {}),
                      }}
                      className={[
                        'px-4 py-3 text-caption font-semibold text-black/55 uppercase tracking-wide whitespace-nowrap select-none',
                        'bg-[#FAFBFC]',
                        isLastLocked ? 'border-r border-black/[0.06]' : '',
                        isDraggable ? 'cursor-grab active:cursor-grabbing' : '',
                        isSelf ? 'opacity-40' : '',
                        isDragOver ? 'ring-2 ring-inset ring-[#204CC7]/40 bg-[#EEF1FB]' : '',
                      ].filter(Boolean).join(' ')}
                      aria-label={isDraggable ? `${col.label} — drag to reorder` : col.label}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {isDraggable && <GripVertical className="w-3 h-3 text-black/30" aria-hidden="true" />}
                        {col.label}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.id}
                  className="group border-b border-black/[0.04] last:border-b-0 hover:bg-[#F9FAFC]"
                >
                  {columnOrder.map((id) => {
                    const col = COLUMNS[id];
                    const isLocked = !!col.locked;
                    const isLastLocked = isLocked && columnOrder[LOCKED_COUNT - 1] === id;

                    return (
                      <td
                        key={id}
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          ...(isLocked
                            ? { position: 'sticky', left: stickyOffsets[id], zIndex: 1 }
                            : {}),
                        }}
                        className={[
                          'px-4 py-3 align-middle',
                          // Sticky cells need an explicit background so
                          // the scrolling cells don't bleed through.
                          // The `group-hover` swap matches the row's
                          // hover state.
                          isLocked ? 'bg-white group-hover:bg-[#F9FAFC]' : '',
                          isLastLocked ? 'border-r border-black/[0.06]' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <CellRenderer row={row} col={col} onChange={(v) => updateCell(row.id, id, v)} />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columnOrder.length}
                    className="px-4 py-16 text-center text-caption text-black/55"
                  >
                    No clients match <span className="font-medium text-black/75">“{search}”</span>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CELL — dispatches to the right inner renderer based on column id
// ─────────────────────────────────────────────────────────────────────────────

function CellRenderer({ row, col, onChange }: { row: KQRow; col: ColumnDef; onChange: (value: string) => void }) {
  if (col.id === 'name') {
    // Same Client/Business hierarchy the Recurring Checklist table
    // uses — business name as the primary label, parent client name
    // as a quiet caption underneath whenever the two strings differ
    // (i.e. multi-business clients). Single-business clients
    // suppress the duplicate caption to keep the row visually clean.
    const showClientCaption = row.businessName !== row.clientName;
    return (
      <div className="min-w-0">
        <div className="text-body font-medium text-black/85 leading-tight truncate">{row.businessName}</div>
        {showClientCaption && (
          <div className="text-caption text-black/45 mt-0.5 leading-tight truncate">{row.clientName}</div>
        )}
      </div>
    );
  }
  if (col.id === 'team') {
    // Same TeamPopover the Deliverables table uses — stacked avatars
    // with a `+N` overflow chip and the hover/tap roster popover.
    return <TeamPopover team={row.team} />;
  }
  // All remaining columns are enum-typed status cells.
  const value = (row as unknown as Record<string, string>)[col.id];
  return (
    <StatusPill value={value} options={col.options ?? []} onChange={onChange} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PILL — click-to-edit with portal popover
// ─────────────────────────────────────────────────────────────────────────────

function StatusPill({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    // Auto-flip up if there's not enough room below.
    const menuHeight = options.length * 32 + 8;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow < menuHeight + 12 && r.top > menuHeight + 12
      ? r.top - menuHeight - 4
      : r.bottom + 4;
    setPos({ top, left: r.left });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    place();
    const onScroll = () => place();
    const onResize = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  const tone = statusTone(value);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 max-w-full px-2.5 h-7 rounded-md border text-caption font-medium transition-colors ${tone.bg} ${tone.text} ${tone.border} hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-60" aria-hidden="true" />
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          className="fixed z-[10000] bg-white rounded-md border border-black/[0.08] shadow-xl py-1 min-w-[200px] max-w-[280px]"
          style={{ top: pos.top, left: pos.left }}
        >
          {options.map(opt => {
            const t = statusTone(opt);
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-black/[0.03] transition-colors ${isSelected ? 'bg-[#EEF1FB]/40' : ''}`}
              >
                <span className={`inline-flex items-center px-2 h-5 rounded text-[11px] font-semibold border ${t.bg} ${t.text} ${t.border}`}>
                  {opt}
                </span>
                {isSelected && (
                  <span className="ml-auto text-[#204CC7] text-caption font-semibold">✓</span>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
