'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search, FolderOpen, File, Download, Share2, MoreVertical,
  Upload, FolderPlus, Grid3x3, List, Star, Clock, Users,
  FileText, Image as ImageIcon, FileSpreadsheet,
  ChevronRight, Home, Trash2, Eye, ChevronDown,
  HardDrive, Plus, X, Check, Copy, Link2, Info,
  Shield, History, AlertTriangle, UploadCloud, FileUp,
  Building2, Megaphone, IndianRupee,
} from 'lucide-react';

/* ═══════════════════════════ Types ═══════════════════════════ */
type FileType = 'folder' | 'document' | 'spreadsheet' | 'image' | 'pdf' | 'presentation' | 'other';
type QuickAccess = 'drive' | 'shared' | 'starred' | 'recent' | 'trash';
type OwnerFilter = 'all' | 'me' | 'brego';
type SortField = 'name' | 'modified' | 'size';
type SortDir = 'asc' | 'desc';

interface DriveItem {
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

interface ActivityItem {
  user: string;
  initials: string;
  color: string;
  action: string;
  target: string;
  time: string;
}

/* ═══════════════════════════ Constants ═══════════════════════════ */
const owners = {
  brego: { name: 'Brego Business', initials: 'B', color: '#204CC7' },
  tejas: { name: 'Tejas Atha', initials: 'TA', color: '#3B82F6' },
  chinmay: { name: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED' },
  zubear: { name: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4' },
  mihir: { name: 'Mihir L.', initials: 'ML', color: '#F59E0B' },
  harshal: { name: 'Harshal R.', initials: 'HR', color: '#10B981' },
  me: { name: 'You', initials: 'JD', color: '#6366F1' },
};

/* Root folder accent colours (for sidebar icons) */
const rootFolderMeta: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  'root-bg': { color: '#204CC7', icon: Building2 },
  'root-pm': { color: '#7C3AED', icon: Megaphone },
  'root-fin': { color: '#06B6D4', icon: IndianRupee },
};

/* ═══════════════════════════ Mock Data ═══════════════════════════ */
const allItems: DriveItem[] = [
  /* ─────────── ROOT FOLDERS ─────────── */
  { id: 'root-bg', name: 'Brego Group', type: 'folder', owner: owners.brego, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: null },
  { id: 'root-pm', name: 'Performance Marketing', type: 'folder', owner: owners.brego, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: null },
  { id: 'root-fin', name: 'Finance', type: 'folder', owner: owners.brego, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: null },

  /* ═══════ BREGO GROUP (internal) ═══════ */
  // Level-2 folders
  { id: 'bg-policies', name: 'Company Policies', type: 'folder', owner: owners.brego, modified: 'Jan 10, 2026', modifiedISO: '2026-01-10', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-bg' },
  { id: 'bg-hr', name: 'HR & People', type: 'folder', owner: owners.tejas, modified: 'Mar 5, 2026', modifiedISO: '2026-03-05', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-bg' },
  { id: 'bg-ops', name: 'Operations', type: 'folder', owner: owners.brego, modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-bg' },
  { id: 'bg-strategy', name: 'Strategy & Planning', type: 'folder', owner: owners.tejas, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: 'root-bg' },
  { id: 'bg-training', name: 'Training Library', type: 'folder', owner: owners.brego, modified: 'Feb 15, 2026', modifiedISO: '2026-02-15', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-bg' },
  { id: 'bg-legal', name: 'Legal & Contracts', type: 'folder', owner: owners.tejas, modified: 'Feb 28, 2026', modifiedISO: '2026-02-28', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-bg' },
  // Files in Brego Group root
  { id: 'bg-f1', name: 'Brand Guidelines v4.pdf', type: 'pdf', owner: owners.brego, modified: 'Mar 1, 2026', modifiedISO: '2026-03-01', size: '5.2 MB', sizeBytes: 5452595, starred: true, shared: true, parentId: 'root-bg' },
  { id: 'bg-f2', name: 'Q2 Resource Plan.xlsx', type: 'spreadsheet', owner: owners.tejas, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '960 KB', sizeBytes: 983040, starred: false, shared: false, parentId: 'root-bg' },
  // Inside Strategy & Planning
  { id: 'bg-s-f1', name: 'Q1 OKR Review.pdf', type: 'pdf', owner: owners.tejas, modified: 'Mar 16, 2026', modifiedISO: '2026-03-16', size: '1.8 MB', sizeBytes: 1887436, starred: true, shared: true, parentId: 'bg-strategy' },
  { id: 'bg-s-f2', name: 'Board Deck — March 2026.pdf', type: 'presentation', owner: owners.tejas, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '8.4 MB', sizeBytes: 8808038, starred: false, shared: false, parentId: 'bg-strategy' },
  { id: 'bg-s-f3', name: 'Annual Budget 2026-27.xlsx', type: 'spreadsheet', owner: owners.tejas, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '1.1 MB', sizeBytes: 1153434, starred: false, shared: true, parentId: 'bg-strategy' },
  // Inside HR & People
  { id: 'bg-hr-f1', name: 'Employee Handbook v3.pdf', type: 'pdf', owner: owners.tejas, modified: 'Feb 10, 2026', modifiedISO: '2026-02-10', size: '2.3 MB', sizeBytes: 2411724, starred: false, shared: true, parentId: 'bg-hr' },
  { id: 'bg-hr-f2', name: 'Org Chart — March 2026.pdf', type: 'pdf', owner: owners.brego, modified: 'Mar 5, 2026', modifiedISO: '2026-03-05', size: '680 KB', sizeBytes: 696320, starred: false, shared: true, parentId: 'bg-hr' },
  // Inside Company Policies
  { id: 'bg-pol-f1', name: 'Leave Policy 2026.pdf', type: 'pdf', owner: owners.brego, modified: 'Jan 5, 2026', modifiedISO: '2026-01-05', size: '340 KB', sizeBytes: 348160, starred: false, shared: true, parentId: 'bg-policies' },
  { id: 'bg-pol-f2', name: 'Remote Work Guidelines.pdf', type: 'pdf', owner: owners.tejas, modified: 'Jan 10, 2026', modifiedISO: '2026-01-10', size: '290 KB', sizeBytes: 296960, starred: false, shared: true, parentId: 'bg-policies' },
  { id: 'bg-pol-f3', name: 'Code of Conduct.pdf', type: 'pdf', owner: owners.brego, modified: 'Dec 20, 2025', modifiedISO: '2025-12-20', size: '410 KB', sizeBytes: 419840, starred: false, shared: true, parentId: 'bg-policies' },

  /* ═══════ PERFORMANCE MARKETING (client folders) ═══════ */
  // Client folders
  { id: 'pm-99p', name: '99 Pancakes', type: 'folder', owner: owners.chinmay, modified: 'Mar 17, 2026', modifiedISO: '2026-03-17', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: 'root-pm' },
  { id: 'pm-alpine', name: 'Alpine Group', type: 'folder', owner: owners.harshal, modified: 'Mar 16, 2026', modifiedISO: '2026-03-16', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-anaya', name: 'Anaya College', type: 'folder', owner: owners.chinmay, modified: 'Mar 14, 2026', modifiedISO: '2026-03-14', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-flavor', name: 'Flavor Nation', type: 'folder', owner: owners.chinmay, modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-zenith', name: 'Zenith Realty', type: 'folder', owner: owners.harshal, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-pm' },
  // Internal PM folders
  { id: 'pm-sops', name: 'SOPs & Processes', type: 'folder', owner: owners.brego, modified: 'Feb 20, 2026', modifiedISO: '2026-02-20', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-pm' },
  { id: 'pm-creatives', name: 'Ad Creatives Library', type: 'folder', owner: owners.chinmay, modified: 'Mar 14, 2026', modifiedISO: '2026-03-14', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-pm' },
  // Root-level PM files
  { id: 'pm-f1', name: 'Q1 ROAS Summary.pdf', type: 'pdf', owner: owners.chinmay, modified: 'Mar 17, 2026', modifiedISO: '2026-03-17', size: '2.4 MB', sizeBytes: 2516582, starred: false, shared: true, parentId: 'root-pm' },
  { id: 'pm-f2', name: 'Budget Allocation — Q2.xlsx', type: 'spreadsheet', owner: owners.harshal, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '780 KB', sizeBytes: 798720, starred: true, shared: false, parentId: 'root-pm' },
  // Inside 99 Pancakes
  { id: 'pm-99p-f1', name: 'Monthly Report — March.pdf', type: 'pdf', owner: owners.chinmay, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '3.2 MB', sizeBytes: 3355443, starred: false, shared: true, parentId: 'pm-99p' },
  { id: 'pm-99p-f2', name: 'Ad Spend Breakdown.xlsx', type: 'spreadsheet', owner: owners.chinmay, modified: 'Mar 16, 2026', modifiedISO: '2026-03-16', size: '920 KB', sizeBytes: 942080, starred: false, shared: false, parentId: 'pm-99p' },
  { id: 'pm-99p-f3', name: 'Banner_v3_Final.png', type: 'image', owner: owners.me, modified: 'Mar 13, 2026', modifiedISO: '2026-03-13', size: '2.8 MB', sizeBytes: 2936012, starred: false, shared: true, parentId: 'pm-99p' },
  // Inside Alpine Group
  { id: 'pm-alp-f1', name: 'Performance Deck — Q1.pdf', type: 'presentation', owner: owners.harshal, modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '5.1 MB', sizeBytes: 5347737, starred: true, shared: true, parentId: 'pm-alpine' },
  { id: 'pm-alp-f2', name: 'LinkedIn_Creative_A.png', type: 'image', owner: owners.me, modified: 'Mar 11, 2026', modifiedISO: '2026-03-11', size: '1.9 MB', sizeBytes: 1992294, starred: false, shared: false, parentId: 'pm-alpine' },
  { id: 'pm-alp-f3', name: 'Campaign Budget.xlsx', type: 'spreadsheet', owner: owners.harshal, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '640 KB', sizeBytes: 655360, starred: false, shared: true, parentId: 'pm-alpine' },
  // Inside Anaya College
  { id: 'pm-ana-f1', name: 'Ad Spend Analysis.xlsx', type: 'spreadsheet', owner: owners.chinmay, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '1.1 MB', sizeBytes: 1153434, starred: false, shared: false, parentId: 'pm-anaya' },
  { id: 'pm-ana-f2', name: 'Lead Gen Report — Feb.pdf', type: 'pdf', owner: owners.chinmay, modified: 'Mar 8, 2026', modifiedISO: '2026-03-08', size: '1.6 MB', sizeBytes: 1677722, starred: false, shared: true, parentId: 'pm-anaya' },

  /* ═══════ FINANCE (A&T client folders) ═══════ */
  // Fiscal year folders
  { id: 'fin-fy26', name: 'FY 2025-26', type: 'folder', owner: owners.brego, modified: 'Dec 15, 2025', modifiedISO: '2025-12-15', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: 'root-fin' },
  { id: 'fin-fy25', name: 'FY 2024-25', type: 'folder', owner: owners.brego, modified: 'Apr 1, 2025', modifiedISO: '2025-04-01', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-fin' },
  // Client folders
  { id: 'fin-techcorp', name: 'TechCorp India', type: 'folder', owner: owners.zubear, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '—', sizeBytes: 0, starred: true, shared: true, parentId: 'root-fin' },
  { id: 'fin-retailmax', name: 'RetailMax', type: 'folder', owner: owners.mihir, modified: 'Mar 8, 2026', modifiedISO: '2026-03-08', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-fin' },
  { id: 'fin-green', name: 'Green Energy Solutions', type: 'folder', owner: owners.zubear, modified: 'Feb 25, 2026', modifiedISO: '2026-02-25', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-fin' },
  { id: 'fin-nova', name: 'Nova Pharma', type: 'folder', owner: owners.zubear, modified: 'Mar 5, 2026', modifiedISO: '2026-03-05', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-fin' },
  // Compliance & statutory folders
  { id: 'fin-compliance', name: 'Compliance & Audits', type: 'folder', owner: owners.brego, modified: 'Feb 28, 2026', modifiedISO: '2026-02-28', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-fin' },
  { id: 'fin-gst', name: 'GST Returns', type: 'folder', owner: owners.zubear, modified: 'Mar 15, 2026', modifiedISO: '2026-03-15', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'root-fin' },
  { id: 'fin-tds', name: 'TDS Computations', type: 'folder', owner: owners.brego, modified: 'Mar 1, 2026', modifiedISO: '2026-03-01', size: '—', sizeBytes: 0, starred: false, shared: false, parentId: 'root-fin' },
  // Root-level Finance files
  { id: 'fin-f1', name: 'Q4 Bank Reconciliation.xlsx', type: 'spreadsheet', owner: owners.mihir, modified: 'Mar 18, 2026', modifiedISO: '2026-03-18', size: '1.8 MB', sizeBytes: 1887436, starred: false, shared: true, parentId: 'root-fin' },
  { id: 'fin-f2', name: 'Tax Compliance Checklist.pdf', type: 'pdf', owner: owners.zubear, modified: 'Mar 12, 2026', modifiedISO: '2026-03-12', size: '420 KB', sizeBytes: 430080, starred: true, shared: false, parentId: 'root-fin' },
  // Inside FY 2025-26
  { id: 'fin-fy26-f1', name: 'P&L Statement — Q3.xlsx', type: 'spreadsheet', owner: owners.mihir, modified: 'Jan 15, 2026', modifiedISO: '2026-01-15', size: '2.1 MB', sizeBytes: 2202009, starred: false, shared: true, parentId: 'fin-fy26' },
  { id: 'fin-fy26-f2', name: 'Balance Sheet — Q3.xlsx', type: 'spreadsheet', owner: owners.mihir, modified: 'Jan 15, 2026', modifiedISO: '2026-01-15', size: '1.4 MB', sizeBytes: 1468006, starred: false, shared: true, parentId: 'fin-fy26' },
  { id: 'fin-fy26-f3', name: 'Audit Report Draft.pdf', type: 'pdf', owner: owners.zubear, modified: 'Feb 20, 2026', modifiedISO: '2026-02-20', size: '3.6 MB', sizeBytes: 3774873, starred: true, shared: false, parentId: 'fin-fy26' },
  { id: 'fin-fy26-d1', name: 'Monthly Returns', type: 'folder', owner: owners.brego, modified: 'Mar 1, 2026', modifiedISO: '2026-03-01', size: '—', sizeBytes: 0, starred: false, shared: true, parentId: 'fin-fy26' },
  // Inside TechCorp India
  { id: 'fin-tc-f1', name: 'Financials — Q4.xlsx', type: 'spreadsheet', owner: owners.zubear, modified: 'Mar 5, 2026', modifiedISO: '2026-03-05', size: '890 KB', sizeBytes: 911360, starred: false, shared: true, parentId: 'fin-techcorp' },
  { id: 'fin-tc-f2', name: 'IT Return FY25-26.pdf', type: 'pdf', owner: owners.zubear, modified: 'Mar 10, 2026', modifiedISO: '2026-03-10', size: '1.4 MB', sizeBytes: 1468006, starred: false, shared: false, parentId: 'fin-techcorp' },
  // Inside RetailMax
  { id: 'fin-rm-f1', name: 'Tax Filing — AY 2026-27.pdf', type: 'pdf', owner: owners.mihir, modified: 'Mar 8, 2026', modifiedISO: '2026-03-08', size: '1.2 MB', sizeBytes: 1258291, starred: false, shared: false, parentId: 'fin-retailmax' },
  // Inside Green Energy
  { id: 'fin-ge-f1', name: 'P&L — FY 2025-26.xlsx', type: 'spreadsheet', owner: owners.zubear, modified: 'Feb 25, 2026', modifiedISO: '2026-02-25', size: '1.5 MB', sizeBytes: 1572864, starred: true, shared: true, parentId: 'fin-green' },
  { id: 'fin-ge-f2', name: 'GST Computation.xlsx', type: 'spreadsheet', owner: owners.mihir, modified: 'Mar 1, 2026', modifiedISO: '2026-03-01', size: '780 KB', sizeBytes: 798720, starred: false, shared: false, parentId: 'fin-green' },
];

const activityLog: ActivityItem[] = [
  { user: 'Tejas Atha', initials: 'TA', color: '#3B82F6', action: 'uploaded', target: 'Board Deck — March 2026.pdf', time: '30 min ago' },
  { user: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED', action: 'uploaded', target: 'Q1 ROAS Summary.pdf', time: '1 hour ago' },
  { user: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4', action: 'uploaded', target: 'Tax Compliance Checklist.pdf', time: '2 hours ago' },
  { user: 'Harshal R.', initials: 'HR', color: '#10B981', action: 'modified', target: 'Budget Allocation — Q2.xlsx', time: '3 hours ago' },
  { user: 'Mihir L.', initials: 'ML', color: '#F59E0B', action: 'modified', target: 'Q4 Bank Reconciliation.xlsx', time: '5 hours ago' },
  { user: 'Brego Business', initials: 'B', color: '#204CC7', action: 'modified', target: 'Brand Guidelines v4.pdf', time: '6 hours ago' },
  { user: 'You', initials: 'JD', color: '#6366F1', action: 'shared', target: 'TechCorp India folder', time: '1 day ago' },
  { user: 'Tejas Atha', initials: 'TA', color: '#3B82F6', action: 'shared', target: 'Strategy & Planning folder', time: '1 day ago' },
  { user: 'Chinmay Pawar', initials: 'CP', color: '#7C3AED', action: 'shared', target: '99 Pancakes — Monthly Report.pdf', time: '3 days ago' },
  { user: 'Zubear Shaikh', initials: 'ZS', color: '#06B6D4', action: 'created', target: 'GST Returns folder', time: '3 days ago' },
  { user: 'Mihir L.', initials: 'ML', color: '#F59E0B', action: 'uploaded', target: 'P&L Statement — Q3.xlsx', time: '4 days ago' },
  { user: 'Brego Business', initials: 'B', color: '#204CC7', action: 'modified', target: 'FY 2025-26 folder permissions', time: '5 days ago' },
  { user: 'You', initials: 'JD', color: '#6366F1', action: 'downloaded', target: 'Audit Report Draft.pdf', time: '5 days ago' },
  { user: 'Harshal R.', initials: 'HR', color: '#10B981', action: 'uploaded', target: 'Alpine Group — Performance Deck.pdf', time: '1 week ago' },
];

const storageData = { used: 8.5, total: 30 };

/* ═══════════════════════════ Helpers ═══════════════════════════ */
function getFileIcon(type: FileType) {
  switch (type) {
    case 'folder': return FolderOpen;
    case 'spreadsheet': return FileSpreadsheet;
    case 'image': return ImageIcon;
    case 'pdf': return FileText;
    case 'presentation': return FileText;
    case 'document': return FileText;
    default: return File;
  }
}

function getFileColor(type: FileType) {
  switch (type) {
    case 'folder': return '#4285F4';
    case 'spreadsheet': return '#0F9D58';
    case 'image': return '#DB4437';
    case 'pdf': return '#EA4335';
    case 'presentation': return '#F4B400';
    case 'document': return '#4285F4';
    default: return '#9AA0A6';
  }
}

/* ═══════════════════════════ Component ═══════════════════════════ */
export function Dataroom() {
  const [quickAccess, setQuickAccess] = useState<QuickAccess>('drive');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'My Drive' }]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [items, setItems] = useState<DriveItem[]>(allItems);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);

  const newDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node)) setShowNewDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Folder tree for sidebar (root-level folders only)
  const rootFolders = useMemo(() => items.filter(i => i.parentId === null && i.type === 'folder'), [items]);

  // Sub-folders for expanded root folders in sidebar
  const getChildFolders = (parentId: string) => items.filter(i => i.parentId === parentId && i.type === 'folder');

  // Current visible items
  const visibleItems = useMemo(() => {
    let list: DriveItem[];

    if (quickAccess === 'starred') {
      list = items.filter(i => i.starred);
    } else if (quickAccess === 'shared') {
      list = items.filter(i => i.shared);
    } else if (quickAccess === 'recent') {
      list = [...items].sort((a, b) => b.modifiedISO.localeCompare(a.modifiedISO)).slice(0, 15);
    } else if (quickAccess === 'trash') {
      list = [];
    } else {
      list = items.filter(i => i.parentId === currentFolderId);
    }

    // Search
    if (searchQuery) {
      list = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Owner filter
    if (ownerFilter === 'me') list = list.filter(i => i.owner.name === 'You');
    if (ownerFilter === 'brego') list = list.filter(i => i.owner.name === 'Brego Business');

    // Sort: folders first, then sort within each group
    const folders = list.filter(i => i.type === 'folder');
    const files = list.filter(i => i.type !== 'folder');
    const sorter = (a: DriveItem, b: DriveItem) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      if (sortField === 'modified') cmp = a.modifiedISO.localeCompare(b.modifiedISO);
      if (sortField === 'size') cmp = a.sizeBytes - b.sizeBytes;
      return sortDir === 'asc' ? cmp : -cmp;
    };
    return [...folders.sort(sorter), ...files.sort(sorter)];
  }, [items, currentFolderId, quickAccess, searchQuery, ownerFilter, sortField, sortDir]);

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setQuickAccess('drive');
    setBreadcrumb(prev => [...prev, { id: folderId, name: folderName }]);
    setSelectedItems([]);
  };

  const navigateBreadcrumb = (index: number) => {
    const target = breadcrumb[index];
    setCurrentFolderId(target.id);
    setQuickAccess('drive');
    setBreadcrumb(breadcrumb.slice(0, index + 1));
    setSelectedItems([]);
  };

  const handleQuickAccess = (qa: QuickAccess) => {
    setQuickAccess(qa);
    setCurrentFolderId(null);
    setBreadcrumb([{ id: null, name: qa === 'drive' ? 'My Drive' : qa === 'shared' ? 'Shared with me' : qa === 'starred' ? 'Starred' : qa === 'recent' ? 'Recent' : 'Trash' }]);
    setSelectedItems([]);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const toggleStar = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, starred: !i.starred } : i));
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedItems.length === visibleItems.length) setSelectedItems([]);
    else setSelectedItems(visibleItems.map(i => i.id));
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: DriveItem = {
      id: `new-${Date.now()}`, name: newFolderName.trim(), type: 'folder',
      owner: owners.me, modified: 'Just now', modifiedISO: new Date().toISOString().split('T')[0],
      size: '—', sizeBytes: 0, starred: false, shared: false,
      parentId: currentFolderId,
    };
    setItems(prev => [newFolder, ...prev]);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleItemClick = (item: DriveItem) => {
    if (item.type === 'folder') navigateToFolder(item.id, item.name);
  };

  /* Navigate from sidebar — builds full breadcrumb from root */
  const handleSidebarNav = (folderId: string, folderName: string, rootId?: string, rootName?: string) => {
    setQuickAccess('drive');
    setSelectedItems([]);
    if (rootId && rootId !== folderId) {
      setCurrentFolderId(folderId);
      setBreadcrumb([{ id: null, name: 'My Drive' }, { id: rootId, name: rootName! }, { id: folderId, name: folderName }]);
    } else {
      setCurrentFolderId(folderId);
      setBreadcrumb([{ id: null, name: 'My Drive' }, { id: folderId, name: folderName }]);
    }
  };

  const sortArrow = (field: SortField) => sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '';

  /* Check if a folder (or its children) is currently open */
  const isFolderActive = (folderId: string) => breadcrumb.some(b => b.id === folderId);

  return (
    <div className="flex h-[calc(100vh-53px)] bg-white" role="main" aria-label="Dataroom">
      {/* ══════════ Sidebar ══════════ */}
      <aside className="w-[240px] border-r border-black/[0.06] flex flex-col bg-[#F8F8FA] flex-shrink-0 select-none">
        {/* Quick Access */}
        <div className="px-2 pt-4 pb-1">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-black/35 uppercase tracking-wider">Quick Access</p>
          {([
            { id: 'drive' as QuickAccess, icon: Home, label: 'My Drive' },
            { id: 'shared' as QuickAccess, icon: Users, label: 'Shared with me', count: items.filter(i => i.shared).length },
            { id: 'starred' as QuickAccess, icon: Star, label: 'Starred', count: items.filter(i => i.starred).length },
            { id: 'recent' as QuickAccess, icon: Clock, label: 'Recent' },
            { id: 'trash' as QuickAccess, icon: Trash2, label: 'Trash' },
          ]).map(qa => {
            const Icon = qa.icon;
            const isActive = quickAccess === qa.id && !searchQuery;
            return (
              <button
                key={qa.id}
                onClick={() => handleQuickAccess(qa.id)}
                className={`w-full px-3 py-[7px] flex items-center gap-2.5 rounded-lg text-left transition-colors ${
                  isActive ? 'bg-[#204CC7]/[0.08] text-[#204CC7] font-semibold' : 'text-black/60 hover:bg-black/[0.04]'
                }`}
              >
                <Icon className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? '' : 'text-black/40'}`} />
                <span className="text-[13px] flex-1">{qa.label}</span>
                {qa.count !== undefined && qa.count > 0 && (
                  <span className={`text-[11px] font-bold tabular-nums ${isActive ? 'text-[#204CC7]/60' : 'text-black/25'}`}>{qa.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Folder Tree */}
        <div className="px-2 pt-3 pb-1 flex-1 overflow-y-auto">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-black/35 uppercase tracking-wider">Folders</p>
          {rootFolders.map(folder => {
            const isActive = isFolderActive(folder.id);
            const isDirectlyActive = currentFolderId === folder.id && quickAccess === 'drive';
            const meta = rootFolderMeta[folder.id];
            const RootIcon = meta ? meta.icon : FolderOpen;
            const rootColor = meta ? meta.color : '#4285F4';
            const childFolders = getChildFolders(folder.id);

            return (
              <div key={folder.id}>
                <button
                  onClick={() => handleSidebarNav(folder.id, folder.name)}
                  className={`w-full px-3 py-[7px] flex items-center gap-2.5 rounded-lg text-left transition-colors ${
                    isDirectlyActive ? 'bg-[#204CC7]/[0.08] text-[#204CC7] font-semibold' : 'text-black/60 hover:bg-black/[0.04]'
                  }`}
                >
                  <div
                    className="w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${rootColor}12` }}
                  >
                    <RootIcon className="w-[13px] h-[13px]" style={{ color: rootColor }} />
                  </div>
                  <span className="text-[13px] truncate flex-1">{folder.name}</span>
                  {childFolders.length > 0 && (
                    <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${isActive ? 'text-[#204CC7]/50' : 'text-black/20'} ${isActive ? 'rotate-0' : '-rotate-90'}`} />
                  )}
                </button>
                {/* Expanded child folders */}
                {isActive && childFolders.length > 0 && (
                  <div className="ml-4 pl-2 border-l border-black/[0.06]">
                    {childFolders.map(child => {
                      const isChildActive = currentFolderId === child.id && quickAccess === 'drive';
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleSidebarNav(child.id, child.name, folder.id, folder.name)}
                          className={`w-full px-2.5 py-[5px] flex items-center gap-2 rounded-md text-left transition-colors ${
                            isChildActive ? 'bg-[#204CC7]/[0.06] text-[#204CC7] font-semibold' : 'text-black/50 hover:bg-black/[0.04]'
                          }`}
                        >
                          <FolderOpen className={`w-3.5 h-3.5 flex-shrink-0 ${isChildActive ? 'text-[#204CC7]' : 'text-black/30'}`} />
                          <span className="text-[12.5px] truncate">{child.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Owner Filter */}
        <div className="px-2 pt-2 pb-1 border-t border-black/[0.06]">
          <p className="px-3 py-1.5 text-[11px] font-semibold text-black/35 uppercase tracking-wider">Owner</p>
          {([
            { id: 'all' as OwnerFilter, icon: Users, label: 'All Owners' },
            { id: 'me' as OwnerFilter, label: 'Me', avatar: { initials: 'JD', color: '#6366F1' } },
            { id: 'brego' as OwnerFilter, label: 'Brego Business', avatar: { initials: 'B', color: '#204CC7' } },
          ]).map(o => {
            const isActive = ownerFilter === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setOwnerFilter(o.id)}
                className={`w-full px-3 py-[6px] flex items-center gap-2.5 rounded-lg text-left transition-colors ${
                  isActive ? 'bg-[#204CC7]/[0.08] text-[#204CC7] font-semibold' : 'text-black/60 hover:bg-black/[0.04]'
                }`}
              >
                {o.avatar ? (
                  <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ backgroundColor: o.avatar.color }}>{o.avatar.initials}</div>
                ) : (
                  <Users className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? '' : 'text-black/40'}`} />
                )}
                <span className="text-[13px] truncate">{o.label}</span>
              </button>
            );
          })}
        </div>

        {/* Storage */}
        <div className="px-4 py-3 border-t border-black/[0.06]">
          <div className="flex items-center gap-1.5 mb-2">
            <HardDrive className="w-3.5 h-3.5 text-black/35" />
            <span className="text-[12px] font-medium text-black/40">Storage</span>
          </div>
          <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden mb-1.5">
            <div className="h-full rounded-full transition-all" style={{ width: `${(storageData.used / storageData.total) * 100}%`, backgroundColor: '#204CC7' }} />
          </div>
          <p className="text-[11px] text-black/35">
            <span className="font-semibold text-black/50">{storageData.used} GB</span> of {storageData.total} GB used
          </p>
        </div>
      </aside>

      {/* ══════════ Main Content ══════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-[56px] px-6 flex items-center justify-between border-b border-black/[0.06] flex-shrink-0 bg-white">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 min-w-0 flex-1" aria-label="Breadcrumb">
            {breadcrumb.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-black/25 flex-shrink-0" />}
                <button
                  onClick={() => navigateBreadcrumb(i)}
                  className={`text-[15px] truncate max-w-[240px] transition-colors ${
                    i === breadcrumb.length - 1 ? 'font-bold text-black/90' : 'font-medium text-black/40 hover:text-black/70'
                  }`}
                >
                  {i === 0 && quickAccess === 'drive' ? 'My Drive' : crumb.name}
                </button>
              </div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
              <input
                type="search"
                placeholder="Search in Drive"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-[260px] pl-9 pr-4 py-2 bg-black/[0.03] rounded-lg text-[14px] text-black/85 placeholder:text-black/35 border border-transparent focus:bg-white focus:border-black/[0.1] focus:outline-none focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
                aria-label="Search files and folders"
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-black/[0.03] rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-black/80' : 'text-black/35 hover:text-black/60'}`} aria-label="List view" aria-pressed={viewMode === 'list'}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-black/80' : 'text-black/35 hover:text-black/60'}`} aria-label="Grid view" aria-pressed={viewMode === 'grid'}>
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>

            {/* Activity button */}
            <button
              onClick={() => setShowActivityDrawer(!showActivityDrawer)}
              className={`w-[36px] h-[36px] flex items-center justify-center rounded-lg transition-all ${
                showActivityDrawer
                  ? 'bg-[#204CC7]/[0.08] text-[#204CC7]'
                  : 'text-black/40 hover:bg-black/[0.04] hover:text-black/60'
              }`}
              aria-label="Activity log"
              aria-expanded={showActivityDrawer}
            >
              <History className="w-[18px] h-[18px]" />
            </button>

            {/* + New button */}
            <div className="relative" ref={newDropdownRef}>
              <button
                onClick={() => setShowNewDropdown(!showNewDropdown)}
                className="h-[36px] px-4 flex items-center gap-2 bg-[#204CC7] text-white rounded-lg text-[14px] font-semibold hover:bg-[#1a3fa3] shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
              {showNewDropdown && (
                <div className="absolute right-0 mt-2 w-[200px] bg-white rounded-xl shadow-xl border border-black/[0.06] py-1.5 z-50">
                  <button onClick={() => { setShowNewFolderModal(true); setShowNewDropdown(false); }} className="w-full px-4 py-2.5 flex items-center gap-3 text-[14px] text-black/70 hover:bg-black/[0.03] transition-colors">
                    <FolderPlus className="w-4 h-4 text-black/40" /> New folder
                  </button>
                  <button onClick={() => { setShowUploadModal(true); setShowNewDropdown(false); }} className="w-full px-4 py-2.5 flex items-center gap-3 text-[14px] text-black/70 hover:bg-black/[0.03] transition-colors">
                    <FileUp className="w-4 h-4 text-black/40" /> File upload
                  </button>
                  <button onClick={() => { setShowUploadModal(true); setShowNewDropdown(false); }} className="w-full px-4 py-2.5 flex items-center gap-3 text-[14px] text-black/70 hover:bg-black/[0.03] transition-colors">
                    <UploadCloud className="w-4 h-4 text-black/40" /> Folder upload
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Bulk actions bar */}
        {selectedItems.length > 0 && (
          <div className="h-[40px] px-5 flex items-center gap-3 bg-[#204CC7]/[0.04] border-b border-[#204CC7]/10 flex-shrink-0">
            <button onClick={() => setSelectedItems([])} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/[0.06]" aria-label="Clear selection">
              <X className="w-3.5 h-3.5 text-black/50" />
            </button>
            <span className="text-[13px] font-semibold text-[#204CC7]">{selectedItems.length} selected</span>
            <div className="h-4 w-px bg-black/[0.08] mx-1" />
            <button className="h-[26px] px-2.5 flex items-center gap-1.5 rounded-md text-[12px] font-medium text-black/60 hover:bg-black/[0.05] transition-colors"><Download className="w-3 h-3" /> Download</button>
            <button className="h-[26px] px-2.5 flex items-center gap-1.5 rounded-md text-[12px] font-medium text-black/60 hover:bg-black/[0.05] transition-colors"><Share2 className="w-3 h-3" /> Share</button>
            <button className="h-[26px] px-2.5 flex items-center gap-1.5 rounded-md text-[12px] font-medium text-black/60 hover:bg-black/[0.05] transition-colors"><Copy className="w-3 h-3" /> Copy</button>
            <button className="h-[26px] px-2.5 flex items-center gap-1.5 rounded-md text-[12px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 className="w-3 h-3" /> Delete</button>
          </div>
        )}

        {/* File Browser */}
        <div className="flex-1 overflow-y-auto">
          {visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-black/[0.03] flex items-center justify-center mb-3">
                {quickAccess === 'trash' ? <Trash2 className="w-6 h-6 text-black/20" /> : <FolderOpen className="w-6 h-6 text-black/20" />}
              </div>
              <p className="text-[15px] font-semibold text-black/60 mb-1">
                {searchQuery ? 'No results found' : quickAccess === 'trash' ? 'Trash is empty' : 'This folder is empty'}
              </p>
              <p className="text-[13px] text-black/35">
                {searchQuery ? `No files matching "${searchQuery}"` : quickAccess === 'trash' ? 'Items moved to trash will appear here' : 'Upload files or create a new folder to get started'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            /* ═══ List View ═══ */
            <div>
              {/* Column headers */}
              <div className="grid grid-cols-[44px_1fr_170px_150px_110px_48px] gap-0 px-5 h-[42px] items-center border-b border-black/[0.06] bg-[#FAFAFA] sticky top-0 z-10">
                <div className="flex items-center justify-center">
                  <input type="checkbox" checked={selectedItems.length === visibleItems.length && visibleItems.length > 0} onChange={selectAll} className="w-3.5 h-3.5 rounded border-black/20 accent-[#204CC7] cursor-pointer" aria-label="Select all" />
                </div>
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-[13px] font-semibold text-black/50 hover:text-black/70 transition-colors pl-1">
                  Name {sortArrow('name') && <span className="text-[#204CC7]">{sortArrow('name')}</span>}
                </button>
                <div className="text-[13px] font-semibold text-black/50">Owner</div>
                <button onClick={() => toggleSort('modified')} className="flex items-center gap-1.5 text-[13px] font-semibold text-black/50 hover:text-black/70 transition-colors">
                  Last modified {sortArrow('modified') && <span className="text-[#204CC7]">{sortArrow('modified')}</span>}
                </button>
                <button onClick={() => toggleSort('size')} className="flex items-center gap-1.5 text-[13px] font-semibold text-black/50 hover:text-black/70 transition-colors">
                  File size {sortArrow('size') && <span className="text-[#204CC7]">{sortArrow('size')}</span>}
                </button>
                <div />
              </div>

              {/* Rows */}
              <div className="divide-y divide-black/[0.03]">
                {visibleItems.map(item => {
                  const isSelected = selectedItems.includes(item.id);
                  const meta = rootFolderMeta[item.id];
                  const Icon = meta ? meta.icon : getFileIcon(item.type);
                  const iconColor = meta ? meta.color : getFileColor(item.type);
                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[44px_1fr_170px_150px_110px_48px] gap-0 px-5 h-[50px] items-center group cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#204CC7]/[0.04]' : 'hover:bg-black/[0.015]'
                      }`}
                      onClick={() => handleItemClick(item)}
                      role="row"
                    >
                      <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(item.id)} className="w-3.5 h-3.5 rounded border-black/20 accent-[#204CC7] cursor-pointer" aria-label={`Select ${item.name}`} />
                      </div>
                      <div className="flex items-center gap-3 min-w-0 pl-1">
                        {meta ? (
                          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${iconColor}14` }}>
                            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor }} />
                          </div>
                        ) : (
                          <Icon className="w-5 h-5 flex-shrink-0" style={{ color: iconColor }} />
                        )}
                        <span className="text-[14px] font-medium text-black/85 truncate">{item.name}</span>
                        {item.starred && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                        {item.shared && <Users className="w-3.5 h-3.5 text-[#204CC7]/40 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: item.owner.color }}>{item.owner.initials}</div>
                        <span className="text-[13px] text-black/50 truncate">{item.owner.name}</span>
                      </div>
                      <div className="text-[13px] text-black/45 tabular-nums">{item.modified}</div>
                      <div className="text-[13px] text-black/45 tabular-nums">{item.size}</div>
                      <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleStar(item.id)}
                          className="w-7 h-7 items-center justify-center rounded-md hover:bg-black/[0.05] transition-colors hidden group-hover:flex"
                          aria-label={item.starred ? 'Unstar' : 'Star'}
                        >
                          <Star className={`w-3.5 h-3.5 ${item.starred ? 'text-amber-500 fill-amber-500' : 'text-black/30'}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ═══ Grid View ═══ */
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {visibleItems.map(item => {
                const isSelected = selectedItems.includes(item.id);
                const meta = rootFolderMeta[item.id];
                const Icon = meta ? meta.icon : getFileIcon(item.type);
                const iconColor = meta ? meta.color : getFileColor(item.type);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-[#204CC7] bg-[#204CC7]/[0.03] shadow-sm' : 'border-black/[0.04] bg-white hover:border-black/[0.08]'
                    }`}
                    onClick={() => handleItemClick(item)}
                    role="button"
                  >
                    <div className="p-3.5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: meta ? `${iconColor}12` : 'rgba(0,0,0,0.03)' }}>
                          <Icon className="w-5 h-5" style={{ color: iconColor }} />
                        </div>
                        <div className="flex items-center gap-0.5">
                          {item.starred && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          {item.shared && <Users className="w-3 h-3 text-[#204CC7]/40" />}
                        </div>
                      </div>
                      <p className="text-[13px] font-medium text-black/80 truncate mb-1.5">{item.name}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ backgroundColor: item.owner.color }}>{item.owner.initials}</div>
                          <span className="text-[11px] text-black/40 truncate max-w-[80px]">{item.owner.name}</span>
                        </div>
                        <span className="text-[11px] text-black/30 tabular-nums">{item.size !== '—' ? item.size : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════ Activity Drawer ══════════ */}
      {showActivityDrawer && (
        <aside
          className="w-[360px] border-l border-black/[0.06] flex flex-col bg-white flex-shrink-0"
          role="complementary"
          aria-label="Activity log"
          style={{ animation: 'slideInDrawer 0.2s ease-out' }}
        >
          {/* Drawer Header */}
          <div className="h-[56px] px-5 flex items-center justify-between border-b border-black/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#204CC7]/[0.08] flex items-center justify-center">
                <History className="w-4 h-4 text-[#204CC7]" />
              </div>
              <h2 className="text-[15px] font-bold text-black/90">Activity</h2>
            </div>
            <button
              onClick={() => setShowActivityDrawer(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] transition-colors"
              aria-label="Close activity panel"
            >
              <X className="w-4 h-4 text-black/45" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Today section */}
            <div className="px-5 pt-4 pb-1">
              <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-2">Today</p>
            </div>
            <div className="px-3">
              {activityLog.slice(0, 6).map((a, i) => (
                <div
                  key={`today-${i}`}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-black/[0.02] transition-colors"
                  style={{ animation: `slideInDrawer 0.2s ease-out ${i * 60}ms both` }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: a.color }}>
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] text-black/70 leading-snug">
                      <span className="font-semibold text-black/85">{a.user}</span>
                      {' '}{a.action}{' '}
                      <span className="font-medium text-black/80">{a.target}</span>
                    </p>
                    <p className="text-[12px] text-black/30 mt-1">{a.time}</p>
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                    {a.action === 'uploaded' && <Upload className="w-3.5 h-3.5 text-[#00C875]" />}
                    {a.action === 'modified' && <FileText className="w-3.5 h-3.5 text-[#FDAB3D]" />}
                    {a.action === 'shared' && <Share2 className="w-3.5 h-3.5 text-[#204CC7]" />}
                    {a.action === 'created' && <FolderPlus className="w-3.5 h-3.5 text-[#4285F4]" />}
                    {a.action === 'downloaded' && <Download className="w-3.5 h-3.5 text-[#7C3AED]" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Earlier section */}
            <div className="px-5 pt-4 pb-1">
              <p className="text-[11px] font-semibold text-black/35 uppercase tracking-wider mb-2">Earlier</p>
            </div>
            <div className="px-3 pb-4">
              {activityLog.slice(6).map((a, i) => (
                <div
                  key={`earlier-${i}`}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-black/[0.02] transition-colors"
                  style={{ animation: `slideInDrawer 0.2s ease-out ${(i + 6) * 60}ms both` }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5" style={{ backgroundColor: a.color }}>
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] text-black/70 leading-snug">
                      <span className="font-semibold text-black/85">{a.user}</span>
                      {' '}{a.action}{' '}
                      <span className="font-medium text-black/80">{a.target}</span>
                    </p>
                    <p className="text-[12px] text-black/30 mt-1">{a.time}</p>
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                    {a.action === 'uploaded' && <Upload className="w-3.5 h-3.5 text-[#00C875]" />}
                    {a.action === 'modified' && <FileText className="w-3.5 h-3.5 text-[#FDAB3D]" />}
                    {a.action === 'shared' && <Share2 className="w-3.5 h-3.5 text-[#204CC7]" />}
                    {a.action === 'created' && <FolderPlus className="w-3.5 h-3.5 text-[#4285F4]" />}
                    {a.action === 'downloaded' && <Download className="w-3.5 h-3.5 text-[#7C3AED]" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary footer */}
            <div className="mx-5 mb-5 p-4 rounded-xl bg-[#F8F8FA] border border-black/[0.04]">
              <div className="flex items-center gap-2 mb-2.5">
                <Info className="w-3.5 h-3.5 text-black/30" />
                <span className="text-[12px] font-semibold text-black/45">Drive Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[18px] font-bold text-black/80">{items.filter(i => i.type !== 'folder').length}</p>
                  <p className="text-[11px] text-black/35">Total files</p>
                </div>
                <div>
                  <p className="text-[18px] font-bold text-black/80">{items.filter(i => i.type === 'folder').length}</p>
                  <p className="text-[11px] text-black/35">Folders</p>
                </div>
                <div>
                  <p className="text-[18px] font-bold text-black/80">{items.filter(i => i.shared).length}</p>
                  <p className="text-[11px] text-black/35">Shared items</p>
                </div>
                <div>
                  <p className="text-[18px] font-bold text-black/80">{storageData.used} GB</p>
                  <p className="text-[11px] text-black/35">Storage used</p>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes slideInDrawer {
              from { transform: translateX(16px); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </aside>
      )}

      {/* ══════════ New Folder Modal ══════════ */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowNewFolderModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-black/[0.06] w-[400px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-black/90">New folder</h3>
              <button onClick={() => setShowNewFolderModal(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/[0.05]"><X className="w-4 h-4 text-black/50" /></button>
            </div>
            <div className="px-5 py-4">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Untitled folder"
                className="w-full px-3 py-2.5 border border-black/[0.1] rounded-lg text-[14px] text-black/85 placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#204CC7]/15 focus:border-[#204CC7]/30"
                autoFocus
              />
            </div>
            <div className="px-5 py-3 border-t border-black/[0.06] flex items-center justify-end gap-2">
              <button onClick={() => setShowNewFolderModal(false)} className="h-[34px] px-4 text-[13px] font-medium text-black/60 rounded-lg hover:bg-black/[0.04] transition-colors">Cancel</button>
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className={`h-[34px] px-4 text-[13px] font-semibold rounded-lg transition-all ${newFolderName.trim() ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa3]' : 'bg-black/[0.05] text-black/30 cursor-not-allowed'}`}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ Upload Modal ══════════ */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-black/[0.06] w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-black/90">Upload files</h3>
              <button onClick={() => setShowUploadModal(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/[0.05]"><X className="w-4 h-4 text-black/50" /></button>
            </div>
            <div className="px-5 py-8">
              <div className="border-2 border-dashed border-black/[0.12] rounded-xl py-10 flex flex-col items-center text-center hover:border-[#204CC7]/30 hover:bg-[#204CC7]/[0.02] transition-colors cursor-pointer">
                <UploadCloud className="w-10 h-10 text-black/20 mb-3" />
                <p className="text-[14px] font-semibold text-black/70 mb-1">Drag and drop files here</p>
                <p className="text-[12px] text-black/35 mb-3">or click to browse from your computer</p>
                <button className="h-[32px] px-4 bg-[#204CC7] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1a3fa3] transition-colors">
                  Browse Files
                </button>
              </div>
              <p className="text-[11px] text-black/30 mt-3 text-center">
                Uploading to: <span className="font-medium text-black/50">{breadcrumb[breadcrumb.length - 1].name}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
