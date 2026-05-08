'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, UserMinus, Briefcase, Target, ClipboardList,
  AlertTriangle, Activity, ArrowUp, ArrowDown, Calendar,
  ChevronDown, ChevronRight, X,
  Filter, ShieldAlert,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis,
  Tooltip, Cell, ReferenceLine,
} from 'recharts';
import {
  useResourceRequests,
  type RequestStatus,
  type ResourceRequest,
} from './adminland/resource-requests-store';

// ══════════════════════════════════════════════════════════════════════════════
// Employees Overview — parity refactor with the Reports/Home & Customers pages.
//
// Design pattern (mirrors CustomersOverview.tsx 1:1):
//   1. The page surfaces 8 metric cards in a 4×2 grid, grouped under two
//      labelled sections — SNAPSHOT (workforce state) and ACTION QUEUE (work).
//   2. Each card opens a 880px right drawer with: Hero → Insights → Chart →
//      Table. Filter state lives inside the drawer body, not on the page.
//   3. KpiCard chrome, drawer chrome, focus-management, and Esc+Tab-trap are
//      copied 1:1 from CustomersOverview.tsx so the surfaces look and behave
//      identically. If a third caller appears, lift KpiCard + the drawer
//      shell into components/. Today the duplication is intentional — it
//      isolates the risk of the larger Overview.tsx file.
// ══════════════════════════════════════════════════════════════════════════════

const BLUE = '#204CC7';
const C_AT = '#06B6D4';
const C_SEM = '#7C3AED';
const RED = '#E2445C';
const GREEN = '#00C875';
const AMBER = '#FDAB3D';

// ─── KpiCard ───────────────────────────────────────────────────────────────────
//
// Each card is: small label + chevron affordance, big headline number, an
// optional delta pill, and a quiet single-line `footnote` below a divider.
// We previously split every card into "A&T vs SEM" — but the workforce spans
// 5+ departments, so that split lied on 7 of 8 cards. The footnote is now a
// free slot per card so each metric picks its OWN most-relevant subtext.

type KpiCardProps = {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  value: React.ReactNode;
  /** Optional delta pill or sub-line under the headline. */
  delta?: React.ReactNode;
  onClick: () => void;
  /** Required: value-rich label that screen readers can read in place of the visual hierarchy. */
  ariaLabel: string;
};

function KpiCard({
  Icon,
  title,
  value,
  delta,
  onClick,
  ariaLabel,
}: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      // Card chrome — matches the unified subtle-blue identity used
      // on the home Overview and Customers Overview surfaces:
      //   • Surface #FAFBFD (≈0.7% blue tint), cool against page bg
      //   • Border #E5EAF7 (cool blue-tinted) instead of warm grey
      //   • Hover bumps border to brand-blue/30 + lifts the wash
      //     from 2.5% → 4.5%
      //   • p-6 (24px) padding for breathing space
      // The per-card footnote slot stays — it carries useful, per-
      // metric subtext (median tenure, % at risk, etc.) and is not
      // the lying A&T/SEM split that was removed elsewhere.
      className="group relative bg-[#FAFBFD] rounded-xl p-6 border border-[#E5EAF7] hover:border-[#204CC7]/30 hover:shadow-[0_10px_28px_-14px_rgba(32,76,199,0.18)] hover:-translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2 transition-all duration-200 cursor-pointer text-left overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#204CC7]/[0.045] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Top row — icon chip + title + chevron all locked to the
          chip's vertical centerline. items-center on the row + no
          mt-0.5 nudges, so the chevron always sits exactly opposite
          the chip across the row. */}
      <div className="relative flex items-center justify-between mb-5 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Icon chip — 36×36 with a thin inset ring so it reads as
              a properly anchored chip rather than a flat coloured
              rectangle. Ring is brand-blue at 10%. */}
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#204CC7]/[0.08] ring-1 ring-inset ring-[#204CC7]/[0.10]">
            <Icon className="w-4 h-4" style={{ color: BLUE }} />
          </div>
          <span className="text-black/65 text-caption font-semibold truncate">{title}</span>
        </div>
        <ChevronRight
          className="w-4 h-4 text-black/45 group-hover:text-[#204CC7] group-hover:translate-x-0.5 transition-all flex-shrink-0"
          aria-hidden="true"
        />
      </div>

      {/* Headline + delta pill / sub-line — every card now ends on
          this line. The footnote slot (the per-metric subtext that
          used to sit below a divider, e.g. "Across 5 departments")
          was retired across all 9 widgets to match the home and
          customers Overview surfaces; the calmer card rhythm reads
          as one consistent dashboard family. */}
      <div className="relative">
        <div className="text-h1 leading-none">{value}</div>
        {delta && <div className="mt-2.5">{delta}</div>}
      </div>
    </button>
  );
}

// ─── DeltaPill ─────────────────────────────────────────────────────────────────

type DeltaDirection = 'positive' | 'negative' | 'neutral';

function DeltaPill({
  value,
  suffix = '%',
  label,
  direction,
}: {
  value: number | string;
  suffix?: string;
  label?: string;
  direction: DeltaDirection;
}) {
  // Neutral pills shifted to the brand-blue family so unsigned
  // deltas join the rest of the card's blue identity. Positive /
  // negative semantics stay green / rose so MoM signal still reads.
  const cls =
    direction === 'positive' ? 'bg-emerald-50 text-emerald-700'
    : direction === 'negative' ? 'bg-rose-50 text-rose-700'
    : 'bg-[#EEF1FB] text-[#3D5EC7]';
  const Arrow = direction === 'positive' ? ArrowUp
              : direction === 'negative' ? ArrowDown
              : null;
  return (
    <span className={`inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold ${cls}`}>
      {Arrow && <Arrow className="w-2.5 h-2.5" aria-hidden="true" />}
      <span className="tabular-nums">{value}{suffix}</span>
      {label && <span className="font-normal opacity-70 ml-0.5">{label}</span>}
    </span>
  );
}

// ─── Helper formatters ─────────────────────────────────────────────────────────

const formatLakh = (v: number) =>
  v >= 10000000 ? `₹${(v / 10000000).toFixed(1)}Cr` :
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` :
  v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` :
  `₹${v}`;

// ─── Resource Utilization Breakdown — mirrored from Home/Overview.tsx ─────────
//
// Same data + drilldown shape as the Resource Utilization Breakdown
// table on the Hours Available drawer in Overview.tsx. Surfacing it
// inside the Resource Utilization drawer here gives the Employees
// admin the same Service → Role → Person view the founder gets on
// Home, without forcing them to swap surfaces. Numbers track the
// 160 hrs/month/FTE assumption used everywhere else.

const BILLING_RATE_BY_SERVICE_EMP: Record<string, number> = {
  'Finance': 1875,
  'Performance Marketing': 2500,
};
const billingRateForEmp = (service: string): number =>
  BILLING_RATE_BY_SERVICE_EMP[service] ?? 1500;

