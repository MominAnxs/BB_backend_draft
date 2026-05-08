/* ═══════════════════════════════════════════════════════════════
   Dataroom shared data — used by Dataroom.tsx + ReportingModule
   ═══════════════════════════════════════════════════════════════ */

export type FileType = 'folder' | 'document' | 'spreadsheet' | 'image' | 'pdf' | 'presentation' | 'other';

export interface DriveItem {
  id: string;
  name: string;
  type: FileType;
  owner: { name: string; initials: string; color: string };
  modified: string;
  modifiedISO: string;
  size: string;
  sizeBytes: number;
  starred: boolean;
  shared: boolean;
  parentId: string | null;
}

export const owners = {
  brego: { name: 'Brego Business', initials: 'B', color: '#204CC7' },
  tejas: { name: 'Tejas Atha', initials: 'TA', color: '#3B82F6' },
  chinmay: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
  zubear: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
  mihir: { name: 'Mihir L.', initials: 'ML', color: '#F59E0B' },
  harshal: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
  me: { name: 'You', initials: 'JD', color: '#6366F1' },
};

// ═══════════════════════════════════════════════════════════════════
// FINANCE folder structure (A&T)
//
// Layout rule: only client folders sit directly under "Finance". Every
// client folder contains the same standard set of sub-folders (FY year
// rollups, GST Returns, TDS Computations, Compliance & Audits) so the
// firm has a consistent shape per client and the UI never has to ask
// "which client are these files for".
// ═══════════════════════════════════════════════════════════════════

type ClientFolderSeed = {
  id: string;            // becomes the folder id; sub-folders are `${id}-${suffix}`
  name: string;
  owner: typeof owners[keyof typeof owners];
  modified: string;
  modifiedISO: string;
  starred?: boolean;
  shared?: boolean;
};