const RESOURCE_UTILIZATION_DATA = [
  {
    service: 'Finance',
    hoursAllocated: 3840,
    hoursAvailable: 4800,
    totalHrUnallocated: 960,
    subCategories: [
      {
        name: 'Managers',
        hoursAllocated: 1120, hoursAvailable: 1280, totalHrUnallocated: 160,
        employees: [
          { name: 'Abdul Rahman', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Anil Kapoor',  hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12 },
          { name: 'Afroz Khan',   hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Suman Patel',  hoursAllocated: 144, hoursAvailable: 160, totalHrUnallocated: 16 },
          { name: 'Mansi Shah',   hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8 },
          { name: 'Jigar Mehta',  hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Irshad Ali',   hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18 },
          { name: 'Zubeer Ahmed', hoursAllocated: 120, hoursAvailable: 160, totalHrUnallocated: 40 },
        ],
      },
      {
        name: 'Full Time Employee',
        hoursAllocated: 2040, hoursAvailable: 2400, totalHrUnallocated: 360,
        employees: [
          { name: 'Rohan Desai',   hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Kavita Nair',   hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Vikram Singh',  hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Neha Gupta',    hoursAllocated: 135, hoursAvailable: 160, totalHrUnallocated: 25 },
          { name: 'Arjun Reddy',   hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18 },
          { name: 'Priya Sharma',  hoursAllocated: 134, hoursAvailable: 160, totalHrUnallocated: 26 },
          { name: 'Karan Joshi',   hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Divya Iyer',    hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Rajesh Kumar',  hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Anjali Rao',    hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Deepak Verma',  hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Sneha Pillai',  hoursAllocated: 135, hoursAvailable: 160, totalHrUnallocated: 25 },
          { name: 'Amit Agarwal',  hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Pooja Menon',   hoursAllocated: 134, hoursAvailable: 160, totalHrUnallocated: 26 },
          { name: 'Rahul Bhat',    hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
        ],
      },
      {
        name: 'Non Full Time Employee',
        hoursAllocated: 680, hoursAvailable: 1120, totalHrUnallocated: 440,
        employees: [
          { name: 'Meera Kulkarni', hoursAllocated: 95, hoursAvailable: 160, totalHrUnallocated: 65 },
          { name: 'Sanjay Malik',   hoursAllocated: 98, hoursAvailable: 160, totalHrUnallocated: 62 },
          { name: 'Ritu Saxena',    hoursAllocated: 92, hoursAvailable: 160, totalHrUnallocated: 68 },
          { name: 'Gaurav Bhatt',   hoursAllocated: 96, hoursAvailable: 160, totalHrUnallocated: 64 },
          { name: 'Swati Jain',     hoursAllocated: 94, hoursAvailable: 160, totalHrUnallocated: 66 },
          { name: 'Nitin Pandey',   hoursAllocated: 97, hoursAvailable: 160, totalHrUnallocated: 63 },
          { name: 'Shikha Tripathi',hoursAllocated: 108, hoursAvailable: 160, totalHrUnallocated: 52 },
        ],
      },
    ],
  },
  {
    service: 'Performance Marketing',
    hoursAllocated: 4560,
    hoursAvailable: 5280,
    totalHrUnallocated: 720,
    subCategories: [
      {
        name: 'Managers',
        hoursAllocated: 1360, hoursAvailable: 1440, totalHrUnallocated: 80,
        employees: [
          { name: 'Rakesh Sinha',     hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8 },
          { name: 'Shweta Malhotra',  hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12 },
          { name: 'Tarun Arora',      hoursAllocated: 150, hoursAvailable: 160, totalHrUnallocated: 10 },
          { name: 'Nidhi Choudhary',  hoursAllocated: 154, hoursAvailable: 160, totalHrUnallocated: 6 },
          { name: 'Varun Chopra',     hoursAllocated: 152, hoursAvailable: 160, totalHrUnallocated: 8 },
          { name: 'Pallavi Bansal',   hoursAllocated: 150, hoursAvailable: 160, totalHrUnallocated: 10 },
          { name: 'Kunal Thakur',     hoursAllocated: 148, hoursAvailable: 160, totalHrUnallocated: 12 },
          { name: 'Ananya Khanna',    hoursAllocated: 146, hoursAvailable: 160, totalHrUnallocated: 14 },
          { name: 'Rohit Bhardwaj',   hoursAllocated: 160, hoursAvailable: 160, totalHrUnallocated: 0 },
        ],
      },
      {
        name: 'Full Time Employee',
        hoursAllocated: 2640, hoursAvailable: 3040, totalHrUnallocated: 400,
        employees: [
          { name: 'Ishaan Puri',      hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Shreya Kapoor',    hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Mayank Ahuja',     hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18 },
          { name: 'Tanvi Deshmukh',   hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Aditya Rane',      hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Riya Chawla',      hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Harsh Mittal',     hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Simran Kohli',     hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Aryan Goyal',      hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18 },
          { name: 'Diya Mathur',      hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Karthik Hegde',    hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Isha Bhatia',      hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Siddhant Dua',     hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Avni Khurana',     hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Yash Suri',        hoursAllocated: 136, hoursAvailable: 160, totalHrUnallocated: 24 },
          { name: 'Naina Grover',     hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
          { name: 'Kabir Sethi',      hoursAllocated: 138, hoursAvailable: 160, totalHrUnallocated: 22 },
          { name: 'Mira Dhawan',      hoursAllocated: 142, hoursAvailable: 160, totalHrUnallocated: 18 },
          { name: 'Vihaan Sabharwal', hoursAllocated: 140, hoursAvailable: 160, totalHrUnallocated: 20 },
        ],
      },
      {
        name: 'Non Full Time Employee',
        hoursAllocated: 560, hoursAvailable: 800, totalHrUnallocated: 240,
        employees: [
          { name: 'Sara Nayyar',    hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48 },
          { name: 'Aman Vohra',     hoursAllocated: 108, hoursAvailable: 160, totalHrUnallocated: 52 },
          { name: 'Tara Bajaj',     hoursAllocated: 116, hoursAvailable: 160, totalHrUnallocated: 44 },
          { name: 'Reyansh Datta',  hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48 },
          { name: 'Kiara Talwar',   hoursAllocated: 112, hoursAvailable: 160, totalHrUnallocated: 48 },
        ],
      },
    ],
  },
];

/**
 * ResourceUtilizationBreakdownTable — drillable Service → Role →
 * Person view of monthly capacity. Same chrome/affordances as the
 * version on the Home page's Hours Available drawer:
 *   • Click a service row to expand into roles
 *   • Click a role row to expand into people
 *   • Each row carries a status pill (Has room / Near full / Over)
 *   • Utilization % colour-codes via the same thresholds (85, 95)
 *
 * Renders inside the Resource Utilization drawer body so the
 * Employees admin gets the same view the founder sees on Home —
 * no surface-hopping required.
 */
function ResourceUtilizationBreakdownTable() {
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedSubCategory, setExpandedSubCategory] = useState<string | null>(null);

  type Status = { label: string; bar: string; pillBg: string; pillText: string };
  const classify = (pct: number): Status => {
    if (pct < 85)  return { label: 'Has room',      bar: '#00C875', pillBg: 'bg-emerald-50', pillText: 'text-emerald-700' };
    if (pct < 95)  return { label: 'Near full',     bar: '#FDAB3D', pillBg: 'bg-amber-50',   pillText: 'text-amber-700' };
    return            { label: 'Over capacity',     bar: '#E2445C', pillBg: 'bg-rose-50',    pillText: 'text-rose-700' };
  };

  return (
    <div className="px-7 pb-2">
      <div className="mb-3">
        <h3 className="text-body font-bold text-black/85">Resource Utilization Breakdown</h3>
        <p className="text-caption text-black/65 mt-1">How busy each team is, and how much more work they can take on</p>
      </div>
      <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Team capacity this month">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                <th className="px-5 py-3 text-left text-caption font-semibold text-black/55">Team</th>
                <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Allocated hours</th>
                <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Free hours left</th>
                <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Rev. Capacity</th>
                <th className="px-5 py-3 text-right text-caption font-semibold text-black/55">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCE_UTILIZATION_DATA.flatMap((service) => {
                const utilizationPct = (service.hoursAllocated / service.hoursAvailable) * 100;
                const isExpanded = expandedService === service.service;
                const status = classify(utilizationPct);

                const serviceRow = (
                  <tr
                    key={service.service}
                    className="border-b border-black/5 hover:bg-black/[0.015] cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-[#204CC7]/[0.05] focus-visible:shadow-[inset_2px_0_0_0_#204CC7]"
                    onClick={() => setExpandedService(isExpanded ? null : service.service)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedService(isExpanded ? null : service.service);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${service.service} team — ${isExpanded ? 'expanded' : 'collapsed'}. Activate to ${isExpanded ? 'hide' : 'show'} role breakdown.`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <ChevronDown className={`w-3.5 h-3.5 text-black/55 transition-transform shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                        <span className="text-body font-semibold text-black/85">{service.service}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-semibold ${status.pillBg} ${status.pillText}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.bar }} aria-hidden="true" />
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="text-body font-medium text-black/75 tabular-nums">{service.hoursAllocated.toLocaleString()}</span>
                      <span className="text-caption text-black/60 ml-1">hrs</span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="text-body font-semibold text-black/85 tabular-nums">{service.totalHrUnallocated.toLocaleString()}</span>
                      <span className="text-caption text-black/60 ml-1">hrs</span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="text-body font-medium text-black/75 tabular-nums">{formatLakh(service.hoursAvailable * billingRateForEmp(service.service))}</span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap" aria-label={`${service.service} utilization`}>
                      <span className="text-body font-semibold tabular-nums" style={{ color: status.bar }}>{utilizationPct.toFixed(0)}%</span>
                    </td>
                  </tr>
                );

                const roleRows = isExpanded
                  ? service.subCategories.flatMap((role) => {
                      const rolePct = (role.hoursAllocated / role.hoursAvailable) * 100;
                      const roleStatus = classify(rolePct);
                      const roleKey = `${service.service}-${role.name}`;
                      const isRoleExpanded = expandedSubCategory === roleKey;
                      const hasEmployees = role.employees && role.employees.length > 0;

                      const roleRow = (
                        <tr
                          key={roleKey}
                          className={`bg-[#FAFBFC] border-b border-black/5 transition-colors ${hasEmployees ? 'cursor-pointer hover:bg-black/[0.02] focus-visible:outline-none focus-visible:bg-[#204CC7]/[0.05] focus-visible:shadow-[inset_2px_0_0_0_#204CC7]' : ''}`}
                          onClick={(e) => {
                            if (!hasEmployees) return;
                            e.stopPropagation();
                            setExpandedSubCategory(isRoleExpanded ? null : roleKey);
                          }}
                          onKeyDown={(e) => {
                            if (!hasEmployees) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedSubCategory(isRoleExpanded ? null : roleKey);
                            }
                          }}
                          tabIndex={hasEmployees ? 0 : undefined}
                          aria-expanded={hasEmployees ? isRoleExpanded : undefined}
                          aria-label={hasEmployees ? `${role.name} role — ${isRoleExpanded ? 'expanded' : 'collapsed'}. Activate to ${isRoleExpanded ? 'hide' : 'show'} ${role.employees.length} people.` : undefined}
                        >
                          <td className="px-5 py-2.5 pl-10">
                            <div className="flex items-center gap-2">
                              {hasEmployees ? (
                                <ChevronDown className={`w-3 h-3 text-black/55 transition-transform shrink-0 ${isRoleExpanded ? 'rotate-0' : '-rotate-90'}`} aria-hidden="true" />
                              ) : (
                                <span className="w-3 h-3 shrink-0" aria-hidden="true" />
                              )}
                              <span className="text-caption font-medium text-black/65">{role.name}</span>
                              <span className="text-caption text-black/60 tabular-nums">· {role.employees?.length ?? 0}</span>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            <span className="text-caption font-medium text-black/65 tabular-nums">{role.hoursAllocated.toLocaleString()}</span>
                            <span className="text-caption text-black/60 ml-1">hrs</span>
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            <span className="text-caption font-semibold text-black/70 tabular-nums">{role.totalHrUnallocated.toLocaleString()}</span>
                            <span className="text-caption text-black/60 ml-1">hrs</span>
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap">
                            <span className="text-caption font-medium text-black/65 tabular-nums">{formatLakh(role.hoursAvailable * billingRateForEmp(service.service))}</span>
                          </td>
                          <td className="px-5 py-2.5 text-right whitespace-nowrap" aria-label={`${role.name} utilization in ${service.service}`}>
                            <span className="text-caption font-semibold tabular-nums" style={{ color: roleStatus.bar }}>{rolePct.toFixed(0)}%</span>
                          </td>
                        </tr>
                      );

                      const employeeRows = isRoleExpanded && hasEmployees
                        ? role.employees.map((emp) => {
                            const empPct = (emp.hoursAllocated / emp.hoursAvailable) * 100;
                            const empStatus = classify(empPct);
                            return (
                              <tr key={`${roleKey}-${emp.name}`} className="bg-white border-b border-black/[0.04]">
                                <td className="px-5 py-2 pl-[60px]">
                                  <span className="text-caption text-black/60">{emp.name}</span>
                                </td>
                                <td className="px-5 py-2 text-right whitespace-nowrap">
                                  <span className="text-caption text-black/60 tabular-nums">{emp.hoursAllocated.toLocaleString()}</span>
                                  <span className="text-caption text-black/60 ml-1">hrs</span>
                                </td>
                                <td className="px-5 py-2 text-right whitespace-nowrap">
                                  <span className="text-caption text-black/60 tabular-nums">{emp.totalHrUnallocated.toLocaleString()}</span>
                                  <span className="text-caption text-black/60 ml-1">hrs</span>
                                </td>
                                <td className="px-5 py-2 text-right whitespace-nowrap">
                                  <span className="text-caption text-black/60 tabular-nums">{formatLakh(emp.hoursAvailable * billingRateForEmp(service.service))}</span>
                                </td>
                                <td className="px-5 py-2 text-right whitespace-nowrap" aria-label={`${emp.name} utilization`}>
                                  <span className="text-caption font-medium tabular-nums" style={{ color: empStatus.bar }}>{empPct.toFixed(0)}%</span>
                                </td>
                              </tr>
                            );
                          })
                        : [];

                      return [roleRow, ...employeeRows];
                    })
                  : [];

                return [serviceRow, ...roleRows];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEES OVERVIEW — Default screen for /adminland/employees
// ══════════════════════════════════════════════════════════════════════════════

type KpiId =
  | 'active'
  | 'past'
  | 'incoming'
  | 'utilization'
  | 'incidents'
  | 'onboarding'
  | 'resource-request'
  | 'recruiters'
  | 'risks';

type ServiceFilter = 'All' | 'A&T' | 'SEM';
type DeptFilter = 'All' | 'A&T' | 'SEM' | 'Sales' | 'Technology' | 'HR' | 'Operations' | 'Internal';
// The Workforce Risks drawer now scopes to CLA / NTF only — the
// Open Incidents table that previously rendered alongside was
// retired here (the dedicated Employee Incidents card already owns
// that surface, so two tables answered the same question). Filter
// vocab pares down to All / CLA / NTF.
type RiskFilter = 'All' | 'CLA' | 'NTF';
type DateRange = 'ytd' | 'mtd' | 'weekly' | 'q1' | 'q2' | 'q3' | 'q4';

export function EmployeesOverview({
  greeting,
}: {
  /** Optional personalised header — replaces the default
   *  "Employees · Team strength, hiring, and workforce risk
   *  overview" label with a greeting + date block. Used by the
   *  HR role view where Employees IS the role's home, so the
   *  top bar reads like a personal landing page rather than a
   *  module page. */
  greeting?: { line1: string; line2: string };
} = {}) {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>('mtd');

  // Live resource-request list — same shared store the standalone Resource
  // Request page reads from, so anything submitted from A&T deliverables or
  // the Resource Request table shows up here too.
  const resourceRequestList = useResourceRequests();

  // ── Drawer state ─────────────────────────────────────────────────────────
  const [openKPI, setOpenKPI] = useState<KpiId | null>(null);
  const [drawerService, setDrawerService] = useState<ServiceFilter>('All');
  const [drawerDept, setDrawerDept] = useState<DeptFilter>('All');
  const [drawerRisk, setDrawerRisk] = useState<RiskFilter>('All');
  const [drawerRequestDept, setDrawerRequestDept] = useState<string>('All');

  const drawerRef = useRef<HTMLDivElement>(null);
  // Restore focus to the card that opened the drawer on close (WCAG 2.4.3).
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const drawerCloseBtnRef = useRef<HTMLButtonElement>(null);

  // Reset drawer-local filters whenever a different KPI opens.
  useEffect(() => {
    if (openKPI) {
      setDrawerService('All');
      setDrawerDept('All');
      setDrawerRisk('All');
      setDrawerRequestDept('All');
    }
  }, [openKPI]);

  // Esc closes; Tab cycles within the drawer rather than escaping into the
  // dimmed background. Mirrors CustomersOverview.tsx exactly.
  useEffect(() => {
    if (!openKPI) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenKPI(null); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [openKPI]);

  // Move focus into the drawer on open; restore to opener on close.
  useEffect(() => {
    if (openKPI) {
      drawerOpenerRef.current = (document.activeElement as HTMLElement) ?? null;
      const t = window.setTimeout(() => drawerCloseBtnRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
    if (drawerOpenerRef.current) {
      drawerOpenerRef.current.focus();
      drawerOpenerRef.current = null;
    }
  }, [openKPI]);

  // ══════════════════════════════════════════════════════════════════════════
  // KPI HEADLINE NUMBERS — single source of truth for cards + drawer hero
  // ══════════════════════════════════════════════════════════════════════════

  const activeEmployees = {
    total: 45,
    at: 12, sem: 15, sales: 10, tech: 5, hr: 3,
    change: 3, prevTotal: 42,
  };
  const utilization = {
    avg: 78, prevAvg: 73, target: 80,
    atAvg: 75, semAvg: 79,
    underUtilized: 1, // <70%
    overUtilized: 1, // ≥90%
  };
  const pastEmployees = {
    total: 16, at: 5, sem: 8, other: 3,
    fired: 6, resigned: 10, lastMonth: 2, prevLastMonth: 5,
  };
  const incomingEmployees = {
    total: 6, joined: 1, incoming: 5, backedOut: 2,
    at: 4, sem: 1, other: 3,
  };
  const openRoles = {
    total: 8, at: 2, sem: 2, sales: 3, tech: 1,
    interviewing: 2, offerSent: 2, active: 4,
  };
  const recruiterFunnel = {
    sourced: 400, calls: 343, interviewsSet: 27, interviewsDone: 15, offers: 0, hired: 0,
    poojaSourced: 200, ravinaSourced: 200, priyankaSourced: 0,
  };
  const onboarding = {
    total: 8, at: 4, sem: 1, other: 3,
    longest: 14, avgDays: 8, stuck: 1, // stuck = >10d
  };
  const workforceRisks = {
    total: 10, cla: 2, ntf: 2, incidents: 6, // 4 risk-flags + 6 incidents = 10
    at: 3, sem: 6, internal: 1,
    high: 4, medium: 2,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 6-MONTH TREND BACKFILL
  // ══════════════════════════════════════════════════════════════════════════

  const headcountTrend = [
    { month: 'Nov', total: 40, at: 11, sem: 13, other: 16 },
    { month: 'Dec', total: 41, at: 11, sem: 14, other: 16 },
    { month: 'Jan', total: 42, at: 12, sem: 14, other: 16 },
    { month: 'Feb', total: 43, at: 12, sem: 14, other: 17 },
    { month: 'Mar', total: 42, at: 12, sem: 13, other: 17 },
    { month: 'Apr', total: 45, at: 12, sem: 15, other: 18 },
  ];

  const utilizationTrend = [
    { month: 'Nov', overall: 72, at: 70, sem: 74 },
    { month: 'Dec', overall: 74, at: 72, sem: 76 },
    { month: 'Jan', overall: 76, at: 74, sem: 78 },
    { month: 'Feb', overall: 75, at: 73, sem: 77 },
    { month: 'Mar', overall: 73, at: 71, sem: 75 },
    { month: 'Apr', overall: 78, at: 75, sem: 79 },
  ];

  const exitsTrend = [
    { month: 'Nov', at: 1, sem: 1, total: 2 },
    { month: 'Dec', at: 0, sem: 2, total: 2 },
    { month: 'Jan', at: 1, sem: 1, total: 2 },
    { month: 'Feb', at: 1, sem: 2, total: 3 },
    { month: 'Mar', at: 2, sem: 3, total: 5 },
    { month: 'Apr', at: 1, sem: 1, total: 2 },
  ];

  const incomingTrend = [
    { month: 'Nov', joined: 2, backedOut: 0 },
    { month: 'Dec', joined: 1, backedOut: 1 },
    { month: 'Jan', joined: 3, backedOut: 0 },
    { month: 'Feb', joined: 2, backedOut: 1 },
    { month: 'Mar', joined: 1, backedOut: 0 },
    { month: 'Apr', joined: 1, backedOut: 2 },
  ];

  const openRolesTrend = [
    { month: 'Nov', open: 4 },
    { month: 'Dec', open: 5 },
    { month: 'Jan', open: 6 },
    { month: 'Feb', open: 7 },
    { month: 'Mar', open: 9 },
    { month: 'Apr', open: 8 },
  ];

  const risksTrend = [
    { month: 'Nov', cla: 2, incidents: 4 },
    { month: 'Dec', cla: 2, incidents: 5 },
    { month: 'Jan', cla: 3, incidents: 5 },
    { month: 'Feb', cla: 3, incidents: 6 },
    { month: 'Mar', cla: 4, incidents: 7 },
    { month: 'Apr', cla: 4, incidents: 6 },
  ];

  // 6-month resource-request volume — number of new requests raised
  // each month. The Apr value reads from the live shared store so the
  // chart's "today" bar never drifts from the table below it.
  const resourceRequestsTrend = [
    { month: 'Nov', count: 2 },
    { month: 'Dec', count: 3 },
    { month: 'Jan', count: 2 },
    { month: 'Feb', count: 4 },
    { month: 'Mar', count: 5 },
    { month: 'Apr', count: resourceRequestList.length },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // ROW-LEVEL DATA — feeds the drawer tables
  // ══════════════════════════════════════════════════════════════════════════

  const activeRoster = [
    { name: 'Chinmay Pawar', role: 'SEM HOD', service: 'SEM' as const, dept: 'SEM', joined: 'Jan 2023', utilization: 86 },
    { name: 'Amisha Jain', role: 'SEM Manager', service: 'SEM' as const, dept: 'SEM', joined: 'Mar 2023', utilization: 85 },
    { name: 'Priya Sharma', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', joined: 'Jul 2023', utilization: 90 },
    { name: 'Akshay Mehta', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', joined: 'Sep 2023', utilization: 80 },
    { name: 'Rohan Kapoor', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', joined: 'Nov 2023', utilization: 78 },
    { name: 'Neha Desai', role: 'SEM Trainee', service: 'SEM' as const, dept: 'SEM', joined: 'Mar 2026', utilization: 42 },
    { name: 'Zubear Shaikh', role: 'A&T HOD', service: 'A&T' as const, dept: 'A&T', joined: 'Aug 2022', utilization: 75 },
    { name: 'Irshad Mulla', role: 'A&T Manager', service: 'A&T' as const, dept: 'A&T', joined: 'Feb 2023', utilization: 75 },
    { name: 'Kavya Iyer', role: 'A&T Specialist', service: 'A&T' as const, dept: 'A&T', joined: 'Jun 2024', utilization: 75 },
    { name: 'Sneha Patel', role: 'A&T Specialist', service: 'A&T' as const, dept: 'A&T', joined: 'Aug 2023', utilization: 75 },
    { name: 'Priyanka Rao', role: 'Sales BDE Lead', service: 'A&T' as const, dept: 'Sales', joined: 'Jan 2024', utilization: 72 },
    { name: 'Pooja Iyer', role: 'Recruiter', service: 'A&T' as const, dept: 'HR', joined: 'May 2023', utilization: 80 },
    { name: 'Ravina Shah', role: 'Recruiter', service: 'SEM' as const, dept: 'HR', joined: 'Jul 2023', utilization: 78 },
  ];

  const utilizationRows = [
    { name: 'Priya Sharma', service: 'SEM' as const, allocated: 720, available: 800, utilization: 90, revCapacity: 640000 },
    { name: 'Chinmay Pawar', service: 'SEM' as const, allocated: 760, available: 880, utilization: 86, revCapacity: 660000 },
    { name: 'Amisha Jain', service: 'SEM' as const, allocated: 680, available: 800, utilization: 85, revCapacity: 580000 },
    { name: 'Akshay Mehta', service: 'SEM' as const, allocated: 640, available: 800, utilization: 80, revCapacity: 520000 },
    { name: 'Rohan Kapoor', service: 'SEM' as const, allocated: 560, available: 720, utilization: 78, revCapacity: 440000 },
    { name: 'Zubear Shaikh', service: 'A&T' as const, allocated: 720, available: 960, utilization: 75, revCapacity: 480000 },
    { name: 'Irshad Mulla', service: 'A&T' as const, allocated: 480, available: 640, utilization: 75, revCapacity: 320000 },
    { name: 'Kavya Iyer', service: 'A&T' as const, allocated: 360, available: 480, utilization: 75, revCapacity: 240000 },
    { name: 'Sneha Patel', service: 'A&T' as const, allocated: 600, available: 800, utilization: 75, revCapacity: 400000 },
    { name: 'Neha Desai', service: 'SEM' as const, allocated: 200, available: 480, utilization: 42, revCapacity: 160000 },
  ];

  const pastEmployeeRows = [
    { name: 'Manoj Singh', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', exitType: 'Resigned' as const, reason: 'Accepted higher offer at competitor', exitDate: 'Apr 2026' },
    { name: 'Riya Patel', role: 'SEM Trainee', service: 'SEM' as const, dept: 'SEM', exitType: 'Resigned' as const, reason: 'Career change to product', exitDate: 'Apr 2026' },
    { name: 'Karan Joshi', role: 'A&T Junior', service: 'A&T' as const, dept: 'A&T', exitType: 'Fired' as const, reason: 'Repeated compliance errors', exitDate: 'Mar 2026' },
    { name: 'Aditya Rao', role: 'SEM Manager', service: 'SEM' as const, dept: 'SEM', exitType: 'Resigned' as const, reason: 'Relocation to Bengaluru', exitDate: 'Mar 2026' },
    { name: 'Meera Iyer', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', exitType: 'Fired' as const, reason: 'Performance below threshold for 4 months', exitDate: 'Mar 2026' },
    { name: 'Vikram Shah', role: 'A&T Specialist', service: 'A&T' as const, dept: 'A&T', exitType: 'Resigned' as const, reason: 'Started own consultancy', exitDate: 'Mar 2026' },
    { name: 'Pooja Mehta', role: 'BDE', service: 'A&T' as const, dept: 'Sales', exitType: 'Resigned' as const, reason: 'Personal — extended sabbatical', exitDate: 'Feb 2026' },
    { name: 'Tarun Verma', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', exitType: 'Fired' as const, reason: 'Attendance issues', exitDate: 'Feb 2026' },
    { name: 'Sanya Kapoor', role: 'A&T Junior', service: 'A&T' as const, dept: 'A&T', exitType: 'Resigned' as const, reason: 'Pursuing CA articleship', exitDate: 'Feb 2026' },
    { name: 'Rajiv Nair', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', exitType: 'Resigned' as const, reason: 'Switched to in-house role', exitDate: 'Jan 2026' },
    { name: 'Anjali Singh', role: 'A&T Junior', service: 'A&T' as const, dept: 'A&T', exitType: 'Fired' as const, reason: 'Probation — not a fit', exitDate: 'Jan 2026' },
    { name: 'Deepak Rao', role: 'Tech Junior', service: 'SEM' as const, dept: 'Technology', exitType: 'Resigned' as const, reason: 'Higher package elsewhere', exitDate: 'Dec 2025' },
    { name: 'Nidhi Patel', role: 'BDE', service: 'A&T' as const, dept: 'Sales', exitType: 'Resigned' as const, reason: 'Career break', exitDate: 'Dec 2025' },
    { name: 'Suresh Kumar', role: 'SEM Trainee', service: 'SEM' as const, dept: 'SEM', exitType: 'Fired' as const, reason: 'Skill gap not closing', exitDate: 'Nov 2025' },
    { name: 'Lata Iyer', role: 'A&T Junior', service: 'A&T' as const, dept: 'A&T', exitType: 'Resigned' as const, reason: 'Family relocation', exitDate: 'Nov 2025' },
    { name: 'Harish Kapoor', role: 'SEM Specialist', service: 'SEM' as const, dept: 'SEM', exitType: 'Fired' as const, reason: 'Confidentiality breach', exitDate: 'Nov 2025' },
  ];

  const incomingRows = [
    { name: 'Nisha Patil', dept: 'A&T', service: 'A&T' as const, date: '6 Apr 2026', status: 'Joined' as const },
    { name: 'Jyoti Rane', dept: 'A&T', service: 'A&T' as const, date: '4 May 2026', status: 'Incoming' as const },
    { name: 'Amisha Desai', dept: 'A&T', service: 'A&T' as const, date: 'TBD', status: 'Incoming' as const },
    { name: 'Rahul Kapoor', dept: 'Sales', service: 'A&T' as const, date: '14 Apr 2026', status: 'Incoming' as const },
    { name: 'Sneha K.', dept: 'SEM', service: 'SEM' as const, date: '21 Apr 2026', status: 'Incoming' as const },
    { name: 'Vishal Thakur', dept: 'Technology', service: 'SEM' as const, date: '28 Apr 2026', status: 'Incoming' as const },
    { name: 'Ankita Sharma', dept: 'A&T', service: 'A&T' as const, date: '15 Mar 2026', status: 'Backed Out' as const },
    { name: 'Ravi Menon', dept: 'Sales', service: 'A&T' as const, date: '20 Mar 2026', status: 'Backed Out' as const },
  ];

  const openRoleRows = [
    { id: 1, dept: 'A&T' as DeptFilter, position: 'Floaters', count: '4 of 5', recruiter: 'Pooja', budget: '₹25K – 35K', status: 'Active' as const, ageDays: 28 },
    { id: 2, dept: 'A&T' as DeptFilter, position: 'Manager', count: '1', recruiter: 'Pooja', budget: '₹45K – 55K', status: 'Interviewing' as const, ageDays: 22 },
    { id: 3, dept: 'Sales' as DeptFilter, position: 'BDE', count: '7 of 7', recruiter: 'Priyanka', budget: '₹30K – 50K', status: 'Active' as const, ageDays: 18 },
    { id: 4, dept: 'Sales' as DeptFilter, position: 'BDE', count: '1', recruiter: 'Priyanka', budget: '₹30K – 50K', status: 'Active' as const, ageDays: 14 },
    { id: 5, dept: 'Sales' as DeptFilter, position: 'Business Dev Execs', count: '8', recruiter: 'Priyanka', budget: '₹30K – 50K', status: 'Offer Sent' as const, ageDays: 9 },
    { id: 6, dept: 'SEM' as DeptFilter, position: 'Floaters', count: '0 of 3', recruiter: 'Ravina', budget: '₹45K – 50K', status: 'Active' as const, ageDays: 31 },
    { id: 7, dept: 'SEM' as DeptFilter, position: 'SEM Manager / QC', count: '2', recruiter: 'Ravina', budget: '₹70K – 85K', status: 'Interviewing' as const, ageDays: 19 },
    { id: 8, dept: 'Technology' as DeptFilter, position: 'Full Stack Dev', count: '1', recruiter: 'Ravina', budget: '₹80K – 1.2L', status: 'Offer Sent' as const, ageDays: 7 },
  ];

  const recruiters = [
    { name: 'Pooja',    initials: 'PJ', color: '#7C3AED', focus: 'A&T',   sourced: 200, calls: 194, interviewsSet: 14, interviewsDone: 5,  offers: 0, hired: 0 },
    { name: 'Ravina',   initials: 'RV', color: '#06B6D4', focus: 'SEM',   sourced: 200, calls: 149, interviewsSet: 13, interviewsDone: 10, offers: 0, hired: 0 },
    { name: 'Priyanka', initials: 'PK', color: '#F59E0B', focus: 'Sales', sourced: 0,   calls: 0,   interviewsSet: 0,  interviewsDone: 0,  offers: 0, hired: 0 },
  ];

  const onboardingRows = [
    { name: 'Chetan Nare',     dept: 'A&T',             service: 'A&T' as const, days: 14, buddy: 'Zubear S.', status: 'Settling' as const },
    { name: 'Parul',           dept: 'A&T',             service: 'A&T' as const, days: 10, buddy: 'Irshad M.', status: 'Settling' as const },
    { name: 'Naeela',          dept: 'A&T',             service: 'A&T' as const, days: 8,  buddy: 'Kavya I.',  status: 'Settling' as const },
    { name: 'Prathamesh T.',   dept: 'A&T',             service: 'A&T' as const, days: 12, buddy: 'Sneha P.',  status: 'Settling' as const },
    { name: 'Siddharth K.',    dept: 'HR',              service: 'A&T' as const, days: 7,  buddy: 'Pooja I.',  status: 'Settling' as const },
    { name: 'Purva P.',        dept: 'Operations',      service: 'A&T' as const, days: 6,  buddy: 'Mihir L.',  status: 'Settling' as const },
    { name: 'Luiza S.',        dept: 'Perf. Marketing', service: 'SEM' as const, days: 5,  buddy: 'Chinmay P.',status: 'Settling' as const },
    { name: 'Daniya S.',       dept: 'Technology',      service: 'SEM' as const, days: 3,  buddy: 'Unassigned',status: 'Settling' as const },
  ];

  const claRows = [
    { name: 'John Doe',       dept: 'Perf. Marketing', service: 'SEM' as const, type: 'CLA' as const, severity: 'High' as const,   reason: 'Not meeting monthly targets for 3 consecutive months', responsible: 'Chinmay P.' },
    { name: 'Sarah Johnson',  dept: 'Perf. Marketing', service: 'SEM' as const, type: 'CLA' as const, severity: 'Medium' as const, reason: 'Late submissions affecting team deliverables consistently', responsible: 'Amisha J.' },
    { name: 'Kavya Iyer',     dept: 'A&T',             service: 'A&T' as const, type: 'NTF' as const, severity: 'High' as const,   reason: 'Resigned — accepted offer from competitor firm', responsible: 'Zubear S.' },
    { name: 'Rahul Nair',     dept: 'Perf. Marketing', service: 'SEM' as const, type: 'NTF' as const, severity: 'Medium' as const, reason: 'Contract ended — not renewed due to budget cuts', responsible: 'Chinmay P.' },
  ];

  // `date` = ISO of when the incident was logged. Today is 28 Apr 2026
  // for the Employees overview; daysOpen + date are kept consistent so
  // the table can show "Date" while drawer stats still derive from
  // `daysOpen` without recalculating.
  const incidentRows = [
    { id: 'INC-001', date: '2026-04-23', employee: 'Priya Sharma',  dept: 'Perf. Marketing', service: 'SEM' as const,   priority: 'High' as const,   status: 'Open' as const,        category: 'Client Risk',  daysOpen: 5,  description: 'ROAS dropped below 1.5x for Zenith Retail — client threatening to leave.' },
    { id: 'INC-002', date: '2026-04-20', employee: 'Rohan Desai',   dept: 'A&T',             service: 'A&T' as const,   priority: 'High' as const,   status: 'In Progress' as const, category: 'Compliance',   daysOpen: 8,  description: 'GST filing deadline missed for Meridian Healthcare. Potential ₹10K penalty.' },
    { id: 'INC-003', date: '2026-04-17', employee: 'Amit Verma',    dept: 'Internal',        service: 'A&T' as const,   priority: 'Medium' as const, status: 'In Progress' as const, category: 'HR Internal',  daysOpen: 11, description: 'Harassment complaint reported against team lead. HR investigation required.' },
    { id: 'INC-004', date: '2026-04-14', employee: 'Akshay Mehta',  dept: 'Perf. Marketing', service: 'SEM' as const,   priority: 'Medium' as const, status: 'Open' as const,        category: 'Client Comm',  daysOpen: 14, description: 'Client not receiving weekly performance reports for 2 weeks.' },
    { id: 'INC-005', date: '2026-03-14', employee: 'Sneha Patel',   dept: 'A&T',             service: 'A&T' as const,   priority: 'High' as const,   status: 'In Progress' as const, category: 'Collections',  daysOpen: 45, description: 'Invoice of ₹1.2L overdue by 45 days — multiple follow-ups unanswered.' },
    { id: 'INC-008', date: '2026-04-25', employee: 'Priya Sharma',  dept: 'Perf. Marketing', service: 'SEM' as const,   priority: 'High' as const,   status: 'In Progress' as const, category: 'Platform',     daysOpen: 3,  description: 'Facebook ad account suspended due to policy violation.' },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // DERIVED HEADLINES for the new KPIs (Employees Incidents + Resource
  // Request). Both pull straight from their respective row lists so the
  // card and the drawer can never disagree.
  // ══════════════════════════════════════════════════════════════════════════

  const employeeIncidents = {
    total: incidentRows.length,
    high: incidentRows.filter(i => i.priority === 'High').length,
    medium: incidentRows.filter(i => i.priority === 'Medium').length,
    open: incidentRows.filter(i => i.status === 'Open').length,
    inProgress: incidentRows.filter(i => i.status === 'In Progress').length,
    at: incidentRows.filter(i => i.service === 'A&T').length,
    sem: incidentRows.filter(i => i.service === 'SEM').length,
    longest: Math.max(0, ...incidentRows.map(i => i.daysOpen)),
    overTwoWeeks: incidentRows.filter(i => i.daysOpen >= 14).length,
  };

  const resourceRequestStats = {
    total: resourceRequestList.length,
    open: resourceRequestList.filter(r => r.status === 'Open').length,
    fulfilled: resourceRequestList.filter(r => r.status === 'Fulfilled').length,
    high: resourceRequestList.filter(r => r.priority === 'High').length,
    // Active positions = sum of positions on Open requests (still hiring).
    activePositions: resourceRequestList
      .filter(r => r.status === 'Open')
      .reduce((s, r) => s + r.positions, 0),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // KPI META — title, subtitle, route for the drawer "View full report" CTA
  // ══════════════════════════════════════════════════════════════════════════

  const kpiMeta: Record<KpiId, { title: string; subtitle: string; route: string; routeLabel: string }> = {
    'active': {
      title: 'Active Employees',
      subtitle: 'On-roll headcount across all departments this month',
      route: '/home?tab=employees&sub=all-employees',
      routeLabel: 'View all employees',
    },
    'past': {
      title: 'Past Employees',
      subtitle: 'Exits over the last 6 months — fired and resigned, with reasons',
      route: '/home?tab=employees&sub=past-employees',
      routeLabel: 'View Past Employees',
    },
    'incoming': {
      title: 'Incoming Employees',
      subtitle: 'Joiners and pending starts this month, plus backed-out offers',
      route: '/home?tab=employees&sub=incoming',
      routeLabel: 'View incoming list',
    },
    'utilization': {
      title: 'Resource Utilization',
      subtitle: 'Allocated vs available hours across the billable team',
      route: '/adminland/employees/utilization',
      routeLabel: 'View utilization report',
    },
    'incidents': {
      title: 'Employee Incidents',
      subtitle: 'Open and in-progress employee incidents that need an owner',
      route: '/home?tab=employees&sub=incidents',
      routeLabel: 'View all incidents',
    },
    'onboarding': {
      title: 'Onboarding',
      subtitle: 'New hires currently settling in — buddy assignments and ramp days',
      route: '/adminland/employees/onboarding',
      routeLabel: 'View onboarding tracker',
    },
    'resource-request': {
      title: 'Resource Requests',
      subtitle: 'Open hiring requests by department, priority, and status',
      route: '/home?tab=employees&sub=resource-requests',
      routeLabel: 'View all requests',
    },
    'recruiters': {
      title: 'Recruiter Funnel',
      subtitle: 'Sourced → Hired across the recruiting team this month',
      route: '/adminland/employees/recruiters',
      routeLabel: 'View recruiter report',
    },
    'risks': {
      title: 'Workforce Risks',
      subtitle: 'CLA/NTF flags and open employee incidents that need an owner',
      route: '/home?tab=employees&sub=cla-ntf',
      routeLabel: 'View CLA/NTF',
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div>
      {/* ── Top filter bar — same as Customers / Reports for parity.
            Personalised greeting block replaces the default
            "Employees · Team strength…" label when this overview
            is the role's home (HR view). The taller greeting
            tightens the header padding via py-2.5 so the row
            doesn't grow when the typography scales up. ── */}
      <div className="bg-white border-b border-black/5 sticky top-0 z-10 -mx-6 -mt-6 px-6 mb-6">
        <div className={`flex items-center justify-between gap-4 flex-wrap ${greeting ? 'py-2.5' : 'py-3'}`}>
          <div className="shrink-0">
            {greeting ? (
              <>
                <h1 className="text-black/90 text-h2 font-bold">{greeting.line1}</h1>
                <p className="text-black/55 mt-0.5 text-caption font-normal whitespace-nowrap">{greeting.line2}</p>
              </>
            ) : (
              <>
                <p className="text-black/90 text-body font-semibold">Employees</p>
                <p className="text-black/60 mt-0.5 text-caption font-normal whitespace-nowrap">Team strength, hiring, and workforce risk overview</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <label htmlFor="emp-date-range-filter" className="sr-only">Date range</label>
              <Calendar className="w-3.5 h-3.5 text-black/55 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
              <select
                id="emp-date-range-filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="appearance-none bg-white pl-8 pr-8 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
              >
                <option value="ytd">YTD</option>
                <option value="mtd">MTD</option>
                <option value="weekly">Weekly</option>
                <option value="q1">Q1</option>
                <option value="q2">Q2</option>
                <option value="q3">Q3</option>
                <option value="q4">Q4</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-black/55 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* ── SNAPSHOT (workforce state) — order matches the agreed lineup:
          Active → Past → Incoming → Resource Utilization ── */}
      <SectionLabel
        title="Snapshot"
        hint="State of the workforce this month"
      />
      <div className="grid grid-cols-4 gap-5 mb-8">

        <KpiCard
          Icon={Users}
          title="Active Employees"
          value={activeEmployees.total}
          delta={<DeltaPill direction="positive" value={`+${activeEmployees.change}`} suffix="" label="this month" />}
          onClick={() => setOpenKPI('active')}
          ariaLabel={`Active Employees ${activeEmployees.total}, plus ${activeEmployees.change} this month. Across 5 departments. Activate to view details.`}
        />

        <KpiCard
          Icon={UserMinus}
          title="Past Employees"
          value={<span className="text-[#E2445C]">{pastEmployees.total}</span>}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-emerald-50 text-emerald-700">
              <ArrowDown className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{pastEmployees.lastMonth} left</span>
              <span className="font-normal opacity-70 ml-0.5">last month (was {pastEmployees.prevLastMonth})</span>
            </span>
          }
          onClick={() => setOpenKPI('past')}
          ariaLabel={`Past Employees ${pastEmployees.total} over the last 6 months. ${pastEmployees.lastMonth} left last month, down from ${pastEmployees.prevLastMonth}. ${pastEmployees.resigned} resigned, ${pastEmployees.fired} terminated. Activate to view details.`}
        />

        <KpiCard
          Icon={UserPlus}
          title="Incoming Employees"
          value={<span className="text-[#00C875]">{incomingEmployees.total}</span>}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{incomingEmployees.backedOut} backed out</span>
              <span className="font-normal opacity-70 ml-0.5">· {incomingEmployees.joined} joined</span>
            </span>
          }
          onClick={() => setOpenKPI('incoming')}
          ariaLabel={`Incoming Employees ${incomingEmployees.total}: ${incomingEmployees.joined} joined, ${incomingEmployees.incoming} pending, ${incomingEmployees.backedOut} backed out, 1 date to be determined. Activate to view details.`}
        />

        <KpiCard
          Icon={Activity}
          title="Resource Utilization"
          value={<span className="tabular-nums">{utilization.avg}%</span>}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-amber-50 text-amber-700">
              <ArrowDown className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{utilization.target - utilization.avg}%</span>
              <span className="font-normal opacity-70 ml-0.5">below {utilization.target}% target</span>
            </span>
          }
          onClick={() => setOpenKPI('utilization')}
          ariaLabel={`Resource Utilization ${utilization.avg} percent, target ${utilization.target} percent. ${utilization.underUtilized} under 70 percent, ${utilization.overUtilized} over 90 percent. Activate to view details.`}
        />
      </div>

      {/* ── ACTION QUEUE (work needing attention) — six operational
          surfaces split across two 3-column rows. Top row is the new
          owner-load lineup (Incidents → Onboarding → Resource Requests);
          bottom row is the hiring + risks pipeline (Open Roles →
          Recruiter Funnel → Workforce Risks). Three columns instead of
          four so each card gets balanced breathing room. ── */}
      <SectionLabel
        title="Action Queue"
        hint="Operational queues, hiring pipeline, and workforce risks"
      />
      <div className="grid grid-cols-3 gap-5 mb-5">

        <KpiCard
          Icon={AlertTriangle}
          title="Employee Incidents"
          value={employeeIncidents.total}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
              <span className="tabular-nums">{employeeIncidents.high} high</span>
              <span className="font-normal opacity-70 ml-0.5">· {employeeIncidents.medium} medium priority</span>
            </span>
          }
          onClick={() => setOpenKPI('incidents')}
          ariaLabel={`Employee Incidents ${employeeIncidents.total}: ${employeeIncidents.high} high priority, ${employeeIncidents.medium} medium priority, ${employeeIncidents.open} open, ${employeeIncidents.inProgress} in progress, ${employeeIncidents.overTwoWeeks} open more than 14 days. Activate to view details.`}
        />

        <KpiCard
          Icon={ClipboardList}
          title="Onboarding"
          value={onboarding.total}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-amber-50 text-amber-700">
              <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{onboarding.stuck} stuck</span>
              <span className="font-normal opacity-70 ml-0.5">&gt; 10 days · {onboarding.longest}d longest</span>
            </span>
          }
          onClick={() => setOpenKPI('onboarding')}
          ariaLabel={`Onboarding ${onboarding.total} settling: longest ${onboarding.longest} days, ${onboarding.stuck} stuck more than 10 days, average ${onboarding.avgDays} days in flight, ${onboardingRows.filter(r => r.days <= 7).length} in their first week. Activate to view details.`}
        />

        <KpiCard
          Icon={Briefcase}
          title="Resource Requests"
          value={resourceRequestStats.total}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-amber-50 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              <span className="tabular-nums">{resourceRequestStats.open} open</span>
              <span className="font-normal opacity-70 ml-0.5">· {resourceRequestStats.fulfilled} fulfilled</span>
            </span>
          }
          onClick={() => setOpenKPI('resource-request')}
          ariaLabel={`Resource Requests ${resourceRequestStats.total} total: ${resourceRequestStats.open} open, ${resourceRequestStats.fulfilled} fulfilled, ${resourceRequestStats.activePositions} open positions, ${resourceRequestStats.high} high priority. Activate to view details.`}
        />
      </div>

      {/* ── HIRING PIPELINE (row 2 of Action Queue) — Recruiter Funnel
          and Workforce Risks. Same `grid-cols-3` rhythm as row 1 so
          each card keeps a consistent width across both Action Queue
          bands; the third cell sits empty rather than restretching the
          two cards (which would break the row-to-row column alignment). ── */}
      <div className="grid grid-cols-3 gap-5 mb-6">

        <KpiCard
          Icon={Filter}
          title="Recruiter Funnel"
          value={recruiterFunnel.sourced}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
              <span className="tabular-nums">{recruiterFunnel.hired} hired</span>
              <span className="font-normal opacity-70 ml-0.5">from {recruiterFunnel.sourced} sourced</span>
            </span>
          }
          onClick={() => setOpenKPI('recruiters')}
          ariaLabel={`Recruiter Funnel: ${recruiterFunnel.sourced} sourced, ${recruiterFunnel.calls} calls, ${recruiterFunnel.interviewsDone} interviews done, ${recruiterFunnel.offers} offers, ${recruiterFunnel.hired} hired this month. Activate to view funnel.`}
        />

        <KpiCard
          Icon={ShieldAlert}
          title="Workforce Risks"
          value={workforceRisks.total}
          delta={
            <span className="inline-flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full text-caption font-semibold bg-rose-50 text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
              <span className="tabular-nums">{workforceRisks.cla + workforceRisks.ntf} CLA/NTF</span>
              <span className="font-normal opacity-70 ml-0.5">· {workforceRisks.incidents} incidents</span>
            </span>
          }
          onClick={() => setOpenKPI('risks')}
          ariaLabel={`Workforce Risks ${workforceRisks.total}: ${workforceRisks.cla} CLA, ${workforceRisks.ntf} NTF, ${workforceRisks.incidents} incidents, ${workforceRisks.high} high severity, ${workforceRisks.medium} medium severity. Activate to view details.`}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DRAWER — single instance, body switches on openKPI                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {openKPI && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/30 z-[9998]"
            aria-hidden="true"
            onClick={() => setOpenKPI(null)}
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="emp-drawer-title"
            className="fixed top-0 right-0 h-screen w-[880px] max-w-[92vw] bg-white border-l border-black/[0.08] shadow-2xl z-[9999] flex flex-col overflow-hidden"
            style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Top bar */}
            <div className="px-7 py-5 border-b border-black/[0.06] flex items-start justify-between flex-shrink-0 bg-white relative z-10 gap-4">
              <div className="min-w-0 flex-1">
                <h2 id="emp-drawer-title" className="text-h2 font-bold text-black/90">{kpiMeta[openKPI].title}</h2>
                <p className="text-caption text-black/60 mt-1.5">{kpiMeta[openKPI].subtitle}</p>
              </div>
              <button
                ref={drawerCloseBtnRef}
                onClick={() => setOpenKPI(null)}
                className="w-9 h-9 rounded-md hover:bg-black/[0.06] flex items-center justify-center transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
                aria-label="Close drawer"
              >
                <X className="w-[18px] h-[18px] text-black/65" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {(() => {
                // Compose the table-top CTA once per drawer. The CTA
                // closes the drawer and routes to the deeper page —
                // same behaviour the old footer button used to carry,
                // just lifted up to land next to each table's filter
                // dropdown so it's on the same eye-line as the data
                // the HOD just scanned.
                //
                // Suppressed on drawers whose body already carries the
                // full picture (no deeper page worth linking to):
                //   • Recruiter Funnel → per-recruiter matrix inline
                //   • Resource Utilization → allocated / available
                //     hours breakdown inline.
                const ctaSuppressed = openKPI === 'recruiters' || openKPI === 'utilization';
                const tableCta: DrawerCta | undefined = ctaSuppressed ? undefined : {
                  label: kpiMeta[openKPI].routeLabel,
                  onClick: () => { setOpenKPI(null); router.push(kpiMeta[openKPI].route); },
                };
                return (
                  <>
                    {openKPI === 'active' && (
                      <ActiveDrawerBody
                        data={activeEmployees}
                        trend={headcountTrend}
                        roster={activeRoster}
                        service={drawerService}
                        setService={setDrawerService}
                        cta={tableCta}
                      />
                    )}
                    {openKPI === 'utilization' && (
                      <UtilizationDrawerBody
                        data={utilization}
                        trend={utilizationTrend}
                        rows={utilizationRows}
                        service={drawerService}
                        setService={setDrawerService}
                        formatLakh={formatLakh}
                      />
                    )}
                    {openKPI === 'past' && (
                      <PastDrawerBody
                        data={pastEmployees}
                        trend={exitsTrend}
                        rows={pastEmployeeRows}
                        service={drawerService}
                        setService={setDrawerService}
                        cta={tableCta}
                      />
                    )}
                    {openKPI === 'incoming' && (
                      <IncomingDrawerBody
                        data={incomingEmployees}
                        trend={incomingTrend}
                        rows={incomingRows}
                        service={drawerService}
                        setService={setDrawerService}
                        cta={tableCta}
                      />
                    )}
                    {openKPI === 'incidents' && (
                      <IncidentsDrawerBody
                        data={employeeIncidents}
                        incidents={incidentRows}
                        service={drawerService}
                        setService={setDrawerService}
                        cta={tableCta}
                      />
                    )}
                    {openKPI === 'onboarding' && (
                      <OnboardingDrawerBody
                        data={onboarding}
                        rows={onboardingRows}
                        service={drawerService}
                        setService={setDrawerService}
                        cta={tableCta}
                      />
                    )}
                    {openKPI === 'resource-request' && (
                      <ResourceRequestDrawerBody
                        data={resourceRequestStats}
                        requests={resourceRequestList}
                        trend={resourceRequestsTrend}
                        dept={drawerRequestDept}
                        setDept={setDrawerRequestDept}
                        cta={tableCta}
                      />
                    )}
                    {openKPI === 'recruiters' && (
                      <RecruitersDrawerBody
                        data={recruiterFunnel}
                        recruiters={recruiters}
                      />
                    )}
                    {openKPI === 'risks' && (
                      <RisksDrawerBody
                        data={workforceRisks}
                        trend={risksTrend}
                        cla={claRows}
                        risk={drawerRisk}
                        setRisk={setDrawerRisk}
                        cta={tableCta}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION LABEL — divider between SNAPSHOT and ACTION QUEUE
// ══════════════════════════════════════════════════════════════════════════════

function SectionLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <h2 className="text-caption font-bold text-black/70 uppercase tracking-[0.08em]">{title}</h2>
      <span className="text-caption text-black/60 font-normal">{hint}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED DRAWER PIECES
// ══════════════════════════════════════════════════════════════════════════════

function DrawerHero({
  value,
  label,
  delta,
}: {
  value: React.ReactNode;
  label: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="px-7 pt-6 pb-6">
      <p className="text-caption text-black/60 mb-1.5">{label}</p>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-display text-black/90 tabular-nums">{value}</span>
        {delta}
      </div>
    </div>
  );
}

function DrawerInsights({ items }: { items: { label: string; text: string }[] }) {
  return (
    <div className="px-7 pb-5">
      <div className="rounded-xl border border-black/[0.06] bg-[#FAFBFC] overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <p className="text-caption font-semibold text-black/60 uppercase tracking-wider">What this means</p>
        </div>
        <ul className="divide-y divide-black/[0.05]">
          {items.map((ins, idx) => (
            <li key={idx} className="flex gap-3.5 px-5 py-3.5">
              <span
                className="shrink-0 w-5 h-5 rounded-full bg-white border border-black/[0.08] flex items-center justify-center text-caption font-semibold text-black/70 tabular-nums"
                aria-hidden="true"
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-semibold text-black/75">{ins.label}</p>
                <p className="text-caption text-black/60 leading-[1.6] mt-1">{ins.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DrawerSectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="px-7 pt-2 pb-3 flex items-center justify-between gap-4">
      <h3 className="text-body font-bold text-black/85">{title}</h3>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/** Shared CTA shape — every drawer body that links out to a deeper
 *  page accepts a single `cta` prop with the label + click handler.
 *  Letting the parent compose the handler (close drawer → router push)
 *  keeps the button stateless inside the body. */
type DrawerCta = { label: string; onClick: () => void };

/** Brand-blue CTA pill the drawer renders next to its table's filter
 *  dropdown. Same chrome as the old footer button — moving it up
 *  alongside the dropdown puts the "go deeper" affordance on the same
 *  eye-line as the data the HOD just scanned, eliminating a long mouse
 *  trip down to the footer. */
function DrawerTableCta({ cta }: { cta: DrawerCta }) {
  return (
    <button
      type="button"
      onClick={cta.onClick}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#204CC7] hover:bg-[#1a3fa8] text-white text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7] focus-visible:ring-offset-2"
    >
      {cta.label}
      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
    </button>
  );
}

function ServiceFilterSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ServiceFilter;
  onChange: (v: ServiceFilter) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Filter by service</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ServiceFilter)}
        className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All services</option>
        <option value="A&T">Accounts &amp; Taxation</option>
        <option value="SEM">Performance Marketing</option>
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function DeptFilterSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: DeptFilter;
  onChange: (v: DeptFilter) => void;
  options: DeptFilter[];
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Filter by department</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as DeptFilter)}
        className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All depts</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function RiskFilterSelect({
  value,
  onChange,
}: {
  value: RiskFilter;
  onChange: (v: RiskFilter) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor="risks-filter" className="sr-only">Filter by risk type</label>
      <select
        id="risks-filter"
        value={value}
        onChange={(e) => onChange(e.target.value as RiskFilter)}
        className="appearance-none bg-white pl-3 pr-8 h-9 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All type</option>
        <option value="CLA">CLA only</option>
        <option value="NTF">NTF only</option>
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function ServiceTag({ service }: { service: 'A&T' | 'SEM' }) {
  // Both services share the same purple chip — the brand A&T cyan
  // tag was retired across the build for consistency with SEM. Same
  // treatment applied across CustomersOverview / Dashboard /
  // AllClients / CLAClients.
  return (
    <span className={`text-caption font-medium px-1.5 py-0.5 rounded ${
      service === 'SEM' ? 'bg-purple-50 text-[#7C3AED]' : 'bg-purple-50 text-[#7C3AED]'
    }`}>{service}</span>
  );
}

function StatBlock({ label, value, accent, accentBg }: { label: string; value: React.ReactNode; accent: string; accentBg: string }) {
  return (
    <div className={`rounded-xl border border-black/[0.06] ${accentBg} px-4 py-3.5`}>
      <p className="text-caption text-black/55 font-medium mb-1.5">{label}</p>
      <p className="text-h2 font-bold tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DRAWER BODIES
// ══════════════════════════════════════════════════════════════════════════════

// ─── 1. Active Employees ──────────────────────────────────────────────────────

function ActiveDrawerBody({
  data,
  trend,
  roster,
  service,
  setService,
  cta,
}: {
  data: { total: number; at: number; sem: number; sales: number; tech: number; hr: number; change: number; prevTotal: number };
  trend: { month: string; total: number; at: number; sem: number; other: number }[];
  roster: { name: string; role: string; service: 'A&T' | 'SEM'; dept: string; joined: string; utilization: number }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  cta?: DrawerCta;
}) {
  const filtered = service === 'All' ? roster : roster.filter(r => r.service === service);
  const momPct = data.prevTotal > 0 ? ((data.total - data.prevTotal) / data.prevTotal) * 100 : 0;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            +{momPct.toFixed(1)}% vs Mar ({data.prevTotal})
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Net headcount is climbing', text: `Team grew by ${data.change} this month — driven by SEM (+2) and Tech (+1). Replaces March attrition cleanly.` },
        { label: 'Service mix is SEM-heavy', text: `${data.sem} SEM (${Math.round((data.sem / data.total) * 100)}%) and ${data.at} A&T (${Math.round((data.at / data.total) * 100)}%). Sales (${data.sales}), Tech (${data.tech}), and HR (${data.hr}) round out the rest.` },
        { label: 'Watch the headline at month-end', text: 'Five incoming starts plus two backed-out offers in April. Net change next month depends on which incoming actually show up — check the Incoming card.' },
      ]} />

      <DrawerSectionTitle title="6-month headcount by service" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="emp-at-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_AT} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_AT} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="emp-sem-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C_SEM} stopOpacity={0.45} />
                <stop offset="100%" stopColor={C_SEM} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="emp-other-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} &apos;26</p>
                  <p className="text-[#06B6D4] font-semibold">A&amp;T: {payload.find(p => p.dataKey === 'at')?.value}</p>
                  <p className="text-[#7C3AED] font-semibold">SEM: {payload.find(p => p.dataKey === 'sem')?.value}</p>
                  <p className="text-black/65 font-semibold">Other: {payload.find(p => p.dataKey === 'other')?.value}</p>
                </div>
              ) : null}
            />
            <Area type="monotone" dataKey="at" stackId="1" stroke={C_AT} fill="url(#emp-at-grad)" strokeWidth={2} />
            <Area type="monotone" dataKey="sem" stackId="1" stroke={C_SEM} fill="url(#emp-sem-grad)" strokeWidth={2} />
            <Area type="monotone" dataKey="other" stackId="1" stroke="#94A3B8" fill="url(#emp-other-grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Roster — ${filtered.length} employees`}
        right={
          <>
            <ServiceFilterSelect id="active-service" value={service} onChange={setService} />
            {cta && <DrawerTableCta cta={cta} />}
          </>
        }
      />
      <DrawerTable
        ariaLabel="Active employees"
        head={['Employee', 'Role', 'Dept', 'Service', 'Utilization', 'Joined']}
        rows={filtered.map((r) => [
          <span key="n" className="text-body font-medium text-black/80">{r.name}</span>,
          <span key="r" className="text-caption text-black/65">{r.role}</span>,
          <span key="d" className="text-caption text-black/60">{r.dept}</span>,
          <ServiceTag key="s" service={r.service} />,
          <span key="u" className={`text-caption font-semibold tabular-nums ${r.utilization >= 85 ? 'text-[#00C875]' : r.utilization >= 70 ? 'text-black/70' : 'text-[#E2445C]'}`}>{r.utilization}%</span>,
          <span key="j" className="text-caption text-black/55">{r.joined}</span>,
        ])}
        align={['left', 'left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 2. Avg Utilization ───────────────────────────────────────────────────────

function UtilizationDrawerBody({
  data,
  trend,
  rows,
  service,
  setService,
  formatLakh,
}: {
  data: { avg: number; prevAvg: number; target: number; atAvg: number; semAvg: number; underUtilized: number; overUtilized: number };
  trend: { month: string; overall: number; at: number; sem: number }[];
  rows: { name: string; service: 'A&T' | 'SEM'; allocated: number; available: number; utilization: number; revCapacity: number }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  formatLakh: (v: number) => string;
}) {
  // The per-employee table is gone — the breakdown table below
  // already reaches person-level via its third drilldown, making
  // the flat list redundant. We keep `totalAvailable` so the
  // headroom calc in the Insights still has its denominator.
  const totalAvailable = rows.reduce((s, r) => s + r.available, 0);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={<span>{data.avg}%</span>}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            +{data.avg - data.prevAvg}% vs Mar ({data.prevAvg}%)
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${data.target - data.avg}% short of the ${data.target}% target`, text: `Overall utilization climbed back to ${data.avg}% after March's dip to ${data.prevAvg}%, but we're still under the ${data.target}% target. Headroom is real: roughly ${formatLakh(Math.round((data.target - data.avg) / 100 * (totalAvailable * 1000)))} of monthly capacity sits unbilled.` },
        { label: 'SEM is pulling its weight', text: `SEM utilization is ${data.semAvg}%, close to target. A&T is ${data.atAvg}% — the gap is in advisory hours that aren't being booked, not in headcount.` },
        { label: `${data.underUtilized} under-utilized, ${data.overUtilized} over-utilized`, text: `Neha Desai is at 42% — she's a March hire still ramping. Priya Sharma is at 90% — she's at the burnout edge. Both warrant load rebalancing this week.` },
      ]} />

      <DrawerSectionTitle title="6-month utilization trend (%)" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="util-overall-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={36} unit="%" domain={[60, 100]} />
            <Tooltip
              cursor={{ stroke: 'rgba(0,0,0,0.08)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} &apos;26</p>
                  <p className="text-[#204CC7] font-semibold">Overall: {payload.find(p => p.dataKey === 'overall')?.value}%</p>
                  <p className="text-[#06B6D4] font-semibold">A&amp;T: {payload.find(p => p.dataKey === 'at')?.value}%</p>
                  <p className="text-[#7C3AED] font-semibold">SEM: {payload.find(p => p.dataKey === 'sem')?.value}%</p>
                </div>
              ) : null}
            />
            <ReferenceLine y={data.target} stroke={GREEN} strokeDasharray="4 4" strokeWidth={1.5}>
              <></>
            </ReferenceLine>
            <Area type="monotone" dataKey="overall" stroke={BLUE} fill="url(#util-overall-grad)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Resource Utilization Breakdown — drillable Service → Role
          → Person view, mirroring the Hours Available drawer on
          Home so the Employees admin gets the same narrative
          without surface-hopping. The flat per-employee table that
          previously sat below this section was removed: the
          breakdown's third drilldown level already reaches the
          person, so two tables answered the same question. */}
      <ResourceUtilizationBreakdownTable />
    </>
  );
}

// ─── 3. Past Employees ────────────────────────────────────────────────────────

function PastDrawerBody({
  data,
  trend,
  rows,
  service,
  setService,
  cta,
}: {
  data: { total: number; at: number; sem: number; other: number; fired: number; resigned: number; lastMonth: number; prevLastMonth: number };
  trend: { month: string; at: number; sem: number; total: number }[];
  rows: { name: string; role: string; service: 'A&T' | 'SEM'; dept: string; exitType: 'Fired' | 'Resigned'; reason: string; exitDate: string }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  cta?: DrawerCta;
}) {
  const filtered = service === 'All' ? rows : rows.filter(r => r.service === service);

  return (
    <>
      <DrawerHero
        label="Last 6 months · Apr 2026"
        value={<span className="text-[#E2445C]">{data.total}</span>}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-emerald-50 text-emerald-600">
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            {data.prevLastMonth - data.lastMonth} fewer vs Mar ({data.prevLastMonth} → {data.lastMonth})
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'March was the spike — April normalised', text: `${data.lastMonth} exits in April vs ${data.prevLastMonth} in March. The Mar spike was driven by 3 SEM resignations in the same week — looks like a tactical loss to a competitor, not a culture issue.` },
        { label: 'SEM accounts for half of all exits', text: `${data.sem} of ${data.total} past employees came from SEM. ${data.fired} of all exits were terminations; ${data.resigned} resigned. Resignations dominate, which is normal for a competitive talent market.` },
        { label: 'Two roles to backfill urgently', text: 'Aditya Rao (SEM Manager) and Vikram Shah (A&T Specialist) left in March. Both are billable senior roles — see Open Roles for the replacements in flight.' },
      ]} />

      <DrawerSectionTitle title="6-month exits by service" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} &apos;26</p>
                  <p className="text-[#06B6D4] font-semibold">A&amp;T: {payload.find(p => p.dataKey === 'at')?.value}</p>
                  <p className="text-[#7C3AED] font-semibold">SEM: {payload.find(p => p.dataKey === 'sem')?.value}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="at" stackId="1" fill={C_AT} radius={[0, 0, 0, 0]} />
            <Bar dataKey="sem" stackId="1" fill={C_SEM} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Exits — ${filtered.length}`}
        right={
          <>
            <ServiceFilterSelect id="past-service" value={service} onChange={setService} />
            {cta && <DrawerTableCta cta={cta} />}
          </>
        }
      />
      <DrawerTable
        ariaLabel="Past employees"
        head={['Employee', 'Role / Dept', 'Service', 'Exit Type', 'Reason', 'Exit']}
        rows={filtered.map((r) => [
          <span key="n" className="text-body font-medium text-black/80">{r.name}</span>,
          <div key="r" className="min-w-0">
            <p className="text-caption font-medium text-black/65">{r.role}</p>
            <p className="text-caption text-black/45 mt-0.5">{r.dept}</p>
          </div>,
          <ServiceTag key="s" service={r.service} />,
          <span key="t" className={`text-caption font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${
            r.exitType === 'Fired' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
          }`}>{r.exitType}</span>,
          <span key="re" className="text-caption text-black/60 line-clamp-2 leading-relaxed">{r.reason}</span>,
          <span key="d" className="text-caption text-black/55">{r.exitDate}</span>,
        ])}
        align={['left', 'left', 'left', 'left', 'left', 'left']}
      />
    </>
  );
}

// ─── 4. Incoming Employees ────────────────────────────────────────────────────

function IncomingDrawerBody({
  data,
  trend,
  rows,
  service,
  setService,
  cta,
}: {
  data: { total: number; joined: number; incoming: number; backedOut: number; at: number; sem: number; other: number };
  trend: { month: string; joined: number; backedOut: number }[];
  rows: { name: string; dept: string; service: 'A&T' | 'SEM'; date: string; status: 'Joined' | 'Incoming' | 'Backed Out' }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  cta?: DrawerCta;
}) {
  const filtered = service === 'All' ? rows : rows.filter(r => r.service === service);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={<span className="text-[#00C875]">{data.total}</span>}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-[#E2445C]">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {data.backedOut} backed out · {data.joined} joined · {data.incoming} pending
          </span>
        }
      />

      <DrawerInsights items={[
        { label: '2 backed-out offers is the headline risk', text: `Ankita Sharma and Ravi Menon both withdrew after accepting. That's a ${Math.round((data.backedOut / (data.backedOut + data.joined + data.incoming)) * 100)}% no-show rate. If this repeats next month, our offer-to-join conversion needs investigation — likely compensation benchmarking.` },
        { label: 'A&T is over-represented in incoming', text: `${data.at} of ${data.total} incoming joiners are A&T (${Math.round((data.at / data.total) * 100)}%). Healthy for the team's pipeline — the recently lost A&T specialists will be replaced before mid-May.` },
        { label: 'One TBD start date is a yellow flag', text: 'Amisha Desai (A&T) has no start date confirmed. If unresolved by week-end, treat as at-risk and re-engage Pooja for a backup candidate.' },
      ]} />

      <DrawerSectionTitle title="6-month joiner trend (with backed-out)" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} &apos;26</p>
                  <p className="text-[#00C875] font-semibold">Joined: {payload.find(p => p.dataKey === 'joined')?.value}</p>
                  <p className="text-[#E2445C] font-semibold">Backed out: {payload.find(p => p.dataKey === 'backedOut')?.value}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="joined" fill={GREEN} radius={[6, 6, 0, 0]} barSize={24} />
            <Bar dataKey="backedOut" fill={RED} radius={[6, 6, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Incoming list — ${filtered.length}`}
        right={
          <>
            <ServiceFilterSelect id="incoming-service" value={service} onChange={setService} />
            {cta && <DrawerTableCta cta={cta} />}
          </>
        }
      />
      <DrawerTable
        ariaLabel="Incoming employees"
        head={['Name', 'Dept', 'Service', 'Start Date', 'Status']}
        rows={filtered.map((r) => [
          <span key="n" className="text-body font-medium text-black/80">{r.name}</span>,
          <span key="d" className="text-caption text-black/60">{r.dept}</span>,
          <ServiceTag key="s" service={r.service} />,
          <span key="dt" className={`text-caption font-medium ${r.date === 'TBD' ? 'text-[#E2445C]' : 'text-black/65'}`}>{r.date}</span>,
          <span key="st" className={`text-caption font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${
            r.status === 'Joined' ? 'bg-[#00C875]/[0.08] text-[#00C875]'
            : r.status === 'Incoming' ? 'bg-[#204CC7]/[0.08] text-[#204CC7]'
            : 'bg-[#E2445C]/[0.08] text-[#E2445C]'
          }`}>{r.status}</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].status === 'Backed Out' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'left']}
      />
    </>
  );
}

// ─── 5. Open Roles ────────────────────────────────────────────────────────────

function OpenRolesDrawerBody({
  data,
  trend,
  rows,
  dept,
  setDept,
}: {
  data: { total: number; at: number; sem: number; sales: number; tech: number; interviewing: number; offerSent: number; active: number };
  trend: { month: string; open: number }[];
  rows: { id: number; dept: DeptFilter; position: string; count: string; recruiter: string; budget: string; status: 'Active' | 'Interviewing' | 'Offer Sent'; ageDays: number }[];
  dept: DeptFilter;
  setDept: (v: DeptFilter) => void;
}) {
  const filtered = dept === 'All' ? rows : rows.filter(r => r.dept === dept);
  const deptOptions: DeptFilter[] = ['A&T', 'SEM', 'Sales', 'Technology'];

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-amber-50 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            {data.interviewing} interviewing · {data.offerSent} offers out
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Sales is the biggest open bucket', text: `${data.sales} of ${data.total} open roles sit in Sales — concentrated in BDE roles for the new outbound team. Priyanka owns all three.` },
        { label: 'Two offers are in the wild', text: `Sales BDEs and the Tech full-stack role both have offers out. Both have backed-out risk based on this month's pattern — see Incoming card.` },
        { label: 'Aging matters', text: 'SEM Floaters req has been open 31 days with no candidates in pipeline. Either lower the bar or rescope — Ravina is sourcing but the salary band may be uncompetitive.' },
      ]} />

      <DrawerSectionTitle title="6-month open-roles trend" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} &apos;26</p>
                  <p className="text-[#204CC7] font-semibold">{payload[0]?.value} open roles</p>
                </div>
              ) : null}
            />
            <Bar dataKey="open" radius={[6, 6, 0, 0]} barSize={32}>
              {trend.map((d, idx) => (
                <Cell key={idx} fill={BLUE} opacity={idx === trend.length - 1 ? 1 : 0.5} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Open roles — ${filtered.length}`}
        right={<DeptFilterSelect id="roles-dept" value={dept} onChange={setDept} options={deptOptions} />}
      />
      <DrawerTable
        ariaLabel="Open roles"
        head={['Position', 'Dept', 'Recruiter', 'Budget', 'Age', 'Status']}
        rows={filtered.map((r) => [
          <div key="p" className="min-w-0">
            <p className="text-body font-medium text-black/80">{r.position}</p>
            <p className="text-caption text-black/55 mt-0.5">{r.count}</p>
          </div>,
          <span key="d" className="text-caption text-black/60">{r.dept}</span>,
          <span key="rc" className="text-caption font-medium text-black/65">{r.recruiter}</span>,
          <span key="b" className="text-caption text-black/65 tabular-nums">{r.budget}</span>,
          <span key="a" className={`text-caption font-semibold tabular-nums ${r.ageDays >= 30 ? 'text-[#E2445C]' : r.ageDays >= 21 ? 'text-amber-600' : 'text-black/65'}`}>{r.ageDays}d</span>,
          <span key="st" className={`text-caption font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${
            r.status === 'Offer Sent' ? 'bg-emerald-50 text-emerald-700'
            : r.status === 'Interviewing' ? 'bg-amber-50 text-amber-700'
            : 'bg-blue-50 text-blue-700'
          }`}>{r.status}</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].ageDays >= 30 ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 6. Recruiter Funnel ──────────────────────────────────────────────────────
// Per the design critique: the funnel shape *is* the story. Use a funnel
// visualisation + per-recruiter matrix instead of a chart.

type RecruiterMetric = 'sourced' | 'calls' | 'interviewsSet' | 'interviewsDone' | 'offers' | 'hired';
type RecruiterRow = { name: string; initials: string; color: string; focus: string; sourced: number; calls: number; interviewsSet: number; interviewsDone: number; offers: number; hired: number };

function RecruitersDrawerBody({
  data,
  recruiters: recruitersInitial,
}: {
  data: { sourced: number; calls: number; interviewsSet: number; interviewsDone: number; offers: number; hired: number; poojaSourced: number; ravinaSourced: number; priyankaSourced: number };
  recruiters: RecruiterRow[];
}) {
  // Local copy so cell edits persist for the duration of the
  // drawer session. The recruiting team uses this drawer as a
  // working surface — they paste the latest funnel counts in the
  // morning and adjust during the day. Wiring to a backend would
  // call the recruiter store on each change; today we mutate
  // local state and recompute totals on the fly.
  const [recruiters, setRecruiters] = useState<RecruiterRow[]>(recruitersInitial);

  // Totals derive from the live state on every render so the Total
  // row, the Hero headline, the conversion %, and the Insights
  // strings all stay in lockstep with whatever the admin has typed.
  const totals = recruiters.reduce(
    (s, r) => ({
      sourced: s.sourced + r.sourced,
      calls: s.calls + r.calls,
      interviewsSet: s.interviewsSet + r.interviewsSet,
      interviewsDone: s.interviewsDone + r.interviewsDone,
      offers: s.offers + r.offers,
      hired: s.hired + r.hired,
    }),
    { sourced: 0, calls: 0, interviewsSet: 0, interviewsDone: 0, offers: 0, hired: 0 },
  );

  const conversion = totals.sourced > 0 ? ((totals.hired / totals.sourced) * 100).toFixed(1) : '0.0';

  const updateCell = (rowIdx: number, key: RecruiterMetric, raw: string) => {
    // Empty input → 0; otherwise parse and clamp at 0. NaN guard
    // handles a stray "e" from the number input's exponent input.
    const parsed = raw === '' ? 0 : parseInt(raw, 10);
    const next = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
    setRecruiters(prev => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: next } : r)));
  };

  // Shared input chrome — looks like static text by default, picks
  // up a subtle background on hover and a brand-blue ring on focus
  // so the affordance reads at-a-glance without cluttering the
  // table. Native number-input spinner buttons are stripped.
  const inputBase = 'w-16 text-right bg-transparent border-0 tabular-nums rounded-md px-1.5 py-0.5 hover:bg-black/[0.04] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#204CC7]/30 transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={totals.sourced}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-[#E2445C]">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {totals.hired} hired · {conversion}% conversion
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Top of funnel is healthy, bottom is empty', text: `${totals.sourced} candidates sourced this month and the funnel collapses at the offer stage — zero offers extended, zero hires. The bottleneck is between "Interviews Done" (${totals.interviewsDone}) and "Offers" (${totals.offers}). Either interview bar is too high or the panel isn't deciding.` },
        { label: 'Pooja owns A&T, Ravina owns SEM, Priyanka is idle', text: `Pooja and Ravina are running parallel funnels of ~200 sourced each. Priyanka (Sales) hasn't started — Sales BDE roles need her funnel activated this week or those open roles will age past 30 days.` },
        { label: 'Where the leakage is biggest', text: `Pooja: 14 interviews set, only 5 done — scheduling failures or candidate drop-off. Ravina: 13 set, 10 done (better hand-off), but still no offers. Worth a panel debrief on what's blocking the close.` },
      ]} />

      <DrawerSectionTitle title="Per-recruiter matrix" />
      <div className="px-7 pb-7">
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Per-recruiter funnel — editable counts">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFBFC]">
                  <th className="px-5 py-3 text-left text-caption font-semibold text-black/55 uppercase tracking-wide">Recruiter</th>
                  {(['sourced', 'calls', 'interviewsSet', 'interviewsDone', 'offers', 'hired'] as const).map((k) => (
                    <th key={k} className="px-3 py-3 text-right text-caption font-semibold text-black/55 uppercase tracking-wide whitespace-nowrap">
                      {k === 'sourced' ? 'Sourced'
                        : k === 'calls' ? 'Calls'
                        : k === 'interviewsSet' ? 'Int. Set'
                        : k === 'interviewsDone' ? 'Int. Done'
                        : k === 'offers' ? 'Offers'
                        : 'Hired'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {recruiters.map((r, idx) => {
                  // Per-cell coloring carried over from the read-only
                  // version: rose when offers/hired are zero, emerald
                  // for non-zero hires. Computed against the live
                  // value so coloring updates as the admin edits.
                  const offersClass = r.offers === 0 ? 'text-[#E2445C] font-semibold' : 'text-black/75';
                  const hiredClass = r.hired === 0 ? 'text-[#E2445C] font-semibold' : 'text-[#00C875] font-semibold';
                  return (
                    <tr key={r.name} className="hover:bg-black/[0.015] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold text-white" style={{ backgroundColor: r.color }} aria-hidden="true">
                            {r.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-body font-medium text-black/80">{r.name}</p>
                            <p className="text-caption text-black/50">{r.focus} focus</p>
                          </div>
                        </div>
                      </td>
                      {(['sourced', 'calls', 'interviewsSet', 'interviewsDone'] as const).map((k) => (
                        <td key={k} className="px-3 py-3.5 text-right">
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={r[k]}
                            onChange={(e) => updateCell(idx, k, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            aria-label={`${k === 'sourced' ? 'Sourced' : k === 'calls' ? 'Calls' : k === 'interviewsSet' ? 'Interviews set' : 'Interviews done'} by ${r.name}`}
                            className={`${inputBase} text-body text-black/75`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-3.5 text-right">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={r.offers}
                          onChange={(e) => updateCell(idx, 'offers', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          aria-label={`Offers by ${r.name}`}
                          className={`${inputBase} text-body ${offersClass}`}
                        />
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={r.hired}
                          onChange={(e) => updateCell(idx, 'hired', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          aria-label={`Hired by ${r.name}`}
                          className={`${inputBase} text-body ${hiredClass}`}
                        />
                      </td>
                    </tr>
                  );
                })}
                {/* Total row stays read-only — it's a pure rollup of
                    the editable cells above. Editing it directly
                    would silently disagree with the rows. */}
                <tr className="bg-[#FAFBFC]">
                  <td className="px-5 py-3"><span className="text-caption font-bold text-black/70 uppercase tracking-wide">Total</span></td>
                  <td className="px-3 py-3 text-right"><span className="text-h3 text-black/85 tabular-nums">{totals.sourced}</span></td>
                  <td className="px-3 py-3 text-right"><span className="text-h3 text-black/85 tabular-nums">{totals.calls}</span></td>
                  <td className="px-3 py-3 text-right"><span className="text-h3 text-black/85 tabular-nums">{totals.interviewsSet}</span></td>
                  <td className="px-3 py-3 text-right"><span className="text-h3 text-black/85 tabular-nums">{totals.interviewsDone}</span></td>
                  <td className="px-3 py-3 text-right"><span className={`text-h3 tabular-nums ${totals.offers === 0 ? 'text-[#E2445C]' : 'text-black/85'}`}>{totals.offers}</span></td>
                  <td className="px-3 py-3 text-right"><span className={`text-h3 tabular-nums ${totals.hired === 0 ? 'text-[#E2445C]' : 'text-[#00C875]'}`}>{totals.hired}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 7. Onboarding ────────────────────────────────────────────────────────────
// Per the design critique: only 8 settling employees — a chart is overkill.
// Use a stats block + filterable table.

function OnboardingDrawerBody({
  data,
  rows,
  service,
  setService,
  cta,
}: {
  data: { total: number; at: number; sem: number; other: number; longest: number; avgDays: number; stuck: number };
  rows: { name: string; dept: string; service: 'A&T' | 'SEM'; days: number; buddy: string; status: 'Settling' }[];
  service: ServiceFilter;
  setService: (s: ServiceFilter) => void;
  cta?: DrawerCta;
}) {
  const filtered = service === 'All' ? rows : rows.filter(r => r.service === service);

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-amber-50 text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {data.stuck} stuck &gt; 10 days · {data.longest}d longest
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'Chetan Nare needs a check-in today', text: `Chetan is at 14 days — past the threshold where most onboards say they feel productive. Zubear is buddy; needs to confirm he's been routed to billable client work this week.` },
        { label: 'Daniya is unassigned', text: `Daniya S. (Technology) has no buddy assigned 3 days in. Tech doesn't have a Lead today, which is the root cause — escalate to Mihir L. for a temporary owner.` },
        { label: 'A&T cohort is the heaviest load', text: `Half of all onboarding (${data.at} of ${data.total}) sits in A&T. That's coordinated with the recent A&T attrition — the team is rebuilding. Watch for buddy fatigue on Zubear and Irshad.` },
      ]} />

      <DrawerSectionTitle title="At a glance" />
      <div className="px-7 pb-5">
        <div className="grid grid-cols-4 gap-3">
          <StatBlock label="Settling" value={data.total} accent={BLUE} accentBg="bg-blue-50/60" />
          <StatBlock label="Stuck > 10d" value={data.stuck} accent={RED} accentBg="bg-rose-50/60" />
          <StatBlock label="Longest" value={`${data.longest}d`} accent={AMBER} accentBg="bg-amber-50/60" />
          <StatBlock label="Avg days" value={`${data.avgDays}d`} accent={GREEN} accentBg="bg-emerald-50/60" />
        </div>
      </div>

      <DrawerSectionTitle
        title={`Onboarding list — ${filtered.length}`}
        right={
          <>
            <ServiceFilterSelect id="onb-service" value={service} onChange={setService} />
            {cta && <DrawerTableCta cta={cta} />}
          </>
        }
      />
      <DrawerTable
        ariaLabel="Onboarding employees"
        head={['Employee', 'Dept', 'Service', 'Days', 'Status']}
        rows={filtered.map((r) => [
          <span key="n" className="text-body font-medium text-black/80">{r.name}</span>,
          <span key="d" className="text-caption text-black/60">{r.dept}</span>,
          <ServiceTag key="s" service={r.service} />,
          <span key="dy" className={`text-caption font-bold tabular-nums ${r.days > 10 ? 'text-[#E2445C]' : r.days > 7 ? 'text-amber-600' : 'text-black/65'}`}>{r.days}d</span>,
          <span key="st" className="text-caption font-semibold px-2 py-0.5 rounded-md bg-[#FDAB3D]/[0.08] text-[#FDAB3D] whitespace-nowrap">{r.status}</span>,
        ])}
        rowHighlight={(idx) => filtered[idx].days > 10 ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'right', 'left']}
      />
    </>
  );
}

// ─── 8. Workforce Risks (CLA + NTF + Incidents) ───────────────────────────────

function RisksDrawerBody({
  data,
  trend,
  cla,
  risk,
  setRisk,
  cta,
}: {
  data: { total: number; cla: number; ntf: number; incidents: number; at: number; sem: number; internal: number; high: number; medium: number };
  trend: { month: string; cla: number; incidents: number }[];
  cla: { name: string; dept: string; service: 'A&T' | 'SEM'; type: 'CLA' | 'NTF'; severity: 'High' | 'Medium'; reason: string; responsible: string }[];
  risk: RiskFilter;
  setRisk: (v: RiskFilter) => void;
  cta?: DrawerCta;
}) {
  // The Open Incidents table that used to render alongside was
  // retired — Workforce Risks now scopes to CLA / NTF only. The
  // standalone Employee Incidents drawer remains the single home
  // for the incidents queue.
  const filteredCla = risk === 'CLA' ? cla.filter(c => c.type === 'CLA')
                    : risk === 'NTF' ? cla.filter(c => c.type === 'NTF')
                    : cla;

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-[#E2445C]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
            {data.high} high · {data.medium} medium
          </span>
        }
      />

      <DrawerInsights items={[
        { label: 'SEM concentrates the risk', text: `${data.sem} of ${data.total} active risks sit in SEM. Performance shortfalls (John Doe, Sarah Johnson) and client-facing incidents (Priya Sharma × 2) are the recurring patterns. Worth a Chinmay-led team review this week.` },
        { label: 'Sneha Patel\'s collections issue is the longest open', text: 'INC-005 has been open 45 days — invoice of ₹1.2L overdue with multiple unanswered follow-ups. Either escalate to Tejas for client conversation or write off and book the loss.' },
        { label: 'NTFs reflect normal attrition, not panic', text: `${data.ntf} NTF flags this month: Kavya (left for competitor) and Rahul Nair (contract not renewed for budget reasons). Neither is a culture signal — but Kavya's exit reason should inform A&T retention conversations.` },
      ]} />

      <DrawerSectionTitle title="6-month risk volume" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} &apos;26</p>
                  <p className="text-[#E2445C] font-semibold">CLA/NTF: {payload.find(p => p.dataKey === 'cla')?.value}</p>
                  <p className="text-[#FDAB3D] font-semibold">Incidents: {payload.find(p => p.dataKey === 'incidents')?.value}</p>
                </div>
              ) : null}
            />
            <Bar dataKey="cla" stackId="1" fill={RED} />
            <Bar dataKey="incidents" stackId="1" fill={AMBER} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`CLA / NTF — ${filteredCla.length}`}
        right={
          <>
            <RiskFilterSelect value={risk} onChange={setRisk} />
            {cta && <DrawerTableCta cta={cta} />}
          </>
        }
      />

      <DrawerTable
        ariaLabel="Workforce CLA and NTF"
        head={['Employee', 'Dept', 'Type', 'Severity', 'Reason', 'Owner']}
        rows={filteredCla.map((c) => [
          <span key="n" className="text-body font-medium text-black/80">{c.name}</span>,
          <span key="d" className="text-caption text-black/60">{c.dept}</span>,
          <span key="t" className={`text-caption font-semibold px-2 py-0.5 rounded-md ${
            c.type === 'CLA' ? 'bg-[#E2445C]/[0.08] text-[#E2445C]' : 'bg-[#7C3AED]/[0.08] text-[#7C3AED]'
          }`}>{c.type}</span>,
          <span key="s" className={`text-caption font-semibold px-2 py-0.5 rounded-md ${
            c.severity === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
          }`}>{c.severity}</span>,
          <span key="r" className="text-caption text-black/60 line-clamp-2 leading-relaxed">{c.reason}</span>,
          <span key="o" className="text-caption font-medium text-black/65">{c.responsible}</span>,
        ])}
        rowHighlight={(idx) => filteredCla[idx].type === 'NTF' ? 'bg-purple-50/30' : ''}
        align={['left', 'left', 'left', 'left', 'left', 'left']}
      />
    </>
  );
}

// ─── 9. Employee Incidents ────────────────────────────────────────────────────
// Standalone Incidents drawer (Workforce Risks combined CLA + Incidents; the
// new lineup splits them out so the operational queue stays focused). Hero
// = total open incidents, with high/medium and Open/In-Progress as the
// two key splits; insights call out the longest-running incidents and any
// SEM concentration; table shows the full list with priority + status +
// days-open chips.

function IncidentsDrawerBody({
  data,
  incidents,
  service,
  setService,
  cta,
}: {
  data: { total: number; high: number; medium: number; open: number; inProgress: number; at: number; sem: number; longest: number; overTwoWeeks: number };
  incidents: { id: string; date: string; employee: string; dept: string; service: 'A&T' | 'SEM'; priority: 'High' | 'Medium'; status: 'Open' | 'In Progress'; category: string; daysOpen: number; description: string }[];
  service: ServiceFilter;
  setService: (v: ServiceFilter) => void;
  cta?: DrawerCta;
}) {
  const filtered = service === 'All' ? incidents : incidents.filter(i => i.service === service);
  // Sort by date asc (oldest open issue first) so the HOD reads the
  // most-urgent unresolved incidents at the top of the table — same
  // intent as "longest open" but expressed through the Date column the
  // user asked for.
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));

  // "23 Apr" — month abbrev keeps the column narrow without losing year
  // context (we're in Apr 2026, so dropping the year is safe here).
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  return (
    <>
      <DrawerHero
        label="Apr 2026"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-rose-50 text-[#E2445C]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
            {data.high} high · {data.medium} medium
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${data.overTwoWeeks} incident${data.overTwoWeeks === 1 ? '' : 's'} open more than 14 days`, text: `Sneha Patel's collections issue (INC-005) tops the list at ${data.longest} days — invoice of ₹1.2L overdue with multiple unanswered follow-ups. Either escalate to Tejas for a client conversation or write off and book the loss. Two weeks is the threshold where the original context starts to fade.` },
        { label: `${data.sem} of ${data.total} sit in SEM`, text: `Performance Marketing carries the bulk of open incidents — Priya Sharma alone owns two (Zenith ROAS + Facebook ad-account suspension). Worth a Chinmay-led team review this week to triage the combined load and reassign anything stuck.` },
        { label: `${data.open} unstarted, ${data.inProgress} in progress`, text: `${data.open} incidents are still in "Open" without an owner actively working them. The 4 in-progress items have known owners and visible motion — the open ones are the riskier bucket because they're literally waiting for someone to decide.` },
      ]} />

      <DrawerSectionTitle title="At a glance" />
      <div className="px-7 pb-5">
        <div className="grid grid-cols-4 gap-3">
          <StatBlock label="Open" value={data.open} accent={AMBER} accentBg="bg-amber-50/60" />
          <StatBlock label="In progress" value={data.inProgress} accent={BLUE} accentBg="bg-blue-50/60" />
          <StatBlock label="High priority" value={data.high} accent={RED} accentBg="bg-rose-50/60" />
          <StatBlock label="Longest" value={`${data.longest}d`} accent={RED} accentBg="bg-rose-50/60" />
        </div>
      </div>

      <DrawerSectionTitle
        title={`Open incidents — ${sorted.length}`}
        right={
          <>
            <ServiceFilterSelect id="inc-service" value={service} onChange={setService} />
            {cta && <DrawerTableCta cta={cta} />}
          </>
        }
      />
      <DrawerTable
        ariaLabel="Open employee incidents"
        head={['Date', 'Employee', 'Category', 'Issue']}
        rows={sorted.map((i) => [
          <span key="dt" className="text-caption font-medium tabular-nums text-black/70 whitespace-nowrap">{fmtDate(i.date)}</span>,
          <span key="e" className="text-body font-medium text-black/80 whitespace-nowrap">{i.employee}</span>,
          <span key="c" className="text-caption font-medium text-black/65 whitespace-nowrap">{i.category}</span>,
          <span key="is" className="text-caption text-black/65 leading-relaxed line-clamp-2">{i.description}</span>,
        ])}
        rowHighlight={(idx) => sorted[idx].priority === 'High' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'left']}
      />
    </>
  );
}

// ─── 10. Resource Requests ────────────────────────────────────────────────────
// Mirror of the Resource Request page's table inside a drawer — same store,
// same row shape — so HODs can scan / drill from the Employees overview
// without losing context. Hero = total requests; chips break out the
// status mix (Open / In Review / Approved / Fulfilled / Rejected); table
// is sorted by priority then request date.

function ResourceRequestDrawerBody({
  data,
  requests,
  trend,
  dept,
  setDept,
  cta,
}: {
  data: {
    total: number; open: number; fulfilled: number;
    high: number; activePositions: number;
  };
  requests: ResourceRequest[];
  trend: { month: string; count: number }[];
  dept: string;
  setDept: (v: string) => void;
  cta?: DrawerCta;
}) {
  // Derive the list of departments straight from the requests so the
  // dropdown never offers an empty bucket. Sorted alphabetically for
  // stable rendering across re-renders.
  const departments = Array.from(new Set(requests.map(r => r.department))).sort();

  const filtered = dept === 'All' ? requests : requests.filter(r => r.department === dept);
  // Sort by priority bucket (High → Medium → Low) then by oldest
  // request date — the admin reads urgency-first, then queue age.
  const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
  const sorted = [...filtered].sort((a, b) => {
    const p = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (p !== 0) return p;
    return a.requestDate.localeCompare(b.requestDate);
  });

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  return (
    <>
      <DrawerHero
        label="All time"
        value={data.total}
        delta={
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-bold bg-amber-50 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            {data.open} open · {data.activePositions} positions
          </span>
        }
      />

      <DrawerInsights items={[
        { label: `${data.activePositions} open position${data.activePositions === 1 ? '' : 's'} across open requests`, text: `Open = the request is still on the recruiter's plate (sourcing, interviewing, offered). Each request can ask for multiple positions, so this number is what HR / recruiting is collectively on the hook for filling — not just the request count.` },
        { label: `${data.high} request${data.high === 1 ? '' : 's'} flagged High priority`, text: `These should be triaged first. High-priority requests usually map to client commitments or compliance deadlines — check the notes on each row to confirm what's driving the priority before working it.` },
        { label: `${data.fulfilled} closed-out`, text: `Fulfilled means someone has joined or the requirement is otherwise satisfied. The gap between Open and Fulfilled is your real "time to hire" backlog.` },
      ]} />

      <DrawerSectionTitle title="6-month resource-request trend" />
      <div className="px-7 pb-6 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <XAxis dataKey="month" tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 13, fill: 'rgba(0,0,0,0.45)' }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-white rounded-xl border border-black/[0.08] shadow-xl px-4 py-2.5 text-caption">
                  <p className="font-bold text-black/75 mb-1">{label} &apos;26</p>
                  <p className="text-[#204CC7] font-semibold">{payload[0]?.value} request{payload[0]?.value === 1 ? '' : 's'} raised</p>
                </div>
              ) : null}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
              {trend.map((d, idx) => (
                <Cell key={idx} fill={BLUE} opacity={idx === trend.length - 1 ? 1 : 0.5} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DrawerSectionTitle
        title={`Requests — ${sorted.length}`}
        right={
          <>
            <RequestDepartmentFilterSelect value={dept} onChange={setDept} departments={departments} />
            {cta && <DrawerTableCta cta={cta} />}
          </>
        }
      />
      <DrawerTable
        ariaLabel="Resource requests"
        head={['Request', 'Department', 'Role', 'Positions', 'Budget', 'Recruiter']}
        rows={sorted.map((r) => [
          <div key="rq" className="min-w-0">
            <p className="text-caption font-mono font-semibold text-[#204CC7]">{r.requestId}</p>
            <p className="text-caption text-black/55 mt-0.5">by {r.requestedBy} · {fmtDate(r.requestDate)}</p>
          </div>,
          <span key="d" className="text-caption text-black/65">{r.department}</span>,
          <span key="ro" className="text-body font-medium text-black/80">{r.role}</span>,
          <span key="p" className="text-caption font-bold tabular-nums text-[#204CC7]">{r.positions}</span>,
          // Budget — monthly compensation band. Falls back to a quiet
          // "—" when the request didn't pin a range so the column reads
          // as "no range yet" rather than missing data.
          r.budget ? (
            <span key="bg" className="text-caption font-semibold tabular-nums text-black/75 whitespace-nowrap">{r.budget}</span>
          ) : (
            <span key="bg" className="text-caption text-black/35" aria-label="No budget specified">—</span>
          ),
          // Recruiter — initials avatar + name. Falls back to a quiet
          // "Unassigned" pill when the request hasn't been routed yet
          // so the column never reads as a missing value.
          r.recruiter ? (
            <div key="rc" className="inline-flex items-center gap-2 min-w-0">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white tabular-nums"
                style={{ backgroundColor:
                  r.recruiter === 'Ravina' ? '#06B6D4'
                  : r.recruiter === 'Pooja' ? '#7C3AED'
                  : r.recruiter === 'Priyanka' ? '#F59E0B'
                  : '#3B82F6'
                }}
                aria-hidden="true"
              >
                {r.recruiter.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-body font-medium text-black/80 truncate">{r.recruiter}</span>
            </div>
          ) : (
            <span key="rc" className="text-caption font-medium text-black/45 italic">Unassigned</span>
          ),
        ])}
        rowHighlight={(idx) => sorted[idx].priority === 'High' ? 'bg-rose-50/40' : ''}
        align={['left', 'left', 'left', 'right', 'left', 'left']}
      />
    </>
  );
}

// Local filter dropdown for the Resource Request drawer — narrows the
// requests table by department. The list of departments is computed
// from the request roster so the dropdown never offers an empty bucket.
function RequestDepartmentFilterSelect({
  value,
  onChange,
  departments,
}: {
  value: string;
  onChange: (v: string) => void;
  departments: string[];
}) {
  return (
    <div className="relative">
      <label htmlFor="rr-filter" className="sr-only">Filter by department</label>
      <select
        id="rr-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white pl-3 pr-7 py-1.5 rounded-md text-caption font-medium text-black/70 border border-black/10 hover:border-black/20 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/20 focus:border-[#204CC7]/30 transition-all cursor-pointer"
      >
        <option value="All">All departments</option>
        {departments.map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-black/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED DRAWER TABLE
// ══════════════════════════════════════════════════════════════════════════════

function DrawerTable({
  ariaLabel,
  head,
  rows,
  align,
  rowHighlight,
}: {
  ariaLabel: string;
  head: string[];
  rows: React.ReactNode[][];
  align: ('left' | 'right')[];
  rowHighlight?: (idx: number) => string;
}) {
  return (
    <div className="px-7 pb-7">
      <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label={ariaLabel}>
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFBFC]">
                {head.map((h, idx) => (
                  <th
                    key={idx}
                    className={`px-5 py-3 text-caption font-semibold text-black/55 uppercase tracking-wide ${align[idx] === 'right' ? 'text-right' : 'text-left'}`}
                    scope="col"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={head.length} className="px-5 py-8 text-center text-caption text-black/45">
                    No matching records.
                  </td>
                </tr>
              )}
              {rows.map((cells, ridx) => (
                <tr key={ridx} className={`hover:bg-black/[0.015] transition-colors ${rowHighlight ? rowHighlight(ridx) : ''}`}>
                  {cells.map((c, cidx) => (
                    <td key={cidx} className={`px-5 py-3 align-middle ${align[cidx] === 'right' ? 'text-right' : 'text-left'}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