// Mirrors the canonical A&T client roster from
// `workspace/AccountsTaxation.tsx`. Multi-business client groups
// collapse into one folder per group; single-business clients each
// get their own folder.
const FINANCE_CLIENT_SEEDS: ClientFolderSeed[] = [
  // Multi-business client groups
  { id: 'fin-c-patel',     name: 'Patel Group',          owner: owners.zubear,  modified: 'Mar 17, 2026', modifiedISO: '2026-03-17', starred: true,  shared: true },
  { id: 'fin-c-bilawala',  name: 'Bilawala Group',       owner: owners.harshal, modified: 'Mar 14, 2026', modifiedISO: '2026-03-14', shared: true },
  { id: 'fin-c-frr',       name: 'FRR Group',            owner: owners.zubear,  modified: 'Mar 16, 2026', modifiedISO: '2026-03-16', shared: true },
  { id: 'fin-c-atlas',     name: 'Atlas Group',          owner: owners.zubear,  modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', shared: true },
  { id: 'fin-c-mehta',     name: 'Mehta Family Office',  owner: owners.harshal, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', starred: true,  shared: true },
  { id: 'fin-c-rama',      name: 'Rama Hospitality',     owner: owners.zubear,  modified: 'Mar 13, 2026', modifiedISO: '2026-03-13', shared: true },
  // Single-business clients (alphabetical)
  { id: 'fin-c-99pan',     name: '99 Pancakes',          owner: owners.zubear,  modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', shared: true },
  { id: 'fin-c-anaya',     name: 'Anaya Collections',    owner: owners.zubear,  modified: 'Mar 11, 2026', modifiedISO: '2026-03-11', shared: true },
  { id: 'fin-c-aryan',     name: 'Aryan Pharmaceuticals',owner: owners.zubear,  modified: 'Mar 9, 2026',  modifiedISO: '2026-03-09', shared: false },
  { id: 'fin-c-bluewave',  name: 'BlueWave Logistics',   owner: owners.harshal, modified: 'Mar 7, 2026',  modifiedISO: '2026-03-07', shared: true },
  { id: 'fin-c-coastal',   name: 'Coastal Realty',       owner: owners.zubear,  modified: 'Mar 6, 2026',  modifiedISO: '2026-03-06', shared: true },
  { id: 'fin-c-dhanraj',   name: 'Dhanraj & Sons',       owner: owners.zubear,  modified: 'Mar 4, 2026',  modifiedISO: '2026-03-04', shared: true },
  { id: 'fin-c-fundmart',  name: 'Fundmart India',       owner: owners.harshal, modified: 'Mar 8, 2026',  modifiedISO: '2026-03-08', shared: true },
  { id: 'fin-c-greenfield',name: 'Greenfield Exports',   owner: owners.harshal, modified: 'Mar 3, 2026',  modifiedISO: '2026-03-03', shared: false },
  { id: 'fin-c-horizon',   name: 'Horizon Technologies', owner: owners.zubear,  modified: 'Feb 28, 2026', modifiedISO: '2026-02-28', shared: true },
  { id: 'fin-c-indus',     name: 'Indus Textiles',       owner: owners.harshal, modified: 'Feb 27, 2026', modifiedISO: '2026-02-27', shared: true },
  { id: 'fin-c-jupiter',   name: 'Jupiter Consulting',   owner: owners.harshal, modified: 'Feb 26, 2026', modifiedISO: '2026-02-26', shared: false },
  { id: 'fin-c-kavita',    name: 'Kavita Garments',      owner: owners.harshal, modified: 'Feb 25, 2026', modifiedISO: '2026-02-25', shared: true },
  { id: 'fin-c-mahalaxmi', name: 'Mahalaxmi Traders',    owner: owners.zubear,  modified: 'Feb 24, 2026', modifiedISO: '2026-02-24', shared: true },
  { id: 'fin-c-pankaj',    name: 'Pankaj & Associates',  owner: owners.harshal, modified: 'Feb 23, 2026', modifiedISO: '2026-02-23', shared: false },
  { id: 'fin-c-purewell',  name: 'PureWell Organics',    owner: owners.harshal, modified: 'Feb 22, 2026', modifiedISO: '2026-02-22', shared: true },
  { id: 'fin-c-sahyadri',  name: 'Sahyadri Electronics', owner: owners.harshal, modified: 'Feb 21, 2026', modifiedISO: '2026-02-21', shared: true },
  { id: 'fin-c-saraswati', name: 'Saraswati Books',      owner: owners.zubear,  modified: 'Feb 20, 2026', modifiedISO: '2026-02-20', shared: true },
  { id: 'fin-c-shubham',   name: 'Shubham Realtors',     owner: owners.harshal, modified: 'Feb 19, 2026', modifiedISO: '2026-02-19', shared: false },
  { id: 'fin-c-techcorp',  name: 'TechCorp India',       owner: owners.zubear,  modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', starred: true,  shared: true },
  { id: 'fin-c-trident',   name: 'Trident Auto Parts',   owner: owners.zubear,  modified: 'Feb 18, 2026', modifiedISO: '2026-02-18', shared: true },
  { id: 'fin-c-vasudha',   name: 'Vasudha Foods',        owner: owners.zubear,  modified: 'Feb 17, 2026', modifiedISO: '2026-02-17', shared: true },
  { id: 'fin-c-veena',     name: 'Veena Boutique',       owner: owners.harshal, modified: 'Feb 16, 2026', modifiedISO: '2026-02-16', shared: true },
  { id: 'fin-c-yash',      name: 'Yash Industries',      owner: owners.zubear,  modified: 'Feb 15, 2026', modifiedISO: '2026-02-15', shared: true },
  { id: 'fin-c-zenith',    name: 'Zenith Realty',        owner: owners.harshal, modified: 'Feb 14, 2026', modifiedISO: '2026-02-14', shared: true },
];

// Standard set of sub-folders rendered inside every client folder. The
// suffixes feed into the deterministic id for each sub-folder so we can
// place files into them later (e.g. `fin-c-techcorp-fy26`).
const CLIENT_SUB_FOLDERS: { suffix: string; name: string; modified: string; modifiedISO: string }[] = [
  { suffix: 'fy26',  name: 'FY 2025-26',         modified: 'Mar 18, 2026', modifiedISO: '2026-03-18' },
  { suffix: 'fy25',  name: 'FY 2024-25',         modified: 'Apr 1, 2025',  modifiedISO: '2025-04-01' },
  { suffix: 'gst',   name: 'GST Returns',        modified: 'Mar 15, 2026', modifiedISO: '2026-03-15' },
  { suffix: 'tds',   name: 'TDS Computations',   modified: 'Mar 10, 2026', modifiedISO: '2026-03-10' },
  { suffix: 'audit', name: 'Compliance & Audits',modified: 'Feb 28, 2026', modifiedISO: '2026-02-28' },
];

const financeClientFolders: DriveItem[] = FINANCE_CLIENT_SEEDS.map((c) => ({
  id: c.id,
  name: c.name,
  type: 'folder',
  owner: c.owner,
  modified: c.modified,
  modifiedISO: c.modifiedISO,
  size: '—',
  sizeBytes: 0,
  starred: c.starred ?? false,
  shared: c.shared ?? true,
  parentId: 'root-fin',
}));

const financeClientSubFolders: DriveItem[] = FINANCE_CLIENT_SEEDS.flatMap((c) =>
  CLIENT_SUB_FOLDERS.map((sub) => ({
    id: `${c.id}-${sub.suffix}`,
    name: sub.name,
    type: 'folder' as const,
    owner: c.owner,
    modified: sub.modified,
    modifiedISO: sub.modifiedISO,
    size: '—',
    sizeBytes: 0,
    starred: false,
    shared: c.shared ?? true,
    parentId: c.id,
  })),
);

export const allItems: DriveItem[] = [
  /* ─────────── ROOT FOLDERS ─────────── */
  { id: 'root-bg', name: 'Brego Group', type: 'folder', owner: owners.brego, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: null },
  { id: 'root-pm', name: 'Performance Marketing', type: 'folder', owner: owners.brego, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: null },
  { id: 'root-fin', name: 'Finance', type: 'folder', owner: owners.brego, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: null },

  /* ═══════ BREGO GROUP (internal) ═══════ */
  { id: 'bg-policies', name: 'Company Policies', type: 'folder', owner: owners.brego, modified: 'Jan 10, 2026', modifiedISO: '2026-01-10', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-bg' },
  { id: 'bg-hr', name: 'HR & People', type: 'folder', owner: owners.tejas, modified: 'Mar 5, 2026', modifiedISO: '2026-03-05', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-bg' },
  { id: 'bg-ops', name: 'Operations', type: 'folder', owner: owners.brego, modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-bg' },
  { id: 'bg-strategy', name: 'Strategy & Planning', type: 'folder', owner: owners.tejas, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: 'root-bg' },
  { id: 'bg-training', name: 'Training Library', type: 'folder', owner: owners.brego, modified: 'Feb 15, 2026', modifiedISO: '2026-02-15', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-bg' },
  { id: 'bg-legal', name: 'Legal & Contracts', type: 'folder', owner: owners.tejas, modified: 'Feb 28, 2026', modifiedISO: '2026-02-28', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-bg' },
  { id: 'bg-f1', name: 'Brand Guidelines v4.pdf', type: 'pdf', owner: owners.brego, modified: 'Mar 1, 2026', modifiedISO: '2026-03-01', size: '5.2 MB', sizeBytes: 5452595, starred: true, shared: true, parentId: 'root-bg' },
  { id: 'bg-f2', name: 'Q2 Resource Plan.xlsx', type: 'spreadsheet', owner: owners.tejas, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '960 KB', sizeBytes: 983040, starred: false, shared: false, parentId: 'root-bg' },
  { id: 'bg-s-f1', name: 'Q1 OKR Review.pdf', type: 'pdf', owner: owners.tejas, modified: 'Mar 16, 2026', modifiedISO: '2026-03-16', size: '1.8 MB', sizeBytes: 1887436, starred: true, shared: true, parentId: 'bg-strategy' },
  { id: 'bg-s-f2', name: 'Board Deck — March 2026.pdf', type: 'presentation', owner: owners.tejas, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '8.4 MB', sizeBytes: 8808038, starred: false, shared: false, parentId: 'bg-strategy' },
  { id: 'bg-s-f3', name: 'Annual Budget 2026-27.xlsx', type: 'spreadsheet', owner: owners.tejas, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '1.1 MB', sizeBytes: 1153434, starred: false, shared: true, parentId: 'bg-strategy' },
  { id: 'bg-hr-f1', name: 'Employee Handbook v3.pdf', type: 'pdf', owner: owners.tejas, modified: 'Feb 10, 2026', modifiedISO: '2026-02-10', size: '2.3 MB', sizeBytes: 2411724, starred: false, shared: true, parentId: 'bg-hr' },
  { id: 'bg-hr-f2', name: 'Org Chart — March 2026.pdf', type: 'pdf', owner: owners.brego, modified: 'Mar 5, 2026', modifiedISO: '2026-03-05', size: '680 KB', sizeBytes: 696320, starred: false, shared: true, parentId: 'bg-hr' },
  { id: 'bg-pol-f1', name: 'Leave Policy 2026.pdf', type: 'pdf', owner: owners.brego, modified: 'Jan 5, 2026', modifiedISO: '2026-01-05', size: '340 KB', sizeBytes: 348160, starred: false, shared: true, parentId: 'bg-policies' },
  { id: 'bg-pol-f2', name: 'Remote Work Guidelines.pdf', type: 'pdf', owner: owners.tejas, modified: 'Jan 10, 2026', modifiedISO: '2026-01-10', size: '290 KB', sizeBytes: 296960, starred: false, shared: true, parentId: 'bg-policies' },
  { id: 'bg-pol-f3', name: 'Code of Conduct.pdf', type: 'pdf', owner: owners.brego, modified: 'Dec 20, 2025', modifiedISO: '2025-12-20', size: '410 KB', sizeBytes: 419840, starred: false, shared: true, parentId: 'bg-policies' },

  /* ═══════ PERFORMANCE MARKETING ═══════ */
  { id: 'pm-99p', name: '99 Pancakes', type: 'folder', owner: owners.chinmay, modified: 'Mar 17, 2026', modifiedISO: '2026-03-17', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: 'root-pm' },
  { id: 'pm-alpine', name: 'Alpine Group', type: 'folder', owner: owners.harshal, modified: 'Mar 16, 2026', modifiedISO: '2026-03-16', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-anaya', name: 'Anaya College', type: 'folder', owner: owners.chinmay, modified: 'Mar 14, 2026', modifiedISO: '2026-03-14', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-flavor', name: 'Flavor Nation', type: 'folder', owner: owners.chinmay, modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-zenith', name: 'Zenith Realty', type: 'folder', owner: owners.harshal, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-pm' },
  { id: 'pm-sops', name: 'SOPs & Processes', type: 'folder', owner: owners.brego, modified: 'Feb 20, 2026', modifiedISO: '2026-02-20', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-pm' },
  { id: 'pm-creatives', name: 'Ad Creatives Library', type: 'folder', owner: owners.chinmay, modified: 'Mar 14, 2026', modifiedISO: '2026-03-14', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-f1', name: 'Q1 ROAS Summary.pdf', type: 'pdf', owner: owners.chinmay, modified: 'Mar 17, 2026', modifiedISO: '2026-03-17', size: '2.4 MB', sizeBytes: 2516582, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-f2', name: 'Budget Allocation — Q2.xlsx', type: 'spreadsheet', owner: owners.harshal, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '780 KB', sizeBytes: 798720, starred: true, shared: false, parentId: 'root-pm' },
  { id: 'pm-99p-f1', name: 'Monthly Report — March.pdf', type: 'pdf', owner: owners.chinmay, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '3.2 MB', sizeBytes: 3355443, starred: false, shared: true, parentId: 'pm-99p' },
  { id: 'pm-99p-f2', name: 'Ad Spend Breakdown.xlsx', type: 'spreadsheet', owner: owners.chinmay, modified: 'Mar 16, 2026', modifiedISO: '2026-03-16', size: '920 KB', sizeBytes: 942080, starred: false, shared: false, parentId: 'pm-99p' },
  { id: 'pm-99p-f3', name: 'Banner_v3_Final.png', type: 'image', owner: owners.me, modified: 'Mar 13, 2026', modifiedISO: '2026-03-13', size: '2.8 MB', sizeBytes: 2936012, starred: false, shared: true, parentId: 'pm-99p' },
  { id: 'pm-alp-f1', name: 'Performance Deck — Q1.pdf', type: 'presentation', owner: owners.harshal, modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '5.1 MB', sizeBytes: 5347737, starred: true, shared: true, parentId: 'pm-alpine' },
  { id: 'pm-alp-f2', name: 'LinkedIn_Creative_A.png', type: 'image', owner: owners.me, modified: 'Mar 11, 2026', modifiedISO: '2026-03-11', size: '1.9 MB', sizeBytes: 1992294, starred: false, shared: false, parentId: 'pm-alpine' },
  { id: 'pm-alp-f3', name: 'Campaign Budget.xlsx', type: 'spreadsheet', owner: owners.harshal, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '640 KB', sizeBytes: 655360, starred: false, shared: true, parentId: 'pm-alpine' },
  { id: 'pm-ana-f1', name: 'Ad Spend Analysis.xlsx', type: 'spreadsheet', owner: owners.chinmay, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '1.1 MB', sizeBytes: 1153434, starred: false, shared: false, parentId: 'pm-anaya' },
  { id: 'pm-ana-f2', name: 'Lead Gen Report — Feb.pdf', type: 'pdf', owner: owners.chinmay, modified: 'Mar 8, 2026', modifiedISO: '2026-03-08', size: '1.6 MB', sizeBytes: 1677722, starred: false, shared: true, parentId: 'pm-anaya' },

  /* ═══════ FINANCE (A&T) ═══════
     Only client folders sit directly under "Finance". The standard
     financial sub-folders (FY 2025-26, FY 2024-25, GST Returns, TDS
     Computations, Compliance & Audits) live INSIDE each client folder
     so the firm has one consistent shape per client. Folders + sub-
     folders are generated from `FINANCE_CLIENT_SEEDS` above. */

  ...financeClientFolders,
  ...financeClientSubFolders,

  // ── Representative sample files inside specific client paths ─────
  // Just enough so when a user drills into a client → sub-folder the
  // detail isn't completely empty. Keyed off the deterministic
  // `${client-id}-${suffix}` ids generated above.
  { id: 'fin-tc-fy26-f1', name: 'Financials — Q4.xlsx',          type: 'spreadsheet', owner: owners.zubear,  modified: 'Mar 5, 2026',  modifiedISO: '2026-03-05', size: '890 KB', sizeBytes: 911360,  starred: false, shared: true,  parentId: 'fin-c-techcorp-fy26' },
  { id: 'fin-tc-fy26-f2', name: 'IT Return FY25-26.pdf',         type: 'pdf',         owner: owners.zubear,  modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '1.4 MB', sizeBytes: 1468006, starred: false, shared: false, parentId: 'fin-c-techcorp-fy26' },
  { id: 'fin-tc-gst-f1',  name: 'GSTR-3B March.xlsx',            type: 'spreadsheet', owner: owners.zubear,  modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '210 KB', sizeBytes: 215040,  starred: false, shared: true,  parentId: 'fin-c-techcorp-gst' },
  { id: 'fin-pat-fy26-f1',name: 'Consolidated P&L FY25-26.xlsx', type: 'spreadsheet', owner: owners.zubear,  modified: 'Mar 17, 2026', modifiedISO: '2026-03-17', size: '2.4 MB', sizeBytes: 2516582, starred: true,  shared: true,  parentId: 'fin-c-patel-fy26' },
  { id: 'fin-pat-audit-f1',name: 'FY25-26 Audit Report.pdf',     type: 'pdf',         owner: owners.zubear,  modified: 'Feb 28, 2026', modifiedISO: '2026-02-28', size: '3.6 MB', sizeBytes: 3774873, starred: false, shared: false, parentId: 'fin-c-patel-audit' },
  { id: 'fin-mht-audit-f1',name: 'Family Office Audit.pdf',      type: 'pdf',         owner: owners.harshal, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '3.2 MB', sizeBytes: 3355443, starred: true,  shared: false, parentId: 'fin-c-mehta-audit' },
  { id: 'fin-99-fy26-f1', name: 'P&L — March 2026.xlsx',         type: 'spreadsheet', owner: owners.zubear,  modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '740 KB', sizeBytes: 757760,  starred: false, shared: true,  parentId: 'fin-c-99pan-fy26' },
  { id: 'fin-atl-tds-f1', name: 'TDS Q4 Computation.xlsx',       type: 'spreadsheet', owner: owners.zubear,  modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '420 KB', sizeBytes: 430080,  starred: false, shared: true,  parentId: 'fin-c-atlas-tds' },
];
