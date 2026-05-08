'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search, Hash, Send, Paperclip, AtSign, Smile, Sparkles,
  Plus, ChevronDown, ChevronRight, ChevronUp, Lock, X, Loader2,
  CheckCircle2, CircleDot, ArrowRight, Reply,
  Target, ListChecks, MessageSquareText,
  Star, FileText, FileImage, Link2, Bell, Headphones, MoreHorizontal,
  Pin, ExternalLink, Inbox as InboxIcon,
  Users, UserMinus, ShieldCheck, Undo2,
  Trash2, AlertTriangle,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

type ChannelKind = 'channel' | 'dm' | 'client';
type ClientService = 'PM' | 'AT'; // SEM (Performance Marketing) and Accounts & Taxation — the two Brego service lines

interface Channel {
  id: string;
  name: string;
  kind: ChannelKind;
  description?: string;
  isPrivate?: boolean;
  members?: number;
  // DM-only
  avatar?: string;
  role?: string;
  online?: boolean;
  // Client-channel-only
  service?: ClientService;
  companyName?: string;       // Display name, e.g. "Lenskart" (id is the slug)
  owner?: string;             // AM / POC initials
  lastActive?: string;        // e.g. "2h ago" — used to sort "active" clients
  roster?: ChannelMember[];   // Internal Brego team on this channel (admin can edit)
  // Activity
  unread: number;
  hasMention?: boolean;
  pinned?: boolean;           // User-pinned (used for DMs AND client channels)
}

/**
 * A Brego team member on a client channel. `isAdmin` grants permission to
 * manage the channel (add/remove members). Admin status is granted at the
 * org level via `teamPool` — currently Tejas Atha (COO), Mihir Lunia (Admin),
 * and Harshal Rane (Operations). The current user is identified by
 * `id === CURRENT_USER_ID`.
 */
interface ChannelMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  isAdmin?: boolean;
  online?: boolean;
  joinedNote?: string;        // e.g. "Added by Tejas · Mar 12"
}

interface Reaction { emoji: string; count: number; reacted: boolean; }

/**
 * A single file attached to a composed message. Mock-only — we never actually
 * upload — but we surface enough metadata (name, formatted size, kind) to
 * render proper chips in both the composer preview and the sent message.
 */
interface ComposerAttachment {
  id: string;
  name: string;
  size: string;            // formatted, e.g. "1.4 MB"
  kind: 'doc' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  // Upload simulation. `progress` is 0–100 and `status` reflects the lifecycle.
  // We fake an upload over ~700ms so the chip animates from a thin progress bar
  // into a "ready" state. Sending is gated on `status === 'ready'` for every
  // attachment so we never ship a half-uploaded payload.
  progress?: number;
  status?: 'uploading' | 'ready' | 'failed';
}

interface Message {
  id: number;
  sender: string;
  avatar: string;
  role?: string;
  content: string;
  timestamp: string;
  date?: string;
  isUser?: boolean;
  reactions?: Reaction[];
  threadId?: string;       // links to a thread
  replyCount?: number;     // shown on parent message
  pinned?: boolean;
  attachments?: ComposerAttachment[];
}

interface ThreadReply {
  id: number;
  sender: string;
  avatar: string;
  role?: string;
  content: string;
  timestamp: string;
  isUser?: boolean;
  reactions?: Reaction[];
}

interface Thread {
  id: string;
  channelId: string;
  parent: Message;
  replies: ThreadReply[];
  participantAvatars: string[];
  unread: boolean;
  lastReplyAt: string;
}

interface Mention {
  id: string;
  channelId: string;
  channelName: string;
  channelKind: ChannelKind;
  sender: string;
  avatar: string;
  role?: string;
  contentBefore: string;   // content before "@you"
  contentAfter: string;    // content after "@you"
  timestamp: string;
  date: string;
  read: boolean;
}

interface SavedMessage {
  id: string;
  channelId: string;
  channelName: string;
  channelKind: ChannelKind;
  sender: string;
  avatar: string;
  content: string;
  savedAt: string;
}

interface SharedFile {
  id: string;
  type: 'doc' | 'image' | 'link';
  name: string;
  meta: string;             // e.g. "PDF · 1.4 MB" or domain
  channelId: string;
  channelName: string;
  channelKind: ChannelKind;
  sharedBy: string;
  avatar: string;
  sharedAt: string;
}

interface ActionItem {
  text: string;
  owner: string;
  ownerAvatar: string;
  status: 'pending' | 'done';
  due?: string;
}

interface AISummaryData {
  overview: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  messageRange: string;
  generatedAt: string;
}

type MainView = 'channel' | 'threads' | 'mentions' | 'starred' | 'files';

/* ═══════════════════════════════════════════════════════════════════
   AVATAR / COLOR HELPERS
   ═══════════════════════════════════════════════════════════════════ */

const avatarColors: Record<string, string> = {
  TA: 'bg-[#3B82F6]',  // Tejas — COO blue
  CP: 'bg-[#7C3AED]',  // Chinmay — PM purple
  ZS: 'bg-[#06B6D4]',  // Zubear — A&T cyan
  ML: 'bg-[#F59E0B]',  // Mihir — amber
  HR: 'bg-[#10B981]',  // Harshal — emerald
  MJ: 'bg-[#204CC7]',  // Miyajan / You — primary blue
};

function getAvatarColor(initials: string): string {
  return avatarColors[initials] || 'bg-slate-500';
}

const channelAccents: Record<string, { bg: string; text: string; ring: string }> = {
  'performance-marketing': { bg: 'bg-[#7C3AED]/10', text: 'text-[#7C3AED]', ring: 'ring-[#7C3AED]/20' },
  'accounts-taxation':     { bg: 'bg-[#06B6D4]/10', text: 'text-[#06B6D4]', ring: 'ring-[#06B6D4]/20' },
  'leadership':            { bg: 'bg-[#204CC7]/10', text: 'text-[#204CC7]', ring: 'ring-[#204CC7]/20' },
};

function getChannelAccent(id: string) {
  return channelAccents[id] || { bg: 'bg-black/[0.04]', text: 'text-black/55', ring: 'ring-black/10' };
}

/* Service palette for client channels — colour drives the sidebar icon + chip */
const serviceMeta: Record<ClientService, { label: string; dot: string; chipBg: string; chipText: string; activeBg: string }> = {
  PM: { label: 'SEM', dot: 'bg-[#7C3AED]', chipBg: 'bg-[#7C3AED]/10', chipText: 'text-[#7C3AED]', activeBg: 'bg-[#7C3AED]' },
  AT: { label: 'A&T', dot: 'bg-[#06B6D4]', chipBg: 'bg-[#06B6D4]/10', chipText: 'text-[#06B6D4]', activeBg: 'bg-[#06B6D4]' },
};

/* Current Brego user — drives "(You)" markers and admin permissions. Miyajan
   is a platform admin so they can manage members on every client channel. */
const CURRENT_USER_ID = 'miyajan';
const CURRENT_USER_IS_ADMIN = true;

/* Brego team pool — referenced by id from client-channel rosters. Keeping a
   single source of truth means a name change here propagates everywhere and
   we don't drift from the team table in CLAUDE.md. Admin rights are granted
   org-wide to Tejas (COO), Mihir Lunia (Admin), and Harshal Rane (Operations).
   No one else can manage channel membership. */
const teamPool: Record<string, ChannelMember> = {
  miyajan: { id: 'miyajan', name: 'Miyajan',         initials: 'MJ', role: 'Platform Admin',                  online: true  },
  tejas:   { id: 'tejas',   name: 'Tejas Atha',      initials: 'TA', role: 'COO',            isAdmin: true,  online: true  },
  chinmay: { id: 'chinmay', name: 'Chinmay Pawar',   initials: 'CP', role: 'SEM HOD',                         online: true  },
  zubear:  { id: 'zubear',  name: 'Zubear Shaikh',   initials: 'ZS', role: 'A&T HOD',                         online: false },
  mihir:   { id: 'mihir',   name: 'Mihir Lunia',     initials: 'ML', role: 'Admin',          isAdmin: true,  online: false },
  harshal: { id: 'harshal', name: 'Harshal Rane',    initials: 'HR', role: 'Operations',     isAdmin: true,  online: true  },
  aanya:   { id: 'aanya',   name: 'Aanya Kapoor',    initials: 'AK', role: 'SEM Strategist',                  online: true  },
  rohan:   { id: 'rohan',   name: 'Rohan Bhatt',     initials: 'RB', role: 'SEM Analyst',                     online: false },
  kabir:   { id: 'kabir',   name: 'Kabir Mehta',     initials: 'KM', role: 'Creative Lead',                   online: true  },
  priya:   { id: 'priya',   name: 'Priya Nair',      initials: 'PN', role: 'A&T Associate',                   online: true  },
  neha:    { id: 'neha',    name: 'Neha Iyer',       initials: 'NI', role: 'Tax Specialist',                  online: false },
  arjun:   { id: 'arjun',   name: 'Arjun Verma',     initials: 'AV', role: 'A&T Associate',                   online: false },
};

/* Org-level admins. They sit on every channel automatically — both client and
   internal — and only they can manage membership. Single source of truth so
   adding a fourth admin is a one-line change. */
const ADMIN_IDS = ['tejas', 'mihir', 'harshal'] as const;

/**
 * Build a roster from team-pool ids. The three org admins are auto-merged in
 * (deduped) so callers don't have to remember to add them, and the rule
 * "admins are on every channel" can never drift.
 */
const roster = (memberIds: string[], addedNote?: string): ChannelMember[] => {
  const merged = Array.from(new Set([...memberIds, ...ADMIN_IDS]));
  return merged.map(id => ({
    ...teamPool[id],
    joinedNote: addedNote,
  }));
};

/* ═══════════════════════════════════════════════════════════════════
   MOCK DATA — Employee-facing
   ═══════════════════════════════════════════════════════════════════ */

/** Seed channel list. The Inbox component lifts this into local state so admins
   can create and delete channels at runtime; the historical views (Threads,
   Mentions, Saved, Files) receive the live `channels` array as a prop. */
const seedChannels: Channel[] = [
  // Team channels — every channel carries a real roster so the Members drawer
  // works uniformly. Admins (Tejas, Mihir, Harshal) are auto-included by
  // roster() so we only list the team-specific members here.
  { id: 'general',               name: 'general',               kind: 'channel', description: 'Company-wide announcements & chatter',                              members: 12, unread: 0,
    roster: roster(['miyajan', 'chinmay', 'zubear', 'aanya', 'rohan', 'kabir', 'priya', 'neha', 'arjun']) },
  { id: 'announcements',         name: 'announcements',         kind: 'channel', description: 'Leadership-only posts. Everyone reads.',          isPrivate: true, members: 12, unread: 1,
    roster: roster(['miyajan', 'chinmay', 'zubear', 'aanya', 'rohan', 'kabir', 'priya', 'neha', 'arjun']) },
  { id: 'leadership',            name: 'leadership',            kind: 'channel', description: 'Private — COO + HODs',                            isPrivate: true, members: 6,  unread: 2, hasMention: true,
    roster: roster(['miyajan', 'chinmay', 'zubear']) },
  { id: 'performance-marketing', name: 'performance-marketing', kind: 'channel', description: 'SEM team — campaigns, creatives, performance reviews',                members: 8,  unread: 5, hasMention: true,
    roster: roster(['miyajan', 'chinmay', 'aanya', 'rohan', 'kabir']) },
  { id: 'accounts-taxation',     name: 'accounts-taxation',     kind: 'channel', description: 'A&T team — books, compliance, GST',                                  members: 8,  unread: 0,
    roster: roster(['miyajan', 'zubear', 'priya', 'neha', 'arjun']) },
  { id: 'operations',            name: 'operations',            kind: 'channel', description: 'Workspace, vendors, day-to-day ops',                                 members: 4,  unread: 1,
    roster: roster(['miyajan']) },
  { id: 'people-ops',            name: 'people-ops',            kind: 'channel', description: 'Hiring, onboarding, attrition, perks',                               members: 4,  unread: 0,
    roster: roster(['miyajan']) },
  { id: 'random',                name: 'random',                kind: 'channel', description: 'Off-topic. Memes welcome.',                                          members: 12, unread: 0,
    roster: roster(['miyajan', 'chinmay', 'zubear', 'aanya', 'rohan', 'kabir', 'priya', 'neha', 'arjun']) },
  // Direct messages
  { id: 'dm-tejas',   name: 'Tejas Atha',     kind: 'dm', avatar: 'TA', role: 'COO',         online: true,  unread: 1, hasMention: true },
  { id: 'dm-chinmay', name: 'Chinmay Pawar',  kind: 'dm', avatar: 'CP', role: 'SEM HOD',      online: true,  unread: 0 },
  { id: 'dm-zubear',  name: 'Zubear Shaikh',  kind: 'dm', avatar: 'ZS', role: 'A&T HOD',     online: false, unread: 0 },
  { id: 'dm-mihir',   name: 'Mihir Lunia',    kind: 'dm', avatar: 'ML', role: 'Admin',       online: false, unread: 2 },
  { id: 'dm-harshal', name: 'Harshal Rane',   kind: 'dm', avatar: 'HR', role: 'Operations',  online: true,  unread: 0 },
  // Client channels — one per client. Service tag drives the icon colour.
  // Pinned ones surface at the top; the rest live behind "Browse all clients".
  { id: 'client-acme-corp',       name: 'acme-corp',       kind: 'client', service: 'PM', companyName: 'Acme Corp',        owner: 'CP', lastActive: '12m ago', members: 8, unread: 3, hasMention: true, pinned: true,  description: 'SEM · Acme Corp account',
    roster: roster(['chinmay', 'aanya', 'rohan', 'kabir', 'miyajan'], 'Added Mar 12') },
  { id: 'client-lenskart',        name: 'lenskart',        kind: 'client', service: 'PM', companyName: 'Lenskart',         owner: 'CP', lastActive: '1h ago',  members: 8, unread: 1, pinned: true,  description: 'SEM · Lenskart growth account',
    roster: roster(['chinmay', 'aanya', 'rohan', 'kabir', 'miyajan'], 'Added Feb 04') },
  { id: 'client-sugar-cosmetics', name: 'sugar-cosmetics', kind: 'client', service: 'AT', companyName: 'Sugar Cosmetics',  owner: 'ZS', lastActive: '3h ago',  members: 7, unread: 2, pinned: true,  description: 'A&T · Sugar Cosmetics books & compliance',
    roster: roster(['zubear', 'priya', 'neha', 'miyajan'], 'Added Jan 22') },
  { id: 'client-wakefit',         name: 'wakefit',         kind: 'client', service: 'AT', companyName: 'Wakefit',          owner: 'ZS', lastActive: 'Yesterday', members: 7, unread: 0, pinned: true,  description: 'A&T · Wakefit books',
    roster: roster(['zubear', 'priya', 'arjun', 'miyajan'], 'Added Apr 02') },
  { id: 'client-boat-lifestyle',  name: 'boat-lifestyle',  kind: 'client', service: 'PM', companyName: 'boAt Lifestyle',   owner: 'CP', lastActive: '4h ago',  members: 8, unread: 0,
    roster: roster(['chinmay', 'aanya', 'kabir', 'rohan', 'miyajan']) },
  { id: 'client-mamaearth',       name: 'mamaearth',       kind: 'client', service: 'PM', companyName: 'Mamaearth',        owner: 'CP', lastActive: 'Yesterday', members: 8, unread: 0,
    roster: roster(['chinmay', 'aanya', 'kabir', 'rohan', 'miyajan']) },
  { id: 'client-urban-company',   name: 'urban-company',   kind: 'client', service: 'PM', companyName: 'Urban Company',    owner: 'CP', lastActive: '2d ago',  members: 7, unread: 0,
    roster: roster(['chinmay', 'aanya', 'rohan', 'miyajan']) },
  { id: 'client-sleepy-owl',      name: 'sleepy-owl',      kind: 'client', service: 'PM', companyName: 'Sleepy Owl',       owner: 'CP', lastActive: '5d ago',  members: 7, unread: 0,
    roster: roster(['chinmay', 'aanya', 'kabir', 'miyajan']) },
  { id: 'client-bluestone',       name: 'bluestone',       kind: 'client', service: 'AT', companyName: 'BlueStone',        owner: 'ZS', lastActive: '3d ago',  members: 6, unread: 0,
    roster: roster(['zubear', 'priya', 'miyajan']) },
  { id: 'client-open-money',      name: 'open-money',      kind: 'client', service: 'AT', companyName: 'Open Money',       owner: 'ZS', lastActive: '1w ago',  members: 6, unread: 0,
    roster: roster(['zubear', 'neha', 'miyajan']) },
  { id: 'client-cred',            name: 'cred',            kind: 'client', service: 'AT', companyName: 'CRED',             owner: 'ZS', lastActive: '1w ago',  members: 7, unread: 0,
    roster: roster(['zubear', 'arjun', 'priya', 'miyajan']) },
  { id: 'client-tata-cliq',       name: 'tata-cliq',       kind: 'client', service: 'PM', companyName: 'Tata CLiQ',        owner: 'TA', lastActive: '2w ago',  members: 7, unread: 0, description: 'SEM · Tata CLiQ full-stack account',
    roster: roster(['chinmay', 'zubear', 'aanya', 'miyajan']) },
  // ── Onboarding-stage client channels ──
  // These channels exist for clients still in the onboarding pipeline
  // — created at kickoff, reused by Customers → Onboarding when admin
  // clicks "Share with client" on an overdue checklist. Member roster
  // is intentionally smaller than active-account channels (just the
  // owner + 1-2 associates + admins) since delivery teams haven't
  // staffed up yet.
  { id: 'client-nor-black-nor-white',     name: 'nor-black-nor-white',     kind: 'client', service: 'PM', companyName: 'Nor Black Nor White',     owner: 'CP', lastActive: '4d ago', members: 5, unread: 0, description: 'SEM · Nor Black Nor White onboarding',
    roster: roster(['chinmay', 'aanya', 'miyajan'], 'Added Mar 18') },
  { id: 'client-enagenbio',               name: 'enagenbio',               kind: 'client', service: 'PM', companyName: 'Enagenbio',               owner: 'CP', lastActive: '5d ago', members: 5, unread: 0, description: 'SEM · Enagenbio onboarding',
    roster: roster(['chinmay', 'rohan', 'miyajan'], 'Added Mar 22') },
  { id: 'client-una-homes-llp',           name: 'una-homes-llp',           kind: 'client', service: 'PM', companyName: 'Una Homes LLP',           owner: 'CP', lastActive: '2d ago', members: 5, unread: 0, description: 'SEM · Una Homes LLP onboarding',
    roster: roster(['chinmay', 'aanya', 'kabir', 'miyajan'], 'Added Mar 25') },
  { id: 'client-green-energy-industries', name: 'green-energy-industries', kind: 'client', service: 'AT', companyName: 'Green Energy Industries', owner: 'ZS', lastActive: '6d ago', members: 5, unread: 0, description: 'A&T · Green Energy Industries onboarding',
    roster: roster(['zubear', 'priya', 'arjun', 'miyajan'], 'Added Mar 15') },
  { id: 'client-retailmax',               name: 'retailmax',               kind: 'client', service: 'AT', companyName: 'RetailMax',               owner: 'ZS', lastActive: '3d ago', members: 5, unread: 0, description: 'A&T · RetailMax onboarding',
    roster: roster(['zubear', 'priya', 'neha', 'miyajan'], 'Added Mar 20') },
];

const messagesMap: Record<string, Message[]> = {
  'general': [
    { id: 1, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', date: 'Yesterday', timestamp: '4:42 PM',
      content: 'Q4 closed strong — thank you everyone. I\'ll share the team-wide bonus framework on Monday.',
      reactions: [{ emoji: '🎉', count: 9, reacted: true }, { emoji: '🙌', count: 5, reacted: false }], pinned: true },
    { id: 2, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', date: 'Today', timestamp: '9:14 AM',
      content: 'Reminder: office is closed Friday for the offsite. RSVPs by EOD today please.',
      threadId: 'th-offsite', replyCount: 3 },
    { id: 3, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '9:18 AM',
      content: 'Confirmed — flying in Thursday night.' },
    { id: 4, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', timestamp: '10:02 AM',
      content: 'Town hall this Thursday 4pm IST. Agenda is in the doc — please add questions ahead of time.',
      threadId: 'th-townhall', replyCount: 6 },
  ],
  'announcements': [
    { id: 1, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', date: 'Today', timestamp: '8:30 AM',
      content: 'New WFH policy is live — see #people-ops for the full doc. Headline: 2 anchor days/week (Tues + Thurs), rest flexible.',
      reactions: [{ emoji: '👍', count: 12, reacted: false }] },
  ],
  'leadership': [
    { id: 1, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', date: 'Today', timestamp: '11:38 AM',
      content: 'Q1 OKR doc is in the drive. Need both HOD reads by EOD — @miyajan can you summarize the SEM section so we have something tight for Monday\'s board prep?',
      threadId: 'th-q1okr', replyCount: 2 },
    { id: 2, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '11:55 AM',
      content: 'Reading now. Will share the SEM section commentary by 6pm.' },
  ],
  'performance-marketing': [
    { id: 1, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', date: 'Today', timestamp: '10:12 AM',
      content: 'Heads up — Google Ads just rolled out their new Performance Max creative format. Want to pilot it on Acme Corp at a small daily cap and report back next week. Anyone object?',
      threadId: 'th-pmax', replyCount: 4, reactions: [{ emoji: '✅', count: 3, reacted: false }] },
    { id: 2, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '10:18 AM',
      content: 'On it, Tejas — pulling the numbers now. Which platforms, and what date range are you looking at? @miyajan should I include lookalike CPA breakdown?' },
    { id: 3, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '10:21 AM',
      content: 'Last 7 days, Meta only. Google looks normal. Yes on lookalike CPA breakdown.' },
    { id: 4, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '11:22 AM',
      content: 'Found it. Top lookalike audience hit its budget cap Tuesday and auto-paused — prospecting fell back to broader cold audiences which always cost more. Lifting the cap now, will monitor.',
      reactions: [{ emoji: '🙏', count: 2, reacted: true }] },
  ],
  'accounts-taxation': [
    { id: 1, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', date: 'Yesterday', timestamp: '3:12 PM',
      content: 'Sharing the GST-Q4 draft for review — flagged 2 reconciliation items that need decisions from finance.',
      threadId: 'th-gstq4', replyCount: 4, pinned: true },
    { id: 2, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', date: 'Today', timestamp: '9:45 AM',
      content: 'Compliance calendar for April updated — TDS due 7th, PF due 15th, GSTR-1 due 11th. Set your reminders.' },
  ],
  'operations': [
    { id: 1, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', date: 'Today', timestamp: '11:08 AM',
      content: 'Vendor invoice for AC servicing came in 18% over quote. They\'re saying scope changed. Want to escalate or absorb?',
      threadId: 'th-acvendor', replyCount: 2 },
  ],
  'people-ops': [
    { id: 1, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', date: 'Yesterday', timestamp: '5:30 PM',
      content: 'New WFH policy posted — 2 anchor days/week (Tues + Thurs). Full doc attached. Feedback welcome in this channel.' },
  ],
  'random': [
    { id: 1, sender: 'Harshal Rane', avatar: 'HR', role: 'Operations', date: 'Today', timestamp: '12:52 PM',
      content: 'Lunch run — Britannia & Co at 1:15. Drop a 🍕 if you\'re in.',
      reactions: [{ emoji: '🍕', count: 6, reacted: true }] },
  ],
  'dm-tejas': [
    { id: 1, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', date: 'Today', timestamp: '11:42 AM',
      content: 'Hey — for the OKR summary, can you also pull the SEM team\'s capacity snapshot for the board deck? Small ask but helpful.' },
  ],
  'dm-mihir': [
    { id: 1, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', date: 'Yesterday', timestamp: '6:12 PM',
      content: '@miyajan can you confirm Friday\'s offsite RSVP? Need a final headcount by tomorrow morning.' },
    { id: 2, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', date: 'Today', timestamp: '8:01 AM',
      content: 'Bumping ↑ — caterer needs final number by 10am today.' },
  ],
  // ─── Client channels ───
  'client-acme-corp': [
    { id: 1, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', date: 'Yesterday', timestamp: '4:18 PM',
      content: 'Account snapshot for Acme this week: spend ₹18.4L · CPL ₹412 · ROAS 3.2×. Lookalike audience is back to baseline after the cap fix.', pinned: true,
      reactions: [{ emoji: '📈', count: 3, reacted: false }] },
    { id: 2, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', date: 'Today', timestamp: '9:42 AM',
      content: 'Kicking off the Performance Max pilot today — small daily cap ₹15K to start. Will drop the readout in this thread.',
      threadId: 'th-acme-pmax', replyCount: 2 },
    { id: 3, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '9:55 AM',
      content: 'Sounds good. Let\'s keep the cap conservative for the first 5 days.' },
    { id: 4, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '11:30 AM',
      content: 'Day 1 readout: 4 conversions, CPA ₹468 (+13% vs baseline) — within the expected ramp-up band. Will share day 2 tomorrow morning.' },
  ],
  'client-lenskart': [
    { id: 1, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', date: 'Today', timestamp: '10:05 AM',
      content: 'Lenskart Q1 review deck is ready — sharing the link in this thread. Headline: ROAS up 18% QoQ, CPA down ₹62.',
      threadId: 'th-lenskart-q1', replyCount: 1 },
  ],
  'client-sugar-cosmetics': [
    { id: 1, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', date: 'Yesterday', timestamp: '2:48 PM',
      content: 'Sugar Cosmetics — March books closed. ITC matched, 1 vendor reconciliation pending (₹38K, marked in the sheet).', pinned: true },
    { id: 2, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', date: 'Today', timestamp: '11:20 AM',
      content: '@miyajan client asked about the GSTR-3B filing window — confirmed we\'re on track for the 20th. Reply sent.',
      threadId: 'th-sugar-gstr', replyCount: 2 },
  ],
  'client-wakefit': [
    { id: 1, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', date: 'Today', timestamp: '9:12 AM',
      content: 'Wakefit — Q4 advance tax computation done. Slight delta vs last quarter\'s estimate (+₹1.2L), challan ready for review.' },
  ],
};

/* ─── Threads ─── */
const threadsData: Thread[] = [
  {
    id: 'th-pmax', channelId: 'performance-marketing', unread: true, lastReplyAt: '3h ago',
    participantAvatars: ['MJ', 'CP', 'TA'],
    parent: { id: 1, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', date: 'Today', timestamp: '10:12 AM',
      content: 'Heads up — Google Ads just rolled out their new Performance Max creative format. Want to pilot it on Acme Corp at a small daily cap and report back next week. Anyone object?' },
    replies: [
      { id: 11, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', timestamp: '10:35 AM',
        content: 'Sounds good. What CPA pattern should we expect during ramp-up?' },
      { id: 12, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '10:48 AM',
        content: 'Based on similar PMax pilots: expect CPA ~15–20% above baseline days 1–3 while the algorithm is learning, converging to baseline by day 5–6. By day 7 you should be at baseline or slightly better. Anything worse than +30% on day 3 is my signal to pause.',
        reactions: [{ emoji: '👍', count: 2, reacted: false }] },
      { id: 13, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '11:03 AM',
        content: 'Will do. I\'ll also drop a 2-line daily readout in this thread — CPA, CTR, pacing — so you both have a single place to check.',
        reactions: [{ emoji: '🙌', count: 1, reacted: false }] },
      { id: 14, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '11:08 AM',
        content: 'Perfect, thanks both 🙏' },
    ],
  },
  {
    id: 'th-gstq4', channelId: 'accounts-taxation', unread: true, lastReplyAt: '1d ago',
    participantAvatars: ['ZS', 'MJ'],
    parent: { id: 1, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', date: 'Yesterday', timestamp: '3:12 PM',
      content: 'Sharing the GST-Q4 draft for review — flagged 2 reconciliation items that need decisions from finance.' },
    replies: [
      { id: 21, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '3:45 PM',
        content: 'Looking now. Which two items?' },
      { id: 22, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', timestamp: '3:51 PM',
        content: '1) Vendor credit note from Feb that wasn\'t reversed in the books. 2) ITC mismatch on travel category — looks like a vendor GSTIN typo. Both highlighted in the sheet.' },
      { id: 23, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '4:12 PM',
        content: 'Got it. (1) reverse it. (2) ping the vendor for a corrected invoice — keep ITC parked till they confirm.' },
      { id: 24, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', timestamp: '4:18 PM',
        content: 'Done. Will refile after vendor confirms — should be in the window.' },
    ],
  },
  {
    id: 'th-townhall', channelId: 'general', unread: false, lastReplyAt: '4h ago',
    participantAvatars: ['TA', 'CP', 'ZS', 'MJ', 'HR'],
    parent: { id: 4, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', date: 'Today', timestamp: '10:02 AM',
      content: 'Town hall this Thursday 4pm IST. Agenda is in the doc — please add questions ahead of time.' },
    replies: [
      { id: 31, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '10:14 AM', content: 'Added two from the SEM team.' },
      { id: 32, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', timestamp: '10:22 AM', content: 'A&T questions added.' },
      { id: 33, sender: 'Harshal Rane', avatar: 'HR', role: 'Operations', timestamp: '10:31 AM', content: 'Same — Ops questions in.' },
    ],
  },
  {
    id: 'th-acvendor', channelId: 'operations', unread: false, lastReplyAt: '1h ago',
    participantAvatars: ['ML', 'MJ'],
    parent: { id: 1, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', date: 'Today', timestamp: '11:08 AM',
      content: 'Vendor invoice for AC servicing came in 18% over quote. They\'re saying scope changed. Want to escalate or absorb?' },
    replies: [
      { id: 41, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '11:22 AM',
        content: 'Escalate. Ask for an itemized scope-change justification before we approve. We\'ve let too many small overruns through this quarter.' },
      { id: 42, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', timestamp: '11:30 AM',
        content: 'On it.' },
    ],
  },
  {
    id: 'th-q1okr', channelId: 'leadership', unread: true, lastReplyAt: '2h ago',
    participantAvatars: ['TA', 'CP'],
    parent: { id: 1, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', date: 'Today', timestamp: '11:38 AM',
      content: 'Q1 OKR doc is in the drive. Need both HOD reads by EOD — @miyajan can you summarize the SEM section so we have something tight for Monday\'s board prep?' },
    replies: [
      { id: 51, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '11:55 AM',
        content: 'Reading now. Will share the SEM section commentary by 6pm.' },
      { id: 52, sender: 'Tejas Atha', avatar: 'TA', role: 'COO', timestamp: '12:10 PM',
        content: 'Thanks Chinmay. Miyajan — short and pointed is fine, just the top 3 bets and what could break them.' },
    ],
  },
  {
    id: 'th-acme-pmax', channelId: 'client-acme-corp', unread: true, lastReplyAt: '1h ago',
    participantAvatars: ['CP', 'MJ'],
    parent: { id: 2, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', date: 'Today', timestamp: '9:42 AM',
      content: 'Kicking off the Performance Max pilot today — small daily cap ₹15K to start. Will drop the readout in this thread.' },
    replies: [
      { id: 71, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '9:55 AM',
        content: 'Sounds good. Let\'s keep the cap conservative for the first 5 days.' },
      { id: 72, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '11:30 AM',
        content: 'Day 1: 4 conversions, CPA ₹468 (+13% vs baseline) — within expected ramp-up band.',
        reactions: [{ emoji: '🙌', count: 1, reacted: false }] },
    ],
  },
  {
    id: 'th-sugar-gstr', channelId: 'client-sugar-cosmetics', unread: false, lastReplyAt: '2h ago',
    participantAvatars: ['ZS', 'MJ'],
    parent: { id: 2, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', date: 'Today', timestamp: '11:20 AM',
      content: '@miyajan client asked about the GSTR-3B filing window — confirmed we\'re on track for the 20th. Reply sent.' },
    replies: [
      { id: 81, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '11:25 AM',
        content: 'Good. Make sure the ₹38K vendor reconciliation is cleared before filing.' },
      { id: 82, sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD', timestamp: '11:58 AM',
        content: 'On it — vendor responded this morning. Should be cleared by EOD.' },
    ],
  },
  {
    id: 'th-lenskart-q1', channelId: 'client-lenskart', unread: false, lastReplyAt: '30m ago',
    participantAvatars: ['CP', 'MJ'],
    parent: { id: 1, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', date: 'Today', timestamp: '10:05 AM',
      content: 'Lenskart Q1 review deck is ready — sharing the link in this thread. Headline: ROAS up 18% QoQ, CPA down ₹62.' },
    replies: [
      { id: 91, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '10:32 AM',
        content: 'Huge. Send me the deck link — want to read before the client call tomorrow.' },
    ],
  },
  {
    id: 'th-offsite', channelId: 'general', unread: false, lastReplyAt: '3h ago',
    participantAvatars: ['MJ', 'CP', 'HR'],
    parent: { id: 2, sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin', date: 'Today', timestamp: '9:14 AM',
      content: 'Reminder: office is closed Friday for the offsite. RSVPs by EOD today please.' },
    replies: [
      { id: 61, sender: 'Miyajan', avatar: 'MJ', isUser: true, timestamp: '9:18 AM', content: 'Confirmed — flying in Thursday night.' },
      { id: 62, sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD', timestamp: '9:34 AM', content: 'In.' },
      { id: 63, sender: 'Harshal Rane', avatar: 'HR', role: 'Operations', timestamp: '10:01 AM', content: 'In, with +1.' },
    ],
  },
];

/* ─── Mentions ─── */
const mentionsData: Mention[] = [
  { id: 'mn1', channelId: 'leadership', channelName: 'leadership', channelKind: 'channel',
    sender: 'Tejas Atha', avatar: 'TA', role: 'COO',
    contentBefore: 'Q1 OKR doc is in the drive. Need both HOD reads by EOD — ',
    contentAfter: ' can you summarize the SEM section so we have something tight for Monday\'s board prep?',
    timestamp: '11:38 AM', date: 'Today', read: false },
  { id: 'mn2', channelId: 'performance-marketing', channelName: 'performance-marketing', channelKind: 'channel',
    sender: 'Chinmay Pawar', avatar: 'CP', role: 'SEM HOD',
    contentBefore: 'On it, Tejas — pulling the numbers now. Which platforms, and what date range are you looking at? ',
    contentAfter: ' should I include lookalike CPA breakdown?',
    timestamp: '10:18 AM', date: 'Today', read: false },
  { id: 'mn3', channelId: 'dm-mihir', channelName: 'Mihir Lunia', channelKind: 'dm',
    sender: 'Mihir Lunia', avatar: 'ML', role: 'Admin',
    contentBefore: '',
    contentAfter: ' can you confirm Friday\'s offsite RSVP? Need a final headcount by tomorrow morning.',
    timestamp: '6:12 PM', date: 'Yesterday', read: true },
  { id: 'mn4', channelId: 'client-sugar-cosmetics', channelName: 'sugar-cosmetics', channelKind: 'client',
    sender: 'Zubear Shaikh', avatar: 'ZS', role: 'A&T HOD',
    contentBefore: '',
    contentAfter: ' client asked about the GSTR-3B filing window — confirmed we\'re on track for the 20th. Reply sent.',
    timestamp: '11:20 AM', date: 'Today', read: false },
];

/* ─── Saved (Starred) ─── */
const savedData: SavedMessage[] = [
  { id: 'sv1', channelId: 'general', channelName: 'general', channelKind: 'channel',
    sender: 'Tejas Atha', avatar: 'TA',
    content: 'Q4 closed strong — thank you everyone. I\'ll share the team-wide bonus framework on Monday.',
    savedAt: 'Saved yesterday' },
  { id: 'sv2', channelId: 'performance-marketing', channelName: 'performance-marketing', channelKind: 'channel',
    sender: 'Chinmay Pawar', avatar: 'CP',
    content: 'Found it. Top lookalike audience hit its budget cap Tuesday and auto-paused — prospecting fell back to broader cold audiences which always cost more. Lifting the cap now.',
    savedAt: 'Saved 2h ago' },
  { id: 'sv3', channelId: 'accounts-taxation', channelName: 'accounts-taxation', channelKind: 'channel',
    sender: 'Zubear Shaikh', avatar: 'ZS',
    content: 'Compliance calendar for April updated — TDS due 7th, PF due 15th, GSTR-1 due 11th.',
    savedAt: 'Saved 3d ago' },
  { id: 'sv4', channelId: 'client-acme-corp', channelName: 'acme-corp', channelKind: 'client',
    sender: 'Chinmay Pawar', avatar: 'CP',
    content: 'Account snapshot for Acme this week: spend ₹18.4L · CPL ₹412 · ROAS 3.2×. Lookalike audience is back to baseline after the cap fix.',
    savedAt: 'Saved 1h ago' },
];

/* ─── Files ─── */
const filesData: SharedFile[] = [
  { id: 'f1', type: 'doc',   name: 'Q1-OKRs-Draft.pdf',         meta: 'PDF · 1.4 MB',           channelId: 'leadership',            channelName: 'leadership',            channelKind: 'channel', sharedBy: 'Tejas Atha',     avatar: 'TA', sharedAt: '2h ago' },
  { id: 'f2', type: 'doc',   name: 'GST-Q4-Reconciliation.xlsx', meta: 'XLSX · 318 KB',          channelId: 'accounts-taxation',     channelName: 'accounts-taxation',     channelKind: 'channel', sharedBy: 'Zubear Shaikh',  avatar: 'ZS', sharedAt: 'Yesterday' },
  { id: 'f3', type: 'link',  name: 'brego.io/playbook/pmax',     meta: 'brego.io',               channelId: 'performance-marketing', channelName: 'performance-marketing', channelKind: 'channel', sharedBy: 'Chinmay Pawar',  avatar: 'CP', sharedAt: 'Today' },
  { id: 'f4', type: 'image', name: 'Town-hall-deck-cover.png',   meta: 'PNG · 2.1 MB',           channelId: 'general',               channelName: 'general',               channelKind: 'channel', sharedBy: 'Tejas Atha',     avatar: 'TA', sharedAt: '4h ago' },
  { id: 'f5', type: 'doc',   name: 'WFH-Policy-v2.pdf',          meta: 'PDF · 612 KB',           channelId: 'people-ops',            channelName: 'people-ops',            channelKind: 'channel', sharedBy: 'Mihir Lunia',       avatar: 'ML', sharedAt: 'Yesterday' },
  { id: 'f6', type: 'link',  name: 'figma.com/file/brego-board', meta: 'figma.com',              channelId: 'leadership',            channelName: 'leadership',            channelKind: 'channel', sharedBy: 'Tejas Atha',     avatar: 'TA', sharedAt: '3d ago' },
  { id: 'f7', type: 'doc',   name: 'Acme-Q1-Performance.pdf',    meta: 'PDF · 894 KB',           channelId: 'client-acme-corp',      channelName: 'acme-corp',             channelKind: 'client',  sharedBy: 'Chinmay Pawar',  avatar: 'CP', sharedAt: '12m ago' },
  { id: 'f8', type: 'doc',   name: 'Sugar-March-Books.xlsx',     meta: 'XLSX · 412 KB',          channelId: 'client-sugar-cosmetics',channelName: 'sugar-cosmetics',       channelKind: 'client',  sharedBy: 'Zubear Shaikh',  avatar: 'ZS', sharedAt: 'Yesterday' },
  { id: 'f9', type: 'link',  name: 'lenskart.com/q1-review',     meta: 'lenskart.com',           channelId: 'client-lenskart',       channelName: 'lenskart',              channelKind: 'client',  sharedBy: 'Chinmay Pawar',  avatar: 'CP', sharedAt: '30m ago' },
];

/* ─── AI Summaries (per channel) ─── */
const aiSummaryMap: Record<string, AISummaryData> = {
  'general': {
    overview: 'Q4 close-out celebration from Tejas opened the week. Mihir is collecting Friday offsite RSVPs (caterer cutoff today), and Tejas confirmed Thursday\'s 4pm town hall — agenda doc is open for questions.',
    keyDecisions: [
      'Q4 bonus framework to be shared Monday',
      'Town hall confirmed: Thursday 4pm IST',
      'Office closed Friday for offsite',
    ],
    actionItems: [
      { text: 'Submit Friday offsite RSVP', owner: 'Everyone', ownerAvatar: 'HR', status: 'pending', due: 'Today EOD' },
      { text: 'Add questions to town hall agenda', owner: 'All HODs', ownerAvatar: 'CP', status: 'pending', due: 'Wed EOD' },
      { text: 'Confirm offsite RSVP', owner: 'You', ownerAvatar: 'MJ', status: 'done', due: 'Done' },
    ],
    messageRange: '4 messages · Yesterday – Today',
    generatedAt: 'Just now',
  },
  'performance-marketing': {
    overview: 'Chinmay is proposing a small-cap pilot of Google Ads\' new Performance Max creative format on Acme Corp, with a daily readout in-thread. Separately, the Meta CPA spike was traced to a top lookalike audience hitting its budget cap and auto-pausing — cap has been lifted.',
    keyDecisions: [
      'Pilot Performance Max on Acme Corp at small daily cap',
      'Lift budget cap on top lookalike audience',
      'Daily 2-line readout (CPA, CTR, pacing) to live in thread',
    ],
    actionItems: [
      { text: 'Launch PMax pilot for Acme Corp', owner: 'Chinmay Pawar', ownerAvatar: 'CP', status: 'pending', due: 'This week' },
      { text: 'Post daily PMax readout in thread', owner: 'Chinmay Pawar', ownerAvatar: 'CP', status: 'pending', due: 'Daily' },
      { text: 'Review pause criteria (>+30% CPA day 3)', owner: 'You', ownerAvatar: 'MJ', status: 'pending' },
    ],
    messageRange: '4 messages · 10:12 AM – 11:22 AM',
    generatedAt: 'Just now',
  },
  'leadership': {
    overview: 'Tejas posted the Q1 OKR doc and asked for both HOD reads by EOD. Miyajan is on the hook for a tight summary of the SEM section for Monday\'s board prep — Tejas wants top 3 bets plus what could break them.',
    keyDecisions: [
      'SEM section summary owned by Miyajan, due before Monday board prep',
      'Format: top 3 bets + what could break them',
    ],
    actionItems: [
      { text: 'Read Q1 OKR doc and comment', owner: 'All HODs', ownerAvatar: 'CP', status: 'pending', due: 'Today EOD' },
      { text: 'Summarize SEM section for board prep', owner: 'You', ownerAvatar: 'MJ', status: 'pending', due: 'Before Monday' },
      { text: 'Share SEM section commentary', owner: 'Chinmay Pawar', ownerAvatar: 'CP', status: 'pending', due: '6pm today' },
    ],
    messageRange: '2 messages · 11:38 AM – 11:55 AM',
    generatedAt: 'Just now',
  },
  'accounts-taxation': {
    overview: 'Zubear shared the Q4 GST draft and flagged two reconciliation items: a Feb vendor credit note that wasn\'t reversed, and an ITC mismatch from a vendor GSTIN typo. Both have decisions; refiling once the vendor confirms.',
    keyDecisions: [
      'Reverse the Feb vendor credit note',
      'Park ITC for travel until vendor sends corrected invoice',
    ],
    actionItems: [
      { text: 'Refile GST Q4 after vendor confirms', owner: 'Zubear Shaikh', ownerAvatar: 'ZS', status: 'pending', due: 'This week' },
      { text: 'Set April compliance reminders (TDS 7th, PF 15th, GSTR-1 11th)', owner: 'Everyone', ownerAvatar: 'ZS', status: 'pending' },
    ],
    messageRange: '2 messages · Yesterday – Today',
    generatedAt: 'Just now',
  },
  'client-acme-corp': {
    overview: 'PMax pilot for Acme Corp launched today at a conservative ₹15K daily cap. Day 1 readout is in: 4 conversions, CPA ₹468 (+13% vs baseline) — within Chinmay\'s expected ramp-up band. Weekly snapshot: spend ₹18.4L, CPL ₹412, ROAS 3.2×.',
    keyDecisions: [
      'Keep PMax cap conservative for first 5 days',
      'Daily readout posted in #client-acme-corp pilot thread',
    ],
    actionItems: [
      { text: 'Post Day 2 PMax readout', owner: 'Chinmay Pawar', ownerAvatar: 'CP', status: 'pending', due: 'Tomorrow AM' },
      { text: 'Review pause criteria (>+30% CPA day 3)', owner: 'You', ownerAvatar: 'MJ', status: 'pending' },
    ],
    messageRange: '4 messages · Yesterday – Today',
    generatedAt: 'Just now',
  },
  'client-sugar-cosmetics': {
    overview: 'March books closed with one ₹38K vendor reconciliation pending — vendor responded today, expected clear by EOD. GSTR-3B filing on track for the 20th; client query already replied.',
    keyDecisions: [
      'Clear ₹38K vendor reconciliation before GSTR-3B filing',
      'Confirmed GSTR-3B filing window: 20th',
    ],
    actionItems: [
      { text: 'Clear ₹38K vendor reconciliation', owner: 'Zubear Shaikh', ownerAvatar: 'ZS', status: 'pending', due: 'EOD today' },
      { text: 'File GSTR-3B', owner: 'Zubear Shaikh', ownerAvatar: 'ZS', status: 'pending', due: 'By 20th' },
    ],
    messageRange: '2 messages · Yesterday – Today',
    generatedAt: 'Just now',
  },
};

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function totalUnreadMentions(): number {
  return mentionsData.filter(m => !m.read).length;
}

function totalUnreadThreads(): number {
  return threadsData.filter(t => t.unread).length;
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function Inbox() {
  /* ────────── State ────────── */
  /* Channels live in component state so admins can create/delete them at
     runtime. The seed list is the read-only starting set. */
  const [channels, setChannels] = useState<Channel[]>(seedChannels);
  const [selectedChannel, setSelectedChannel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ch = params.get('channel');
      if (ch && seedChannels.some(c => c.id === ch)) return ch;
    }
    return 'general';
  });
  const [view, setView] = useState<MainView>('channel');
  const [search, setSearch] = useState('');
  const [composer, setComposer] = useState('');
  const [collapsedDMs, setCollapsedDMs] = useState(false);
  const [collapsedChannels, setCollapsedChannels] = useState(false);
  const [collapsedClients, setCollapsedClients] = useState(false);
  const [injectedMessages, setInjectedMessages] = useState<Record<string, Message[]>>({});
  const [filesFilter, setFilesFilter] = useState<'all' | 'doc' | 'image' | 'link'>('all');
  const [mentionsFilter, setMentionsFilter] = useState<'all' | 'unread'>('all');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadComposer, setThreadComposer] = useState('');
  const [threadCrosspost, setThreadCrosspost] = useState(false);
  // Single pin store for ALL channel kinds (client, internal, dm). Seeded from any
  // channel that ships with `pinned: true`. Pinning floats a row to the top of its
  // section and persists for the session.
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set(seedChannels.filter(c => c.pinned).map(c => c.id))
  );
  // Per-message reaction overlay. Keyed by message id. Once a message has been
  // touched (chip toggled or emoji added), its entry here replaces the seed
  // `msg.reactions`. Persists for the session so reactions stay sticky as the
  // user clicks between channels.
  const [messageReactions, setMessageReactions] = useState<Record<number, Reaction[]>>({});
  // Pinned-message overlay. Keyed by composite `${channelId}|${msgId}` because
  // message ids are only unique within a channel. Seeded from any message that
  // ships with `pinned: true`, then becomes the single source of truth — the
  // seed flag is ignored on render so unpin works without mutating mock data.
  const [pinnedMessageKeys, setPinnedMessageKeys] = useState<Set<string>>(() => {
    const seed = new Set<string>();
    Object.entries(messagesMap).forEach(([cid, msgs]) => {
      msgs.forEach(m => { if (m.pinned) seed.add(`${cid}|${m.id}`); });
    });
    return seed;
  });
  // Which channel currently has the "pinned messages" popover open. Null when
  // closed. We store the channel id (not a boolean) so switching channels
  // auto-dismisses the popover without an extra effect.
  const [pinnedListOpen, setPinnedListOpen] = useState<string | null>(null);
  /* ── Members drawer + removal state ──
     `removedMemberKeys` holds composite `${channelId}|${memberId}` keys for
     soft-deleted members (we never mutate the channel data — we filter on
     read so Undo is trivial). `removalToast` powers the bottom-of-drawer
     undo affordance and auto-dismisses on a timer. */
  const [membersOpen, setMembersOpen] = useState(false);
  const [removedMemberKeys, setRemovedMemberKeys] = useState<Set<string>>(new Set());
  const [removalToast, setRemovalToast] = useState<{ channelId: string; member: ChannelMember; reason?: string } | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseService, setBrowseService] = useState<'all' | ClientService>('all');

  /* ── Channel CRUD (admin-gated) ──
     Single source of truth for the create modal and the destructive
     delete-confirm modal. The header ⋯ menu is a tiny popover gated by
     `headerMenuOpen` so we can close it on outside click without managing a
     separate hook for every channel switch. */
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);

  /* AI Summary drawer */
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [aiData, setAiData] = useState<AISummaryData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTypingIdx, setAiTypingIdx] = useState(0);

  /* ── Composer extras ──
     Attachments are session-only. We never actually upload — selecting a file
     just registers metadata so the composer chip + sent-message attachment
     list render. They reset on send, on channel change, and on explicit dismiss. */
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);

  /* ── Save-for-later ──
     Single Set of composite `${channelId}|${msgId}` keys. Seeds from the
     fixture `savedData` (which already maps to real messages in messagesMap)
     so the Saved view is non-empty on first load, and the Star button on
     each message reflects the correct state immediately. */
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set([
    'general|1',
    'performance-marketing|4',
    'accounts-taxation|2',
    'client-acme-corp|1',
  ]));

  /* ── Read state for mentions + threads ──
     Click → open marks the row read locally. Counters react via derived
     selectors. We never mutate the seed data so a future "mark unread"
     flow is trivial. */
  const [readMentionIds, setReadMentionIds] = useState<Set<string>>(new Set());
  const [readThreadIds, setReadThreadIds]   = useState<Set<string>>(new Set());

  /* ── Thread reply overlay ──
     Per-thread list of replies the user posted this session. Merged with the
     seed `thread.replies` whenever ThreadDrawer renders. Crosspost piggy-backs
     on `injectedMessages` so the reply also appears in the parent channel. */
  const [threadReplies, setThreadReplies] = useState<Record<string, ThreadReply[]>>({});

  /* ── Inline composer pickers ──
     Mention popover (team picker) and Emoji popover (insert into text). We
     keep both open-states here so they can be co-ordinated (only one open at
     a time) and reset on channel switch. */
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen]     = useState(false);

  /* Lightweight toast for transient confirmations (file open, save, etc.) */
  const [actionToast, setActionToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ────────── Derived ────────── */
  const currentChannel = channels.find(c => c.id === selectedChannel);
  const baseMessages = messagesMap[selectedChannel] || [];
  const extraMessages = injectedMessages[selectedChannel] || [];
  const currentMessages: Message[] = useMemo(
    () => [...baseMessages, ...extraMessages],
    [baseMessages, extraMessages]
  );

  const channelList = channels.filter(c => c.kind === 'channel');
  const dmList = channels.filter(c => c.kind === 'dm');
  const clientList = channels.filter(c => c.kind === 'client');

  const matchesSearch = (c: Channel) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.companyName?.toLowerCase().includes(q) ?? false)
    );
  };

  const filteredChannels = channelList.filter(matchesSearch);
  const filteredDMs = dmList.filter(matchesSearch);

  // Sidebar shows: pinned clients + the client currently being viewed (so the current
  // selection is always visible without flooding the list).
  const sidebarClients = useMemo(() => {
    const pinnedOrViewing = clientList.filter(c =>
      pinnedIds.has(c.id) || c.unread > 0 || c.id === selectedChannel
    );
    return pinnedOrViewing.sort((a, b) => {
      const ap = pinnedIds.has(a.id) ? 0 : 1;
      const bp = pinnedIds.has(b.id) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (b.unread || 0) - (a.unread || 0);
    });
  }, [clientList, pinnedIds, selectedChannel]);

  // Internal channels and DMs: pinned float to the top, otherwise stable order.
  const sortByPinned = (a: Channel, b: Channel) => {
    const ap = pinnedIds.has(a.id) ? 0 : 1;
    const bp = pinnedIds.has(b.id) ? 0 : 1;
    return ap - bp;
  };
  const orderedChannels = useMemo(() => [...filteredChannels].sort(sortByPinned), [filteredChannels, pinnedIds]);
  const orderedDMs = useMemo(() => [...filteredDMs].sort(sortByPinned), [filteredDMs, pinnedIds]);

  const visibleSidebarClients = search.trim() ? clientList.filter(matchesSearch) : sidebarClients;
  const hiddenClientCount = Math.max(0, clientList.length - visibleSidebarClients.length);

  const activeThread = activeThreadId ? threadsData.find(t => t.id === activeThreadId) : null;

  const filteredFiles = filesData.filter(f => filesFilter === 'all' ? true : f.type === filesFilter);
  // Apply the per-row read overlay BEFORE filtering by read state, otherwise
  // a row marked read in this session would still show under the Unread tab.
  const mentionsWithRead = useMemo(
    () => mentionsData.map(m => ({ ...m, read: m.read || readMentionIds.has(m.id) })),
    [readMentionIds]
  );
  const filteredMentions = mentionsWithRead.filter(m => mentionsFilter === 'all' ? true : !m.read);
  const threadsWithRead = useMemo(
    () => threadsData.map(t => ({ ...t, unread: t.unread && !readThreadIds.has(t.id) })),
    [readThreadIds]
  );
  const unreadMentionCount = mentionsWithRead.filter(m => !m.read).length;
  const unreadThreadCount  = threadsWithRead.filter(t => t.unread).length;

  // Saved messages — derive from savedKeys by walking every channel's
  // base+injected message list. That keeps the source of truth in one place
  // (the Set) and means newly-saved live messages flow into the Saved view.
  const savedItems = useMemo(() => {
    const items: { key: string; channelId: string; msg: Message }[] = [];
    Object.entries(messagesMap).forEach(([cid, msgs]) => {
      msgs.forEach(m => {
        const key = `${cid}|${m.id}`;
        if (savedKeys.has(key)) items.push({ key, channelId: cid, msg: m });
      });
    });
    Object.entries(injectedMessages).forEach(([cid, msgs]) => {
      msgs.forEach(m => {
        const key = `${cid}|${m.id}`;
        if (savedKeys.has(key)) items.push({ key, channelId: cid, msg: m });
      });
    });
    return items;
  }, [savedKeys, injectedMessages]);

  /* ────────── Effects ────────── */

  // Scroll to bottom on channel change / new message
  useEffect(() => {
    if (view === 'channel') messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [selectedChannel, view, currentMessages.length]);

  // Focus composer on channel change
  useEffect(() => {
    if (view === 'channel') composerRef.current?.focus();
  }, [selectedChannel, view]);

  // Reset transient drawer state when channel changes. We deliberately blow
  // away in-progress composer attachments and any open composer pickers — a
  // half-attached file from a different channel would be confusing.
  useEffect(() => {
    setShowAIDrawer(false);
    setAiData(null);
    setAiLoading(false);
    setAiTypingIdx(0);
    setActiveThreadId(null);
    setMembersOpen(false);
    setComposerAttachments([]);
    setMentionPickerOpen(false);
    setEmojiPickerOpen(false);
  }, [selectedChannel]);

  // Auto-dismiss the action toast after 2.4s.
  useEffect(() => {
    if (!actionToast) return;
    const t = setTimeout(() => setActionToast(null), 2400);
    return () => clearTimeout(t);
  }, [actionToast]);

  // Cross-module injection (PM / A&T → Inbox)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('inbox_discussion_msg');
      if (!raw) return;
      sessionStorage.removeItem('inbox_discussion_msg');
      const data = JSON.parse(raw) as {
        channelId: string;
        clientName?: string;
        service?: ClientService;
        message: string;
        metric?: string;
        proposed?: string;
        client?: string;       // Client-side metric value (legacy field name)
        finalTarget?: string;
        sender?: string;
      };
      if (!data.channelId || !data.message) return;
      // Resolve target channel:
      // 1. Explicit channelId if it exists in our channel list
      // 2. Otherwise fall back to the right team channel by service tag
      const fallbackTeam: string = data.service === 'AT' ? 'accounts-taxation'
        : data.service === 'PM' ? 'performance-marketing'
        : (data.channelId.includes('at-') || data.channelId.includes('tax')
            ? 'accounts-taxation'
            : 'performance-marketing');
      const targetChannel = channels.some(c => c.id === data.channelId) ? data.channelId : fallbackTeam;
      const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      // Build a client-context line so team-channel readers know which client this is about.
      // Prefer explicit `clientName` (sent by the new workspace handlers); fall back to legacy shape.
      const contextLine = data.clientName && data.metric
        ? `📊 Re: ${data.clientName} — ${data.metric} · Proposed ${data.proposed} → Client ${data.client ?? '—'} → Final ${data.finalTarget ?? '—'}`
        : data.clientName
          ? `📊 Re: ${data.clientName}`
          : data.client && data.metric
            ? `📊 Re: ${data.client} — ${data.metric} · Proposed ${data.proposed} → Client ${data.client} → Final ${data.finalTarget}`
            : null;
      const newMessages: Message[] = [];
      if (contextLine) {
        newMessages.push({ id: Date.now() - 1, sender: 'Miyajan', avatar: 'MJ', isUser: true, content: contextLine, timestamp: now });
      }
      newMessages.push({ id: Date.now(), sender: 'Miyajan', avatar: 'MJ', isUser: true, content: data.message, timestamp: now });
      setInjectedMessages(prev => ({ ...prev, [targetChannel]: [...(prev[targetChannel] || []), ...newMessages] }));
      setSelectedChannel(targetChannel);
      setView('channel');
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI Summary progressive reveal
  useEffect(() => {
    if (!aiData) { setAiTypingIdx(0); return; }
    if (aiTypingIdx >= 3) return;
    const t = setTimeout(() => setAiTypingIdx(p => p + 1), 280);
    return () => clearTimeout(t);
  }, [aiData, aiTypingIdx]);

  /* ────────── Handlers ────────── */

  const handleSend = () => {
    const text = composer.trim();
    // Empty send is allowed if there is at least one attachment — file-only
    // posts are common in Slack/Teams and the UX should match.
    if (!text && composerAttachments.length === 0) return;
    // Block send while any attachment is still uploading. The Send button is
    // already disabled in this state but Enter could otherwise sneak through.
    if (composerAttachments.some(a => (a.status ?? 'ready') !== 'ready')) {
      setActionToast('Waiting for uploads to finish…');
      return;
    }
    // Strip the upload-only fields before persisting on the message — they're
    // composer-state, not part of the public attachment shape.
    const cleanedAttachments = composerAttachments.map(({ progress, status, ...rest }) => rest);
    const newMsg: Message = {
      id: Date.now(),
      sender: 'Miyajan', avatar: 'MJ', isUser: true,
      content: text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      attachments: cleanedAttachments.length > 0 ? cleanedAttachments : undefined,
    };
    setInjectedMessages(prev => ({ ...prev, [selectedChannel]: [...(prev[selectedChannel] || []), newMsg] }));
    setComposer('');
    setComposerAttachments([]);
    setMentionPickerOpen(false);
    setEmojiPickerOpen(false);
    composerRef.current?.focus();
  };

  const handleComposerKey = (e: React.KeyboardEvent) => {
    // Suppress the Enter shortcut while either inline picker is open so the
    // user can pick with the keyboard without firing the message accidentally.
    if (e.key === 'Enter' && !e.shiftKey && !mentionPickerOpen && !emojiPickerOpen) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setMentionPickerOpen(false);
      setEmojiPickerOpen(false);
    }
  };

  const handleSendThreadReply = () => {
    const text = threadComposer.trim();
    if (!text || !activeThreadId) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const reply: ThreadReply = {
      id: Date.now(),
      sender: 'Miyajan', avatar: 'MJ', isUser: true,
      content: text,
      timestamp: now,
    };
    setThreadReplies(prev => ({
      ...prev,
      [activeThreadId]: [...(prev[activeThreadId] || []), reply],
    }));
    // Crosspost: also drop the reply into the parent channel as a regular
    // message so it surfaces in the channel scroll. We mark it so future
    // renders could distinguish it (not used today, but cheap to add).
    if (threadCrosspost && activeThread) {
      const channelMsg: Message = {
        id: Date.now() + 1,
        sender: 'Miyajan', avatar: 'MJ', isUser: true,
        content: text,
        timestamp: now,
      };
      setInjectedMessages(prev => ({
        ...prev,
        [activeThread.channelId]: [...(prev[activeThread.channelId] || []), channelMsg],
      }));
    }
    setThreadComposer('');
    setThreadCrosspost(false);
  };

  /* ── Composer extras handlers ── */

  // Format a byte count into a short human string. We intentionally cap at MB
  // because real attachments rarely exceed that in mock data.
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Map a File's MIME type to one of our chip kinds. Unknown types bucket to
  // 'other' so we always have an icon.
  const fileKind = (file: File): ComposerAttachment['kind'] => {
    const t = file.type;
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/')) return 'audio';
    if (/zip|rar|tar|7z/.test(t)) return 'archive';
    if (/pdf|word|excel|powerpoint|sheet|presentation|document|text/.test(t)) return 'doc';
    return 'other';
  };

  const addAttachments = (files: FileList | File[] | null) => {
    if (!files || (files instanceof FileList && files.length === 0)) return;
    const list = Array.from(files);
    const next: ComposerAttachment[] = list.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      size: formatBytes(f.size),
      kind: fileKind(f),
      progress: 0,
      status: 'uploading',
    }));
    setComposerAttachments(prev => [...prev, ...next]);

    // Simulate an async upload pipeline. In production this is where we'd
    // POST to S3/Drive and stream back real `loaded/total` numbers — until
    // then this gives the UI honest motion: a chip that's still uploading
    // looks busy and Send stays disabled until everything is ready.
    next.forEach((att, i) => {
      const total = 600 + Math.floor(Math.random() * 400); // 600–1000ms
      const stagger = i * 80;                              // soft cascade for multi-select
      const start = performance.now() + stagger;
      const tick = (t: number) => {
        const elapsed = Math.max(0, t - start);
        if (elapsed < 0) { requestAnimationFrame(tick); return; }
        const pct = Math.min(100, Math.round((elapsed / total) * 100));
        setComposerAttachments(prev =>
          prev.map(a => a.id === att.id ? { ...a, progress: pct, status: pct >= 100 ? 'ready' : 'uploading' } : a)
        );
        if (pct < 100) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  const removeAttachment = (id: string) => {
    setComposerAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Insert text at the textarea caret. Used by both the mention picker and the
  // emoji picker so insertions land where the user's cursor is, not at the end.
  const insertAtCaret = (insert: string, options?: { focus?: boolean }) => {
    const ta = composerRef.current;
    if (!ta) {
      setComposer(prev => prev + insert);
      return;
    }
    const start = ta.selectionStart ?? composer.length;
    const end   = ta.selectionEnd ?? composer.length;
    const next  = composer.slice(0, start) + insert + composer.slice(end);
    setComposer(next);
    // Restore caret position after React applies the new value.
    requestAnimationFrame(() => {
      const pos = start + insert.length;
      ta.setSelectionRange(pos, pos);
      if (options?.focus !== false) ta.focus();
    });
  };

  /* ── Save-for-later ── */
  const isMessageSaved = (channelId: string, msgId: number) =>
    savedKeys.has(`${channelId}|${msgId}`);
  const toggleSaveMessage = (channelId: string, msgId: number) => {
    const key = `${channelId}|${msgId}`;
    setSavedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        setActionToast('Removed from Saved');
      } else {
        next.add(key);
        setActionToast('Saved for later');
      }
      return next;
    });
  };

  /* ── Mark-as-read ── */
  const markMentionRead = (mentionId: string) => {
    setReadMentionIds(prev => {
      if (prev.has(mentionId)) return prev;
      const next = new Set(prev);
      next.add(mentionId);
      return next;
    });
  };
  const markThreadRead = (threadId: string) => {
    setReadThreadIds(prev => {
      if (prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.add(threadId);
      return next;
    });
  };

  const openChannel = (id: string) => {
    setSelectedChannel(id);
    setView('channel');
    setActiveThreadId(null);
  };

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  /* ── Members drawer handlers ──
     Opening Members closes any other right drawer (AI summary or thread) so
     the user only ever has one focused side panel. */
  const openMembers = () => {
    setMembersOpen(true);
    setShowAIDrawer(false);
    setActiveThreadId(null);
  };
  const closeMembers = () => setMembersOpen(false);

  /** Soft-remove a member by adding to the removed-keys set + showing the
      undo toast. We never mutate the channel roster array — filter at read. */
  const removeMember = (channelId: string, member: ChannelMember, reason?: string) => {
    const key = `${channelId}|${member.id}`;
    setRemovedMemberKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setRemovalToast({ channelId, member, reason });
  };
  const undoRemoveMember = (channelId: string, memberId: string) => {
    const key = `${channelId}|${memberId}`;
    setRemovedMemberKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setRemovalToast(null);
  };

  /* ── Channel CRUD ──
     `createChannel` prepends the new channel to the right section so it surfaces
     immediately in the sidebar, then opens it. `deleteChannel` removes it and
     falls back to #general if the user was viewing the deleted channel — never
     leave the user looking at empty space. We keep messagesMap untouched: a
     deleted channel's history just becomes orphaned, which is fine for a demo
     and matches how soft-delete works in production (audit log retention). */
  const createChannel = (channel: Channel) => {
    setChannels(prev => [...prev, channel]);
    setSelectedChannel(channel.id);
    setView('channel');
    setCreateOpen(false);
  };
  const deleteChannel = (channelId: string) => {
    setChannels(prev => prev.filter(c => c.id !== channelId));
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.delete(channelId);
      return next;
    });
    if (selectedChannel === channelId) setSelectedChannel('general');
    setDeleteTarget(null);
    setHeaderMenuOpen(false);
  };

  // Auto-dismiss the toast after 6s. Cleanup runs whenever the toast changes
  // (including undo) to avoid stale timers firing on a fresh removal.
  useEffect(() => {
    if (!removalToast) return;
    const t = setTimeout(() => setRemovalToast(null), 6000);
    return () => clearTimeout(t);
  }, [removalToast]);

  // Roster for the currently-viewed channel, with soft-removed members hidden.
  const currentRoster = useMemo<ChannelMember[]>(() => {
    if (!currentChannel?.roster) return [];
    return currentChannel.roster.filter(
      m => !removedMemberKeys.has(`${currentChannel.id}|${m.id}`)
    );
  }, [currentChannel, removedMemberKeys]);

  /**
   * Toggle a reaction on a message. Handles three cases:
   *   1. User clicks a chip they already reacted to → count-1, drop chip if 0
   *   2. User clicks a chip someone else started → count+1, mark as reacted
   *   3. User picks a brand-new emoji from the picker → add new chip, count 1
   * The seed `msg.reactions` is copied into the overlay on first touch so the
   * count math is always based on the current visible state.
   */
  const toggleReaction = (msg: Message | ThreadReply, emoji: string) => {
    const seed = (msg as Message).reactions ?? [];
    setMessageReactions(prev => {
      const current = prev[msg.id] ?? seed;
      const existing = current.find(r => r.emoji === emoji);
      let next: Reaction[];
      if (existing) {
        const delta = existing.reacted ? -1 : 1;
        const count = existing.count + delta;
        if (count <= 0) {
          next = current.filter(r => r.emoji !== emoji);
        } else {
          next = current.map(r =>
            r.emoji === emoji ? { ...r, count, reacted: !r.reacted } : r
          );
        }
      } else {
        next = [...current, { emoji, count: 1, reacted: true }];
      }
      return { ...prev, [msg.id]: next };
    });
  };

  const getReactions = (msg: Message | ThreadReply): Reaction[] =>
    messageReactions[msg.id] ?? (msg as Message).reactions ?? [];

  /* ── Pin / unpin a message ──
     Both directions go through the same Set. We always write to the overlay
     so the seed `pinned` flag never matters again after the first toggle —
     this avoids a stale-flag class of bugs. */
  const togglePinMessage = (channelId: string, msgId: number) => {
    const key = `${channelId}|${msgId}`;
    setPinnedMessageKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const isMessagePinned = (channelId: string, msgId: number) =>
    pinnedMessageKeys.has(`${channelId}|${msgId}`);

  const openThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setShowAIDrawer(false);
    setMembersOpen(false);
    markThreadRead(threadId);
  };

  const toggleAIDrawer = () => {
    if (showAIDrawer) { setShowAIDrawer(false); return; }
    setActiveThreadId(null);
    setMembersOpen(false);
    setShowAIDrawer(true);
    setAiData(null);
    setAiLoading(true);
    setAiTypingIdx(0);
    setTimeout(() => {
      setAiData(aiSummaryMap[selectedChannel] || {
        overview: 'Not enough conversation history in this channel to generate a useful summary yet. Send a few more messages and try again.',
        keyDecisions: [], actionItems: [],
        messageRange: '0 messages', generatedAt: 'Just now',
      });
      setAiLoading(false);
    }, 1400);
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */

  return (
    <div className="flex h-[calc(100vh-53px)] bg-white" role="main" aria-label="Inbox">
      {/* ══════════ Sidebar ══════════
          Layout: pinned top region (header / search / quick views), then a SINGLE
          scroll container for all three lists. This is what fixes the broken scroll —
          previously only the last section had overflow, so it got squeezed to nothing
          when the lists above were tall. */}
      <aside className="w-[260px] border-r border-black/[0.06] flex flex-col bg-[#FAFAFB] select-none flex-shrink-0 min-h-0" aria-label="Inbox navigation">
        {/* Workspace header */}
        <div className="h-[52px] px-3.5 flex items-center justify-between border-b border-black/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-[#204CC7] flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <InboxIcon className="w-3 h-3 text-white" />
            </div>
            <h1 className="text-[14px] font-bold text-black truncate">Messages</h1>
          </div>
          {CURRENT_USER_IS_ADMIN && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-black/55 hover:bg-[#204CC7]/[0.08] hover:text-[#204CC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors"
              aria-label="Create channel"
              title="Create channel"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="px-2.5 pt-2.5 flex-shrink-0">
          <label htmlFor="inbox-search" className="sr-only">Search channels & people</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" aria-hidden="true" />
            <input
              id="inbox-search"
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 h-8 bg-white rounded-md text-caption text-black/85 placeholder:text-black/40 border border-black/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:border-[#204CC7]/30 transition-all"
            />
          </div>
        </div>

        {/* Quick views */}
        <nav className="px-1.5 pt-2 flex-shrink-0" aria-label="Quick views">
          <SidebarQuickItem
            icon={<MessageSquareText className="w-4 h-4" aria-hidden="true" />}
            label="Threads"
            count={unreadThreadCount}
            active={view === 'threads'}
            onClick={() => { setView('threads'); setActiveThreadId(null); setShowAIDrawer(false); }}
          />
          <SidebarQuickItem
            icon={<AtSign className="w-4 h-4" aria-hidden="true" />}
            label="Mentions"
            count={unreadMentionCount}
            countTone="primary"
            active={view === 'mentions'}
            onClick={() => { setView('mentions'); setActiveThreadId(null); setShowAIDrawer(false); }}
          />
          <SidebarQuickItem
            icon={<Star className="w-4 h-4" aria-hidden="true" />}
            label="Saved"
            active={view === 'starred'}
            onClick={() => { setView('starred'); setActiveThreadId(null); setShowAIDrawer(false); }}
          />
          <SidebarQuickItem
            icon={<Paperclip className="w-4 h-4" aria-hidden="true" />}
            label="Files"
            active={view === 'files'}
            onClick={() => { setView('files'); setActiveThreadId(null); setShowAIDrawer(false); }}
          />
        </nav>

        {/* ───── ONE scroll container for all three lists.
                Order by importance: Clients → Internal → DMs. ───── */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-4 mt-1">
          {/* Client Channels — most important */}
          <SidebarSectionHeader
            label="Clients"
            collapsed={collapsedClients}
            onToggle={() => setCollapsedClients(v => !v)}
            unreadCount={clientList.reduce((s, c) => s + c.unread, 0)}
            actionLabel="Browse all clients"
            actionIcon="search"
            onAction={() => setBrowseOpen(true)}
          />
          {!collapsedClients && (
            <div className="px-1.5" role="list" aria-label="Client channels">
              {visibleSidebarClients.map(cc => (
                <SidebarClientRow
                  key={cc.id}
                  channel={cc}
                  active={view === 'channel' && selectedChannel === cc.id}
                  pinned={pinnedIds.has(cc.id)}
                  onClick={() => openChannel(cc.id)}
                  onTogglePin={() => togglePin(cc.id)}
                />
              ))}
              {visibleSidebarClients.length === 0 && search.trim() && (
                <p className="px-3 py-2 text-[12px] text-black/35">No matches</p>
              )}
              {!search.trim() && hiddenClientCount > 0 && (
                <button
                  type="button"
                  onClick={() => setBrowseOpen(true)}
                  className="w-full h-7 px-2 flex items-center gap-2 rounded-md text-left text-[12px] text-black/50 hover:bg-black/[0.04] hover:text-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors"
                >
                  <Plus className="w-3 h-3 flex-shrink-0 text-black/40" aria-hidden="true" />
                  <span className="truncate">Browse all clients</span>
                  <span className="ml-auto text-[11px] tabular-nums text-black/40">{clientList.length}</span>
                </button>
              )}
            </div>
          )}

          {/* Internal Channels */}
          <SidebarSectionHeader
            label="Internal"
            collapsed={collapsedChannels}
            onToggle={() => setCollapsedChannels(v => !v)}
            unreadCount={channelList.reduce((s, c) => s + c.unread, 0)}
          />
          {!collapsedChannels && (
            <div className="px-1.5" role="list" aria-label="Internal channels">
              {orderedChannels.map(ch => (
                <SidebarChannelRow
                  key={ch.id}
                  channel={ch}
                  active={view === 'channel' && selectedChannel === ch.id}
                  pinned={pinnedIds.has(ch.id)}
                  onClick={() => openChannel(ch.id)}
                  onTogglePin={() => togglePin(ch.id)}
                />
              ))}
              {orderedChannels.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-black/35">No matches</p>
              )}
            </div>
          )}

          {/* Direct Messages */}
          <SidebarSectionHeader
            label="Direct messages"
            collapsed={collapsedDMs}
            onToggle={() => setCollapsedDMs(v => !v)}
            unreadCount={dmList.reduce((s, c) => s + c.unread, 0)}
          />
          {!collapsedDMs && (
            <div className="px-1.5" role="list" aria-label="Direct messages">
              {orderedDMs.map(dm => (
                <SidebarChannelRow
                  key={dm.id}
                  channel={dm}
                  active={view === 'channel' && selectedChannel === dm.id}
                  pinned={pinnedIds.has(dm.id)}
                  onClick={() => openChannel(dm.id)}
                  onTogglePin={() => togglePin(dm.id)}
                />
              ))}
              {orderedDMs.length === 0 && (
                <p className="px-3 py-2 text-[12px] text-black/35">No matches</p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ══════════ Main area ══════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {view === 'channel' && currentChannel && (
          <ChannelView
            channel={currentChannel}
            messages={currentMessages}
            composer={composer}
            onComposerChange={setComposer}
            composerRef={composerRef}
            onComposerKey={handleComposerKey}
            onSend={handleSend}
            messagesEndRef={messagesEndRef}
            onOpenThread={openThread}
            onToggleAI={toggleAIDrawer}
            aiOpen={showAIDrawer}
            aiLoading={aiLoading}
            getReactions={getReactions}
            onToggleReaction={toggleReaction}
            roster={currentRoster}
            membersOpen={membersOpen}
            onOpenMembers={openMembers}
            canManage={CURRENT_USER_IS_ADMIN}
            menuOpen={headerMenuOpen}
            onMenuOpenChange={setHeaderMenuOpen}
            onRequestDelete={() => setDeleteTarget(currentChannel)}
            isMessagePinned={(id) => isMessagePinned(currentChannel.id, id)}
            onTogglePinMessage={(id) => togglePinMessage(currentChannel.id, id)}
            pinnedListOpen={pinnedListOpen === currentChannel.id}
            onPinnedListOpenChange={(open) => setPinnedListOpen(open ? currentChannel.id : null)}
            isMessageSaved={(id) => isMessageSaved(currentChannel.id, id)}
            onToggleSaveMessage={(id) => toggleSaveMessage(currentChannel.id, id)}
            attachments={composerAttachments}
            onAddAttachments={addAttachments}
            onRemoveAttachment={removeAttachment}
            mentionPickerOpen={mentionPickerOpen}
            onMentionPickerOpenChange={setMentionPickerOpen}
            emojiPickerOpen={emojiPickerOpen}
            onEmojiPickerOpenChange={setEmojiPickerOpen}
            onInsertText={insertAtCaret}
            fileInputRef={fileInputRef}
          />
        )}

        {view === 'threads' && (
          <ThreadsView
            threads={threadsWithRead}
            channels={channels}
            onOpenThread={openThread}
            onOpenChannel={openChannel}
            activeThreadId={activeThreadId}
          />
        )}

        {view === 'mentions' && (
          <MentionsView
            mentions={filteredMentions}
            channels={channels}
            filter={mentionsFilter}
            onFilterChange={setMentionsFilter}
            unreadCount={unreadMentionCount}
            totalCount={mentionsData.length}
            onOpenChannel={(channelId, mentionId) => {
              if (mentionId) markMentionRead(mentionId);
              openChannel(channelId);
            }}
          />
        )}

        {view === 'starred' && (
          <StarredView
            saved={savedItems}
            channels={channels}
            onOpenChannel={openChannel}
            onUnsave={(channelId, msgId) => toggleSaveMessage(channelId, msgId)}
          />
        )}

        {view === 'files' && (
          <FilesView
            files={filteredFiles}
            channels={channels}
            filter={filesFilter}
            onFilterChange={setFilesFilter}
            counts={{
              all: filesData.length,
              doc: filesData.filter(f => f.type === 'doc').length,
              image: filesData.filter(f => f.type === 'image').length,
              link: filesData.filter(f => f.type === 'link').length,
            }}
            onOpenChannel={openChannel}
            onOpenFile={(file) => setActionToast(`Opening ${file.name}…`)}
          />
        )}
      </div>

      {/* ══════════ Right drawer (Thread reply OR AI summary) ══════════ */}
      {activeThread && (
        <ThreadDrawer
          thread={activeThread}
          channel={channels.find(c => c.id === activeThread.channelId)}
          composer={threadComposer}
          onComposerChange={setThreadComposer}
          crosspost={threadCrosspost}
          onCrosspostChange={setThreadCrosspost}
          onSend={handleSendThreadReply}
          onClose={() => setActiveThreadId(null)}
          onOpenChannel={openChannel}
          getReactions={getReactions}
          onToggleReaction={toggleReaction}
          extraReplies={threadReplies[activeThreadId!] || []}
        />
      )}

      {showAIDrawer && view === 'channel' && (
        <AISummaryDrawer
          loading={aiLoading}
          data={aiData}
          revealIdx={aiTypingIdx}
          onClose={() => setShowAIDrawer(false)}
          onRegenerate={toggleAIDrawer}
        />
      )}

      {membersOpen && view === 'channel' && currentChannel && currentChannel.kind !== 'dm' && currentRoster.length > 0 && (
        <MembersDrawer
          channel={currentChannel}
          roster={currentRoster}
          currentUserId={CURRENT_USER_ID}
          canManage={CURRENT_USER_IS_ADMIN}
          onClose={closeMembers}
          onRemove={(member, reason) => removeMember(currentChannel.id, member, reason)}
        />
      )}

      {/* Removal toast lives at the root so it overlays everything and survives
          channel switches until it auto-dismisses or the user undoes. */}
      {removalToast && (
        <RemovalToast
          member={removalToast.member}
          channelLabel={
            channels.find(c => c.id === removalToast.channelId)?.companyName
            ?? channels.find(c => c.id === removalToast.channelId)?.name
            ?? 'this channel'
          }
          onUndo={() => undoRemoveMember(removalToast.channelId, removalToast.member.id)}
          onDismiss={() => setRemovalToast(null)}
        />
      )}

      {/* Lightweight neutral confirmation toast — used by Save / Open file. */}
      {actionToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-black/85 text-white text-[13px] font-medium shadow-[0_12px_32px_-4px_rgba(0,0,0,0.32)]"
          style={{ animation: 'inboxToastIn 200ms ease-out' }}
        >
          {actionToast}
        </div>
      )}

      {browseOpen && (
        <BrowseClientsModal
          clients={clientList}
          pinnedIds={pinnedIds}
          search={browseSearch}
          onSearchChange={setBrowseSearch}
          serviceFilter={browseService}
          onServiceFilterChange={setBrowseService}
          onTogglePin={togglePin}
          onOpen={(id) => { openChannel(id); setBrowseOpen(false); setBrowseSearch(''); }}
          onClose={() => { setBrowseOpen(false); setBrowseSearch(''); }}
        />
      )}

      {createOpen && (
        <CreateChannelModal
          existingIds={channels.map(c => c.id)}
          onCreate={createChannel}
          onClose={() => setCreateOpen(false)}
        />
      )}

      {deleteTarget && (
        <DeleteChannelConfirm
          channel={deleteTarget}
          onConfirm={() => deleteChannel(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <style>{`
        @keyframes inboxSlideIn {
          from { transform: translateX(16px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes inboxFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes inboxToastIn {
          from { transform: translate(-50%, 16px); opacity: 0; }
          to   { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes inboxMsgFlash {
          0%   { background-color: rgba(253, 171, 61, 0.18); }
          60%  { background-color: rgba(253, 171, 61, 0.18); }
          100% { background-color: rgba(253, 171, 61, 0); }
        }
        .msg-flash { animation: inboxMsgFlash 1500ms ease-out; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

function SidebarQuickItem({
  icon, label, count, countTone = 'neutral', active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  countTone?: 'neutral' | 'primary';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-7 px-2 flex items-center gap-2 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
        active ? 'bg-[#204CC7]/[0.08] text-[#204CC7]' : 'text-black/65 hover:bg-black/[0.04]'
      }`}
      aria-pressed={active}
    >
      <span className={`flex-shrink-0 ${active ? 'text-[#204CC7]' : 'text-black/45'}`}>{icon}</span>
      <span className={`flex-1 text-caption truncate ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums ${
          countTone === 'primary'
            ? 'bg-[#204CC7] text-white'
            : active ? 'bg-[#204CC7]/15 text-[#204CC7]' : 'bg-black/[0.06] text-black/55'
        }`}>{count}</span>
      )}
    </button>
  );
}

function SidebarSectionHeader({
  label, collapsed, onToggle, unreadCount, actionLabel, actionIcon = 'plus', onAction,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  unreadCount?: number;
  actionLabel?: string;
  actionIcon?: 'plus' | 'search';
  onAction?: () => void;
}) {
  return (
    <div className="px-1.5 pt-3 pb-0.5 flex items-center group">
      <button
        type="button"
        onClick={onToggle}
        className="flex-1 px-1.5 py-0.5 flex items-center gap-1 rounded text-left hover:bg-black/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
        aria-expanded={!collapsed}
      >
        <ChevronRight className={`w-3 h-3 text-black/35 transition-transform ${!collapsed ? 'rotate-90' : ''}`} aria-hidden="true" />
        <span className="text-[11px] font-semibold text-black/45 tracking-wide flex-1">{label}</span>
        {collapsed && unreadCount !== undefined && unreadCount > 0 && (
          <span className="text-[11px] font-bold text-[#204CC7] tabular-nums">{unreadCount}</span>
        )}
      </button>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          title={actionLabel}
          className="w-5 h-5 flex items-center justify-center rounded text-black/40 opacity-0 group-hover:opacity-100 hover:bg-black/[0.06] hover:text-black/70 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-all"
        >
          {actionIcon === 'search'
            ? <Search className="w-3 h-3" />
            : <Plus className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

function SidebarChannelRow({
  channel, active, pinned, onClick, onTogglePin,
}: {
  channel: Channel;
  active: boolean;
  pinned: boolean;
  onClick: () => void;
  onTogglePin: () => void;
}) {
  const isDM = channel.kind === 'dm';
  const pinLabel = isDM ? channel.name : `#${channel.name}`;
  return (
    <div className="relative group/row">
      <button
        type="button"
        onClick={onClick}
        role="listitem"
        className={`w-full h-7 pl-2 pr-2 flex items-center gap-2 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
          active ? 'bg-[#204CC7]/[0.09] text-[#204CC7]' : 'text-black/65 hover:bg-black/[0.04]'
        }`}
        aria-current={active ? 'true' : undefined}
      >
        {isDM ? (
          <div className="relative w-4 h-4 flex-shrink-0">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${getAvatarColor(channel.avatar || '')}`}>
              {channel.avatar}
            </div>
            {channel.online && (
              <span className="absolute -bottom-0 -right-0 w-[7px] h-[7px] bg-[#00C875] rounded-full border-[1.5px] border-[#FAFAFB]" aria-label="Online" />
            )}
          </div>
        ) : channel.isPrivate ? (
          <Lock className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-[#204CC7]' : 'text-black/40'}`} aria-hidden="true" />
        ) : (
          <Hash className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-[#204CC7]' : 'text-black/40'}`} aria-hidden="true" />
        )}
        <span className={`flex-1 text-caption truncate ${
          active ? 'font-semibold' : channel.unread > 0 ? 'font-semibold text-black/85' : 'font-normal'
        }`}>
          {channel.name}
        </span>
        {channel.hasMention && (
          <span className="w-[6px] h-[6px] rounded-full bg-[#E2445C] flex-shrink-0 group-hover/row:hidden" aria-label="Has mention" />
        )}
        {channel.unread > 0 && (
          <span className="min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums bg-[#204CC7] text-white group-hover/row:hidden" aria-hidden="true">
            {channel.unread}
          </span>
        )}
      </button>
      {/* Pin slides in on hover. Hides when not hovered to keep the row clean. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        aria-label={pinned ? `Unpin ${pinLabel}` : `Pin ${pinLabel}`}
        title={pinned ? 'Unpin' : 'Pin to top'}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 items-center justify-center rounded hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors hidden group-hover/row:flex focus-visible:flex ${
          pinned ? 'text-[#204CC7]' : 'text-black/40 hover:text-black/70'
        }`}
      >
        <Pin className={`w-3 h-3 ${pinned ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ─── Client channel row — service-coloured square + display name.
   Pin slides in on hover only. Kept visually equal-weight to team rows
   so the sidebar scans cleanly. */
function SidebarClientRow({
  channel, active, pinned, onClick, onTogglePin,
}: {
  channel: Channel;
  active: boolean;
  pinned: boolean;
  onClick: () => void;
  onTogglePin: () => void;
}) {
  // Fallback to PM (SEM) if a client channel is somehow missing its service —
  // shouldn't happen with seed data but keeps the row from blowing up.
  const svc = channel.service ? serviceMeta[channel.service] : serviceMeta.PM;
  return (
    <div className="relative group/row">
      <button
        type="button"
        onClick={onClick}
        role="listitem"
        className={`w-full h-7 pl-2 pr-2 flex items-center gap-2 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
          active ? 'bg-[#204CC7]/[0.09] text-[#204CC7]' : 'text-black/65 hover:bg-black/[0.04]'
        }`}
        aria-current={active ? 'true' : undefined}
        title={channel.description || channel.companyName}
      >
        <span className={`w-3 h-3 rounded-[3px] ${svc.dot} flex-shrink-0`} aria-hidden="true" />
        <span className={`flex-1 text-caption truncate ${
          active ? 'font-semibold' : channel.unread > 0 ? 'font-semibold text-black/85' : 'font-normal'
        }`}>
          {channel.companyName || channel.name}
        </span>
        {channel.hasMention && (
          <span className="w-[6px] h-[6px] rounded-full bg-[#E2445C] flex-shrink-0 group-hover/row:hidden" aria-label="Has mention" />
        )}
        {channel.unread > 0 && (
          <span className="min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums bg-[#204CC7] text-white group-hover/row:hidden" aria-hidden="true">
            {channel.unread}
          </span>
        )}
      </button>
      {/* Pin slides in on hover. Hides when not hovered to keep the row clean. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        aria-label={pinned ? `Unpin ${channel.companyName}` : `Pin ${channel.companyName}`}
        title={pinned ? 'Unpin' : 'Pin to sidebar'}
        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 items-center justify-center rounded hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors hidden group-hover/row:flex focus-visible:flex ${
          pinned ? 'text-[#204CC7]' : 'text-black/40 hover:text-black/70'
        }`}
      >
        <Pin className={`w-3 h-3 ${pinned ? 'fill-current' : ''}`} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CHANNEL VIEW
   ═══════════════════════════════════════════════════════════════════ */

function ChannelView({
  channel, messages, composer, onComposerChange, composerRef, onComposerKey, onSend, messagesEndRef,
  onOpenThread, onToggleAI, aiOpen, aiLoading, getReactions, onToggleReaction,
  roster, membersOpen, onOpenMembers,
  canManage, menuOpen, onMenuOpenChange, onRequestDelete,
  isMessagePinned, onTogglePinMessage, pinnedListOpen, onPinnedListOpenChange,
  isMessageSaved, onToggleSaveMessage,
  attachments, onAddAttachments, onRemoveAttachment,
  mentionPickerOpen, onMentionPickerOpenChange,
  emojiPickerOpen, onEmojiPickerOpenChange,
  onInsertText, fileInputRef,
}: {
  channel: Channel;
  messages: Message[];
  composer: string;
  onComposerChange: (v: string) => void;
  composerRef: React.RefObject<HTMLTextAreaElement>;
  onComposerKey: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onOpenThread: (id: string) => void;
  onToggleAI: () => void;
  aiOpen: boolean;
  aiLoading: boolean;
  getReactions: (msg: Message | ThreadReply) => Reaction[];
  onToggleReaction: (msg: Message | ThreadReply, emoji: string) => void;
  roster: ChannelMember[];
  membersOpen: boolean;
  onOpenMembers: () => void;
  canManage: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onRequestDelete: () => void;
  isMessagePinned: (msgId: number) => boolean;
  onTogglePinMessage: (msgId: number) => void;
  pinnedListOpen: boolean;
  onPinnedListOpenChange: (open: boolean) => void;
  isMessageSaved: (msgId: number) => boolean;
  onToggleSaveMessage: (msgId: number) => void;
  attachments: ComposerAttachment[];
  onAddAttachments: (files: FileList | File[] | null) => void;
  onRemoveAttachment: (id: string) => void;
  mentionPickerOpen: boolean;
  onMentionPickerOpenChange: (open: boolean) => void;
  emojiPickerOpen: boolean;
  onEmojiPickerOpenChange: (open: boolean) => void;
  onInsertText: (text: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the channel options menu on outside click + Escape. We attach listeners
  // only while the menu is open to keep the cost trivial.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuOpenChange(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onMenuOpenChange(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, onMenuOpenChange]);

  // Reset the menu whenever the user switches channels — leaving a stray popover
  // open while the underlying channel changed would be confusing.
  useEffect(() => {
    onMenuOpenChange(false);
  }, [channel.id, onMenuOpenChange]);
  const accent = getChannelAccent(channel.id);
  const isDM = channel.kind === 'dm';
  const isClient = channel.kind === 'client';
  const svc = isClient && channel.service ? serviceMeta[channel.service] : null;
  const placeholder = isDM ? `Message ${channel.name}` : `Message #${channel.name}`;
  // All currently-pinned messages in display order (oldest → newest matches
  // the chat scroll). The first one is shown as a preview in the banner;
  // clicking the banner reveals the full list.
  const pinnedMessages = useMemo(
    () => messages.filter(m => isMessagePinned(m.id)),
    [messages, isMessagePinned]
  );
  const pinnedBannerRef = useRef<HTMLDivElement>(null);

  // Close the pinned-messages popover on outside click + Escape so it behaves
  // like other popovers in this module (header menu, emoji picker, etc.).
  useEffect(() => {
    if (!pinnedListOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pinnedBannerRef.current && !pinnedBannerRef.current.contains(e.target as Node)) {
        onPinnedListOpenChange(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onPinnedListOpenChange(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pinnedListOpen, onPinnedListOpenChange]);

  // Scroll a specific message into view when the user clicks a row in the
  // pinned-list popover. We rely on a stable id-based DOM selector so the
  // popover doesn't need a ref to every message.
  const scrollToMessage = (msgId: number) => {
    const el = document.getElementById(`msg-${channel.id}-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('msg-flash');
      setTimeout(() => el.classList.remove('msg-flash'), 1600);
    }
    onPinnedListOpenChange(false);
  };

  return (
    <>
      {/* ── Channel header ── */}
      <header className="h-[60px] px-5 border-b border-black/[0.06] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isClient && svc ? svc.chipBg : accent.bg
          }`}>
            {isDM ? (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white ${getAvatarColor(channel.avatar || '')}`}>
                {channel.avatar}
              </div>
            ) : isClient && svc ? (
              <span className={`w-4 h-4 rounded-[5px] ${svc.dot}`} aria-hidden="true" />
            ) : channel.isPrivate ? (
              <Lock className={`w-4 h-4 ${accent.text}`} aria-hidden="true" />
            ) : (
              <Hash className={`w-4 h-4 ${accent.text}`} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-h3 font-bold text-black truncate flex items-center gap-1.5">
              {isClient ? (
                <>
                  <span>{channel.companyName || channel.name}</span>
                  {svc && (
                    <span className={`text-[10px] font-bold px-1.5 py-[2px] rounded ${svc.chipBg} ${svc.chipText} uppercase tracking-wide`}>
                      {svc.label}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {!isDM && <span className="text-black/40 font-normal">#</span>}
                  {channel.name}
                  {isDM && channel.online && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C875]" aria-label="Online" />
                  )}
                </>
              )}
            </h2>
            <p className="text-[12px] text-black/55 truncate">
              {isDM
                ? `${channel.role || 'Team member'}${channel.online ? ' · Active' : ' · Away'}`
                : isClient
                  ? `Client account · ${roster.length || channel.members || 0} ${(roster.length || channel.members || 0) === 1 ? 'member' : 'members'}${channel.lastActive ? ` · Active ${channel.lastActive}` : ''}`
                  : channel.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isDM && roster.length > 0 && (
            <button
              type="button"
              onClick={onOpenMembers}
              aria-pressed={membersOpen}
              aria-label={`${roster.length} members — manage`}
              title="Manage members"
              className={`hidden md:flex items-center gap-2 h-8 pl-1 pr-2 mr-1 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                membersOpen
                  ? 'bg-[#204CC7]/[0.08] border-[#204CC7]/25 text-[#204CC7]'
                  : 'bg-transparent border-transparent hover:bg-black/[0.04] text-black/65'
              }`}
            >
              <div className="flex -space-x-1.5" aria-hidden="true">
                {roster.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className={`w-6 h-6 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white ${getAvatarColor(m.initials)}`}
                  >
                    {m.initials}
                  </div>
                ))}
              </div>
              <span className="text-[12px] font-semibold tabular-nums">{roster.length}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleAI}
            disabled={aiLoading}
            className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-caption font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/40 ${
              aiOpen
                ? 'bg-[#7C3AED]/12 text-[#7C3AED] border border-[#7C3AED]/25'
                : 'text-black/65 hover:bg-black/[0.05] border border-transparent'
            }`}
            aria-pressed={aiOpen}
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>Summarize</span>
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => onMenuOpenChange(!menuOpen)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Channel options"
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                menuOpen ? 'bg-black/[0.06] text-black/85' : 'text-black/55 hover:bg-black/[0.05]'
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="Channel options"
                className="absolute right-0 top-full mt-1.5 z-30 w-[220px] bg-white rounded-lg border border-black/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.16)] py-1"
                style={{ animation: 'inboxFadeIn 120ms ease-out' }}
              >
                {canManage && !isDM ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { onMenuOpenChange(false); onRequestDelete(); }}
                    className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-[13px] font-medium text-[#E2445C] hover:bg-[#E2445C]/[0.06] focus-visible:outline-none focus-visible:bg-[#E2445C]/[0.08]"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Delete channel</span>
                  </button>
                ) : (
                  <div className="px-3 py-2 text-[12px] text-black/45">No actions available</div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Pinned messages banner ── */}
      {/* Slack-style amber strip that summarises the first pinned message and
          opens an anchored popover listing every pinned message in this
          channel. The whole strip is one big button so the click target is
          generous and obvious. The popover handles its own outside-click +
          Escape via `pinnedListOpen`. */}
      {pinnedMessages.length > 0 && (
        <div ref={pinnedBannerRef} className="relative flex-shrink-0 border-b border-black/[0.05]">
          <button
            type="button"
            onClick={() => onPinnedListOpenChange(!pinnedListOpen)}
            aria-haspopup="dialog"
            aria-expanded={pinnedListOpen}
            aria-label={`${pinnedMessages.length} pinned ${pinnedMessages.length === 1 ? 'message' : 'messages'} — view`}
            className={`w-full px-5 py-2 flex items-center gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-inset ${
              pinnedListOpen ? 'bg-amber-50/70' : 'bg-amber-50/40 hover:bg-amber-50/60'
            }`}
          >
            <Pin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
            <span className="text-[12px] text-black/65 truncate min-w-0 flex-1">
              <span className="font-semibold text-black/80">{pinnedMessages[0].sender}: </span>
              {pinnedMessages[0].content}
            </span>
            {pinnedMessages.length > 1 && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded flex-shrink-0">
                +{pinnedMessages.length - 1} more
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-amber-700/70 flex-shrink-0 transition-transform ${pinnedListOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {pinnedListOpen && (
            <div
              role="dialog"
              aria-label="Pinned messages"
              className="absolute left-3 right-3 top-full mt-1 z-30 bg-white rounded-lg border border-black/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.16)] overflow-hidden"
              style={{ animation: 'inboxFadeIn 140ms ease-out' }}
            >
              <div className="px-4 py-2.5 border-b border-black/[0.06] flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-black/85">
                  Pinned in {channel.kind === 'dm' ? channel.name : `#${channel.name}`}
                </span>
                <span className="text-[12px] text-black/45 tabular-nums">{pinnedMessages.length}</span>
                <button
                  type="button"
                  onClick={() => onPinnedListOpenChange(false)}
                  aria-label="Close pinned list"
                  className="ml-auto w-6 h-6 inline-flex items-center justify-center rounded text-black/45 hover:bg-black/[0.05] hover:text-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto py-1">
                {pinnedMessages.map((m) => (
                  <div
                    key={m.id}
                    className="group/pin px-3 py-2 flex items-start gap-2.5 hover:bg-black/[0.025] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => scrollToMessage(m.id)}
                      className="flex-1 min-w-0 flex items-start gap-2.5 text-left focus-visible:outline-none rounded"
                      aria-label={`Jump to message from ${m.sender}`}
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${getAvatarColor(m.avatar)}`} aria-hidden="true">
                        {m.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[12px] font-semibold text-black/85 truncate">{m.sender}</span>
                          <span className="text-[11px] text-black/40 tabular-nums flex-shrink-0">{m.timestamp}</span>
                        </div>
                        <p className="text-[12.5px] text-black/70 leading-[1.45] line-clamp-2 mt-0.5">{m.content}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePinMessage(m.id)}
                      aria-label={`Unpin message from ${m.sender}`}
                      title="Unpin"
                      className="opacity-0 group-hover/pin:opacity-100 focus:opacity-100 w-7 h-7 inline-flex items-center justify-center rounded text-black/50 hover:bg-amber-50 hover:text-amber-700 transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                    >
                      <Pin className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto" role="log" aria-label={`Messages in ${channel.name}`} aria-live="polite">
        <div className="px-5 py-6">
          {messages.length === 0 ? (
            <EmptyChannelState channel={channel} />
          ) : (
            messages.map((msg, idx) => {
              const showDate = msg.date && (idx === 0 || messages[idx - 1]?.date !== msg.date);
              const prev = messages[idx - 1];
              const grouped = !showDate && prev && prev.sender === msg.sender && !msg.date;
              return (
                <div key={msg.id}>
                  {showDate && <DateSeparator date={msg.date!} />}
                  <MessageBubble
                    msg={msg}
                    grouped={!!grouped}
                    onOpenThread={onOpenThread}
                    reactions={getReactions(msg)}
                    onToggleReaction={(emoji) => onToggleReaction(msg, emoji)}
                    pinned={isMessagePinned(msg.id)}
                    onTogglePin={() => onTogglePinMessage(msg.id)}
                    saved={isMessageSaved(msg.id)}
                    onToggleSave={() => onToggleSaveMessage(msg.id)}
                    domId={`msg-${channel.id}-${msg.id}`}
                  />
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Composer ──
          Self-contained block: drag-drop wrapper, attachment chip rail,
          textarea, and a footer with Attach / @ / Emoji / Send. The three
          left-side icon buttons are now functional: Attach opens a hidden
          file input, @ opens the mention popover, Emoji opens the insert
          picker. Send is enabled when there's text OR at least one
          attachment. */}
      <ComposerSurface
        channel={channel}
        composer={composer}
        onComposerChange={onComposerChange}
        composerRef={composerRef}
        onComposerKey={onComposerKey}
        onSend={onSend}
        attachments={attachments}
        onAddAttachments={onAddAttachments}
        onRemoveAttachment={onRemoveAttachment}
        mentionPickerOpen={mentionPickerOpen}
        onMentionPickerOpenChange={onMentionPickerOpenChange}
        emojiPickerOpen={emojiPickerOpen}
        onEmojiPickerOpenChange={onEmojiPickerOpenChange}
        onInsertText={onInsertText}
        roster={roster}
        fileInputRef={fileInputRef}
        placeholder={placeholder}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPOSER SURFACE — full-feature message composer (attach, @, emoji, send)
   ═══════════════════════════════════════════════════════════════════ */

function ComposerSurface({
  channel, composer, onComposerChange, composerRef, onComposerKey, onSend,
  attachments, onAddAttachments, onRemoveAttachment,
  mentionPickerOpen, onMentionPickerOpenChange,
  emojiPickerOpen, onEmojiPickerOpenChange,
  onInsertText, roster, fileInputRef, placeholder,
}: {
  channel: Channel;
  composer: string;
  onComposerChange: (v: string) => void;
  composerRef: React.RefObject<HTMLTextAreaElement>;
  onComposerKey: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  attachments: ComposerAttachment[];
  onAddAttachments: (files: FileList | File[] | null) => void;
  onRemoveAttachment: (id: string) => void;
  mentionPickerOpen: boolean;
  onMentionPickerOpenChange: (open: boolean) => void;
  emojiPickerOpen: boolean;
  onEmojiPickerOpenChange: (open: boolean) => void;
  onInsertText: (text: string) => void;
  roster: ChannelMember[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  placeholder: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  // Block Send while any chip is mid-upload — sending now would ship a chip
  // without bytes behind it. The button still styles as disabled rather than
  // hidden so the user sees Send waiting on the upload, not vanishing.
  const allReady = attachments.every(a => (a.status ?? 'ready') === 'ready');
  const hasContent = composer.trim().length > 0 || attachments.length > 0;
  const canSend = hasContent && allReady;
  const uploadingCount = attachments.filter(a => a.status === 'uploading').length;

  // Auto-grow the textarea up to ~6 rows so writing a longer message doesn't
  // hide the start of the line. We reset to 1 row first so the scrollHeight
  // measurement is accurate when text is removed.
  useEffect(() => {
    const ta = composerRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const next = Math.min(ta.scrollHeight, 144);
    ta.style.height = `${next}px`;
  }, [composer, composerRef]);

  // For DM channels we restrict the @ list to just the other party — there
  // are no other participants. For real channels and client channels we
  // surface the full roster.
  const mentionableRoster = useMemo(() => {
    if (channel.kind === 'dm') {
      // Synthesize a one-person roster from the DM partner so the picker UX
      // still works (degenerate case but correct).
      return [{
        id: channel.id,
        name: channel.name,
        initials: channel.avatar || channel.name.slice(0, 2).toUpperCase(),
        role: channel.role || 'Team member',
        online: channel.online,
      } as ChannelMember];
    }
    return roster.filter(m => m.id !== CURRENT_USER_ID);
  }, [channel, roster]);

  return (
    <div className="px-5 pb-4 pt-1 flex-shrink-0">
      {/* Hidden native input — clicking the Attach button programmatically
          activates this so the user gets the platform file picker. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          onAddAttachments(e.target.files);
          // Reset so the same file can be re-selected after removal.
          if (e.target) e.target.value = '';
        }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
        onDragLeave={(e) => {
          // Only clear when actually leaving the wrapper, not bubbling from a child.
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) onAddAttachments(e.dataTransfer.files);
        }}
        className={`relative border rounded-xl bg-white transition-all ${
          dragOver
            ? 'border-[#204CC7]/60 shadow-[0_0_0_3px_rgba(32,76,199,0.12)] bg-[#204CC7]/[0.02]'
            : 'border-black/[0.12] focus-within:border-[#204CC7]/40 focus-within:shadow-[0_0_0_3px_rgba(32,76,199,0.08)]'
        }`}
      >
        {dragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-xl bg-white/85">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#204CC7]">
              <Paperclip className="w-4 h-4" />
              Drop to attach
            </div>
          </div>
        )}

        {/* Attachment chip rail — only renders when there's something to show. */}
        {attachments.length > 0 && (
          <div className="px-3 pt-3 flex flex-wrap gap-2">
            {attachments.map(a => (
              <AttachmentChip key={a.id} att={a} onRemove={() => onRemoveAttachment(a.id)} />
            ))}
          </div>
        )}

        <textarea
          ref={composerRef}
          value={composer}
          onChange={e => onComposerChange(e.target.value)}
          onKeyDown={onComposerKey}
          placeholder={placeholder}
          className="w-full px-4 pt-3 pb-2 text-[14px] leading-[1.55] text-black/90 placeholder:text-black/40 focus:outline-none resize-none bg-transparent overflow-y-auto"
          rows={1}
          style={{ maxHeight: 144 }}
          aria-label={placeholder}
        />
        <div className="px-2 py-1.5 flex items-center justify-between border-t border-black/[0.04]">
          <div className="flex items-center gap-0.5">
            <ComposerIconButton
              label="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </ComposerIconButton>

            {/* Mention */}
            <span className="relative inline-flex">
              <ComposerIconButton
                label="Mention someone"
                active={mentionPickerOpen}
                onClick={() => {
                  onEmojiPickerOpenChange(false);
                  onMentionPickerOpenChange(!mentionPickerOpen);
                }}
              >
                <AtSign className="w-4 h-4" />
              </ComposerIconButton>
              {mentionPickerOpen && (
                <MentionInsertPicker
                  members={mentionableRoster}
                  onPick={(member) => {
                    // Pad with a leading space if the user is already typing
                    // mid-word — keeps the chip parsing clean.
                    const ta = composerRef.current;
                    const start = ta?.selectionStart ?? composer.length;
                    const charBefore = composer[start - 1];
                    const needsSpace = start > 0 && charBefore && charBefore !== ' ' && charBefore !== '\n';
                    onInsertText(`${needsSpace ? ' ' : ''}@${member.name.split(' ')[0].toLowerCase()} `);
                    onMentionPickerOpenChange(false);
                  }}
                  onClose={() => onMentionPickerOpenChange(false)}
                />
              )}
            </span>

            {/* Emoji */}
            <span className="relative inline-flex">
              <ComposerIconButton
                label="Insert emoji"
                active={emojiPickerOpen}
                onClick={() => {
                  onMentionPickerOpenChange(false);
                  onEmojiPickerOpenChange(!emojiPickerOpen);
                }}
              >
                <Smile className="w-4 h-4" />
              </ComposerIconButton>
              {emojiPickerOpen && (
                <EmojiInsertPicker
                  onPick={(emoji) => {
                    onInsertText(emoji);
                    onEmojiPickerOpenChange(false);
                  }}
                  onClose={() => onEmojiPickerOpenChange(false)}
                />
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] text-black/35">
              <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift</kbd>+<kbd className="font-sans">Enter</kbd> for new line
            </span>
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                canSend
                  ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa3] shadow-sm'
                  : 'bg-black/[0.05] text-black/25 cursor-not-allowed'
              }`}
              aria-label={
                uploadingCount > 0
                  ? `Send message — waiting for ${uploadingCount} upload${uploadingCount === 1 ? '' : 's'}`
                  : 'Send message'
              }
              title={uploadingCount > 0 ? 'Waiting for uploads…' : 'Send message (Enter)'}
            >
              {uploadingCount > 0
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Single attachment chip in the composer. Removable. */
function AttachmentKindIcon({ kind, size = 'sm' }: { kind: ComposerAttachment['kind']; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-7 h-7' : 'w-6 h-6';
  const ic  = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  const palette = {
    image:   { bg: 'bg-rose-50',    fg: 'text-rose-600',    icon: <FileImage className={ic} /> },
    doc:     { bg: 'bg-blue-50',    fg: 'text-blue-600',    icon: <FileText  className={ic} /> },
    video:   { bg: 'bg-violet-50',  fg: 'text-violet-600',  icon: <FileText  className={ic} /> },
    audio:   { bg: 'bg-emerald-50', fg: 'text-emerald-600', icon: <FileText  className={ic} /> },
    archive: { bg: 'bg-amber-50',   fg: 'text-amber-600',   icon: <FileText  className={ic} /> },
    other:   { bg: 'bg-black/[0.05]', fg: 'text-black/60',  icon: <Paperclip className={ic} /> },
  }[kind];
  return (
    <span className={`${dim} rounded inline-flex items-center justify-center flex-shrink-0 ${palette.bg} ${palette.fg}`} aria-hidden="true">
      {palette.icon}
    </span>
  );
}

function AttachmentChip({ att, onRemove }: { att: ComposerAttachment; onRemove: () => void }) {
  const palette = {
    image:   { bg: 'bg-rose-50',    fg: 'text-rose-600',    icon: <FileImage className="w-3.5 h-3.5" /> },
    doc:     { bg: 'bg-blue-50',    fg: 'text-blue-600',    icon: <FileText  className="w-3.5 h-3.5" /> },
    video:   { bg: 'bg-violet-50',  fg: 'text-violet-600',  icon: <FileText  className="w-3.5 h-3.5" /> },
    audio:   { bg: 'bg-emerald-50', fg: 'text-emerald-600', icon: <FileText  className="w-3.5 h-3.5" /> },
    archive: { bg: 'bg-amber-50',   fg: 'text-amber-600',   icon: <FileText  className="w-3.5 h-3.5" /> },
    other:   { bg: 'bg-black/[0.05]', fg: 'text-black/60',  icon: <Paperclip className="w-3.5 h-3.5" /> },
  }[att.kind];
  const isUploading = att.status === 'uploading';
  const progress = Math.max(0, Math.min(100, att.progress ?? 100));
  return (
    <div className="relative inline-flex items-center gap-2 pr-1 pl-2 py-1 rounded-md border border-black/[0.08] bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)] overflow-hidden">
      <span className={`relative w-6 h-6 rounded inline-flex items-center justify-center flex-shrink-0 ${palette.bg} ${palette.fg}`} aria-hidden="true">
        {palette.icon}
        {!isUploading && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00C875] ring-2 ring-white inline-flex items-center justify-center" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 max-w-[180px]">
        <p className="text-[12px] font-semibold text-black/85 truncate leading-tight">{att.name}</p>
        <p
          className={`text-[11px] leading-tight tabular-nums ${isUploading ? 'text-[#204CC7]' : 'text-black/45'}`}
          aria-live={isUploading ? 'polite' : undefined}
        >
          {isUploading ? `Uploading… ${progress}%` : att.size}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={isUploading ? `Cancel upload of ${att.name}` : `Remove ${att.name}`}
        title={isUploading ? 'Cancel upload' : 'Remove'}
        className="w-5 h-5 inline-flex items-center justify-center rounded text-black/45 hover:bg-black/[0.05] hover:text-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
      >
        <X className="w-3 h-3" />
      </button>
      {/* Thin progress rail along the bottom of the chip — only while uploading.
          Sized via inline width so the bar grows in lockstep with the simulated
          upload, then fades out when the chip flips to ready. */}
      {isUploading && (
        <span
          className="absolute left-0 bottom-0 h-[2px] bg-[#204CC7] transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Decide whether a popover should anchor above or below its parent based on
 * available viewport space. Returns the chosen placement plus a ref that
 * should be attached to the popover root so it can be measured.
 *
 * We measure the popover's rendered height once it mounts and compare the
 * gap above and below the *anchor* (its `parentElement`, since these popovers
 * use absolute positioning relative to the trigger's wrapper). The default
 * leans toward `top` to match the previous behaviour, but we flip to `bottom`
 * when the popover would clip above the viewport.
 *
 * Re-runs on window resize so the placement updates as the user resizes the
 * pane (e.g., dragging the side panel narrower).
 */
function useFlipPlacement(preferred: 'top' | 'bottom' = 'top'): {
  placement: 'top' | 'bottom';
  ref: React.RefObject<HTMLDivElement>;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom'>(preferred);

  useEffect(() => {
    const compute = () => {
      const node = ref.current;
      const anchor = node?.parentElement;
      if (!node || !anchor) return;
      const margin = 12; // breathing room from the viewport edge
      const rect = anchor.getBoundingClientRect();
      const popoverH = node.offsetHeight || 240; // fallback before first paint
      const spaceAbove = rect.top - margin;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      if (preferred === 'top') {
        setPlacement(spaceAbove >= popoverH || spaceAbove >= spaceBelow ? 'top' : 'bottom');
      } else {
        setPlacement(spaceBelow >= popoverH || spaceBelow >= spaceAbove ? 'bottom' : 'top');
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [preferred]);

  return { placement, ref };
}

/**
 * Compact mention picker anchored above the @ button. Shows the channel
 * roster (sans current user). Clicking inserts `@firstname ` at the caret.
 */
function MentionInsertPicker({
  members, onPick, onClose,
}: {
  members: ChannelMember[];
  onPick: (m: ChannelMember) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const { placement, ref } = useFlipPlacement('top');
  const inputRef = useRef<HTMLInputElement>(null);
  // One ref per visible row so we can keep the highlighted member in view as
  // the user arrows through a long roster. Using an array of refs (vs querying
  // the DOM by id) keeps the picker self-contained.
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.initials.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  }, [members, query]);

  useEffect(() => { setHighlight(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  // Keep the highlighted row in view when the user arrows past the visible
  // window. `block: 'nearest'` avoids scrolling when the row is already in
  // view, which is the conventional behaviour combobox users expect.
  useEffect(() => {
    const node = rowRefs.current[highlight];
    if (node) node.scrollIntoView({ block: 'nearest' });
  }, [highlight]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose, ref]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Mention someone"
      className={`absolute left-0 z-30 w-[260px] bg-white rounded-lg border border-black/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.16)] overflow-hidden ${
        placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      }`}
      style={{ animation: 'inboxFadeIn 120ms ease-out' }}
    >
      <div className="px-2.5 py-1.5 border-b border-black/[0.06]">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Mention by name…"
          className="w-full h-7 px-2 bg-transparent text-[12.5px] text-black/85 placeholder:text-black/40 focus:outline-none"
          aria-label="Search team members"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter') {
              e.preventDefault();
              const pick = filtered[highlight];
              if (pick) onPick(pick);
            }
          }}
        />
      </div>
      <div className="max-h-[220px] overflow-y-auto py-1" role="listbox" aria-label="Team members">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-[12px] text-black/45 text-center">No matches</p>
        ) : filtered.map((m, idx) => {
          const isHi = idx === highlight;
          return (
            <button
              key={m.id}
              ref={(el) => { rowRefs.current[idx] = el; }}
              type="button"
              role="option"
              aria-selected={isHi}
              onMouseEnter={() => setHighlight(idx)}
              onClick={() => onPick(m)}
              className={`w-full px-2.5 py-1.5 flex items-center gap-2.5 text-left transition-colors focus-visible:outline-none ${
                isHi ? 'bg-[#204CC7]/[0.07]' : 'hover:bg-black/[0.025]'
              }`}
            >
              <div className={`relative w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${getAvatarColor(m.initials)}`}>
                {m.initials}
                {m.online && (
                  <span className="absolute -bottom-px -right-px w-2 h-2 rounded-full bg-[#00C875] ring-2 ring-white" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-black/85 truncate leading-tight">{m.name}</p>
                <p className="text-[11px] text-black/50 truncate leading-tight">{m.role}</p>
              </div>
              {m.isAdmin && (
                <ShieldCheck className="w-3 h-3 text-[#204CC7]/70 flex-shrink-0" aria-label="Admin" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Insert-emoji picker (separate from the reaction picker). Categories along
 * the top, scroll list below. Picks insert at the textarea caret rather than
 * adding a reaction.
 */
function EmojiInsertPicker({
  onPick, onClose,
}: { onPick: (emoji: string) => void; onClose: () => void }) {
  const CATS: { label: string; icon: string; emoji: string[] }[] = [
    { label: 'Smileys', icon: '😀', emoji: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','🙂','😉','😍','😘','😎','🤩','🤗','🤔','😴','😪','🥱','😢','😭','😡','🤯','🥳','🤤','😬','😏','😇','🙃'] },
    { label: 'Gestures', icon: '👍', emoji: ['👍','👎','👏','🙌','🙏','💪','🤝','👋','✌️','🤞','🤟','👌','🫡','🤙','✋','👇','👈','👉','☝️','👆'] },
    { label: 'Hearts', icon: '❤️', emoji: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'] },
    { label: 'Work', icon: '💼', emoji: ['💼','📊','📈','📉','📅','📆','🗓️','📌','📍','📎','🖇️','📁','📂','🗂️','📋','✅','❌','⚠️','🔥','✨','💡','🎯','🚀','🏆'] },
    { label: 'Symbols', icon: '✅', emoji: ['✅','☑️','✔️','❌','⛔','🛑','⚡','💯','🆗','🆕','🔔','🔕','📢','📣','💬','💭','🗯️','‼️','⁉️','❗','❓','🟢','🟡','🔴'] },
  ];
  const [active, setActive] = useState(0);
  const { placement, ref } = useFlipPlacement('top');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose, ref]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick an emoji"
      className={`absolute left-0 z-30 w-[284px] bg-white rounded-lg border border-black/[0.08] shadow-[0_12px_32px_-4px_rgba(0,0,0,0.16)] overflow-hidden ${
        placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      }`}
      style={{ animation: 'inboxFadeIn 120ms ease-out' }}
    >
      <div className="flex items-center gap-0.5 px-1 py-1 border-b border-black/[0.06]" role="tablist" aria-label="Emoji categories">
        {CATS.map((c, idx) => (
          <button
            key={c.label}
            type="button"
            role="tab"
            aria-selected={idx === active}
            aria-label={c.label}
            title={c.label}
            onClick={() => setActive(idx)}
            className={`flex-1 h-7 inline-flex items-center justify-center rounded text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
              idx === active ? 'bg-[#204CC7]/[0.08]' : 'hover:bg-black/[0.04]'
            }`}
          >
            {c.icon}
          </button>
        ))}
      </div>
      <div className="p-1.5 grid grid-cols-8 gap-0.5 max-h-[200px] overflow-y-auto">
        {CATS[active].emoji.map(em => (
          <button
            key={em}
            type="button"
            onClick={(e) => { e.stopPropagation(); onPick(em); }}
            aria-label={`Insert ${em}`}
            className="w-7 h-7 inline-flex items-center justify-center rounded text-[15px] hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComposerIconButton({
  children, label, onClick, active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
        active
          ? 'bg-[#204CC7]/[0.08] text-[#204CC7]'
          : 'text-black/45 hover:bg-black/[0.05] hover:text-black/70'
      }`}
    >
      {children}
    </button>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-3" role="separator" aria-label={date}>
      <div className="flex-1 h-px bg-black/[0.06]" />
      <span className="text-[11px] font-semibold text-black/45 px-2.5 py-0.5 rounded-full border border-black/[0.06] bg-white">
        {date}
      </span>
      <div className="flex-1 h-px bg-black/[0.06]" />
    </div>
  );
}

function MessageBubble({
  msg, grouped, onOpenThread, reactions, onToggleReaction, pinned, onTogglePin, saved, onToggleSave, domId,
}: {
  msg: Message;
  grouped: boolean;
  onOpenThread: (id: string) => void;
  reactions: Reaction[];
  onToggleReaction: (emoji: string) => void;
  pinned: boolean;
  onTogglePin: () => void;
  saved: boolean;
  onToggleSave: () => void;
  domId: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div
      id={domId}
      className={`group relative flex gap-3 px-2 py-1 rounded-lg transition-colors ${
        pinned ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-black/[0.02]'
      } ${grouped ? 'mt-0' : 'mt-3 first:mt-0'}`}
      role="article"
      aria-label={`${msg.sender} at ${msg.timestamp}: ${msg.content}${pinned ? ' (pinned)' : ''}`}
    >
      <div className="w-9 flex-shrink-0 pt-0.5">
        {grouped ? (
          <span className="text-[11px] text-transparent group-hover:text-black/35 transition-colors leading-5 block text-right tabular-nums pr-1">
            {msg.timestamp.replace(' PM', '').replace(' AM', '')}
          </span>
        ) : (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold text-white ${getAvatarColor(msg.avatar)}`} aria-hidden="true">
            {msg.avatar}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className={`text-caption font-bold ${msg.isUser ? 'text-[#204CC7]' : 'text-black/90'}`}>{msg.sender}</span>
            {msg.role && (
              <span className="text-[11px] px-1.5 py-px rounded bg-black/[0.04] text-black/55 font-medium">{msg.role}</span>
            )}
            <time className="text-[11px] text-black/40 tabular-nums">{msg.timestamp}</time>
            {pinned && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-px rounded">
                <Pin className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                <span>Pinned</span>
              </span>
            )}
          </div>
        )}
        {grouped && pinned && (
          <span
            className="absolute left-0 top-1.5 w-9 flex justify-center"
            aria-hidden="true"
            title="Pinned"
          >
            <Pin className="w-2.5 h-2.5 text-amber-600 fill-current" />
          </span>
        )}
        {msg.content && (
          <p className="text-body text-black/85 leading-[1.55] whitespace-pre-wrap break-words mt-0.5">{renderWithMentions(msg.content)}</p>
        )}
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Attachments">
            {msg.attachments.map(a => (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 max-w-[280px] rounded-md border border-black/[0.08] bg-white px-2 py-1.5 hover:border-black/[0.16] hover:bg-black/[0.02] transition-colors"
              >
                <AttachmentKindIcon kind={a.kind} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold text-black/85 truncate">{a.name}</span>
                  <span className="block text-[11px] text-black/45">{a.size}</span>
                </span>
              </span>
            ))}
          </div>
        )}
        {/* Reaction chips — only rendered when reactions exist. The picker
            entry now lives in the hover toolbar (top-right), so this row is
            reserved purely for real reaction data. Quiet messages stay clean. */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5" role="group" aria-label="Reactions">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction(r.emoji)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[12px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                  r.reacted
                    ? 'bg-[#204CC7]/10 border-[#204CC7]/25 text-[#204CC7] hover:bg-[#204CC7]/15'
                    : 'bg-white border-black/[0.08] text-black/65 hover:bg-black/[0.03] hover:border-black/15'
                }`}
                aria-pressed={r.reacted}
                aria-label={`${r.emoji} ${r.count} ${r.count === 1 ? 'reaction' : 'reactions'}${r.reacted ? ', you reacted — click to remove' : ', click to add yours'}`}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}
        {msg.threadId && msg.replyCount && msg.replyCount > 0 && (
          <button
            type="button"
            onClick={() => onOpenThread(msg.threadId!)}
            className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-semibold text-[#204CC7] hover:bg-[#204CC7]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
          >
            <Reply className="w-3 h-3" aria-hidden="true" />
            <span>{msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}</span>
            <span className="text-black/40 font-normal">· View thread</span>
          </button>
        )}
      </div>
      {/* Hover actions — single right-side toolbar covering every message-level
          action. Order: React (most-used) → Reply → Star. The toolbar stays
          visible while the picker is open so the user can pick without losing
          hover. The picker anchors below-right of the Smile button so it never
          clips the right edge of the message column. */}
      <div className={`absolute -top-3 right-2 items-center gap-0.5 px-1 py-0.5 rounded-md bg-white border border-black/[0.08] shadow-sm ${pickerOpen ? 'flex' : 'hidden group-hover:flex'}`}>
        <span className="relative inline-flex">
          <HoverIconButton
            label={reactions.length > 0 ? 'Add another reaction' : 'Add reaction'}
            onClick={() => setPickerOpen(v => !v)}
            active={pickerOpen}
          >
            <Smile className="w-3.5 h-3.5" />
          </HoverIconButton>
          {pickerOpen && (
            <EmojiQuickPicker
              onPick={(emoji) => { onToggleReaction(emoji); setPickerOpen(false); }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </span>
        {msg.threadId && (
          <HoverIconButton label="Reply in thread" onClick={() => onOpenThread(msg.threadId!)}><Reply className="w-3.5 h-3.5" /></HoverIconButton>
        )}
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? 'Unpin message' : 'Pin message'}
          aria-pressed={pinned}
          title={pinned ? 'Unpin message' : 'Pin message'}
          className={`w-7 h-7 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 ${
            pinned
              ? 'bg-amber-100/80 text-amber-700 hover:bg-amber-100'
              : 'text-black/55 hover:bg-black/[0.05] hover:text-black/85'
          }`}
        >
          <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={saved ? 'Remove from saved' : 'Save for later'}
          aria-pressed={saved}
          title={saved ? 'Remove from saved' : 'Save for later'}
          className={`w-7 h-7 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 ${
            saved
              ? 'bg-amber-100/80 text-amber-600 hover:bg-amber-100'
              : 'text-black/55 hover:bg-black/[0.05] hover:text-black/85'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function HoverIconButton({
  children, label, onClick, active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`w-7 h-7 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
        active
          ? 'bg-[#204CC7]/10 text-[#204CC7]'
          : 'text-black/55 hover:bg-black/[0.05] hover:text-black/85'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Compact emoji picker anchored to its parent `relative` span (the Smile
 * button in the right-side hover toolbar). Opens just below the button and
 * extends leftward (right-aligned) so it never clips the right edge of the
 * message column. Curated set covers the top-used reactions in a work chat —
 * ack, celebration, agreement, attention markers, and ✅/📈 for workflow
 * signals. Closes on Esc or outside click.
 */
function EmojiQuickPicker({
  onPick, onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🙌', '✅', '🙏', '🔥', '👀', '📈'];
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick a reaction"
      className="absolute top-full right-0 mt-1.5 z-20 bg-white rounded-lg border border-black/10 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] p-1 flex gap-0.5"
      style={{ animation: 'inboxFadeIn 120ms ease-out' }}
    >
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => { e.stopPropagation(); onPick(emoji); }}
          aria-label={`React with ${emoji}`}
          title={emoji}
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-[15px] hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/** Render @mentions as styled chips */
function renderWithMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <span key={i} className="px-1 py-px rounded bg-[#204CC7]/10 text-[#204CC7] font-semibold">{p}</span>
      : <span key={i}>{p}</span>
  );
}

function EmptyChannelState({ channel }: { channel: Channel }) {
  const accent = getChannelAccent(channel.id);
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-[inboxFadeIn_220ms_ease-out]">
      <div className={`w-14 h-14 rounded-xl ${accent.bg} flex items-center justify-center mb-3`}>
        {channel.kind === 'dm' ? (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white ${getAvatarColor(channel.avatar || '')}`}>{channel.avatar}</div>
        ) : channel.isPrivate ? (
          <Lock className={`w-5 h-5 ${accent.text}`} />
        ) : (
          <Hash className={`w-5 h-5 ${accent.text}`} />
        )}
      </div>
      <p className="text-h3 font-semibold text-black/85 mb-1">
        {channel.kind === 'dm' ? channel.name : `#${channel.name}`}
      </p>
      <p className="text-caption text-black/50 max-w-[420px]">
        {channel.kind === 'dm'
          ? `This is the start of your direct message history with ${channel.name}.`
          : `This is the very beginning of #${channel.name}. ${channel.description || ''}`}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   THREADS VIEW
   ═══════════════════════════════════════════════════════════════════ */

function ViewHeader({ icon, title, subtitle, right }: { icon: React.ReactNode; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <header className="px-8 py-5 border-b border-black/[0.06] flex items-center justify-between gap-4 flex-shrink-0 bg-white">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex items-center justify-center text-black/55 flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-h2 font-bold text-black truncate leading-tight">{title}</h2>
          <p className="text-caption text-black/50 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {right}
    </header>
  );
}

function ThreadsView({
  threads, channels, onOpenThread, onOpenChannel, activeThreadId,
}: { threads: Thread[]; channels: Channel[]; onOpenThread: (id: string) => void; onOpenChannel: (id: string) => void; activeThreadId: string | null }) {
  return (
    <>
      <ViewHeader
        icon={<MessageSquareText className="w-5 h-5 text-black/55" />}
        title="Threads"
        subtitle="Conversations with follow-up replies, newest activity first."
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[820px] mx-auto px-8 py-6">
          {threads.length === 0 ? (
            <EmptyState
              icon={<MessageSquareText className="w-6 h-6 text-black/30" />}
              title="No active threads"
              body="When someone replies to a message, the conversation appears here as a thread."
            />
          ) : (
            <ul className="space-y-1.5">
              {threads.map(t => {
                const ch = channels.find(c => c.id === t.channelId);
                const isActive = t.id === activeThreadId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onOpenThread(t.id)}
                      className={`group relative w-full text-left rounded-lg border bg-white px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                        isActive ? 'border-[#204CC7]/35' : 'border-black/[0.06] hover:border-black/[0.12] hover:bg-black/[0.015]'
                      }`}
                    >
                      {t.unread && (
                        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-[#204CC7]" aria-label="Unread" />
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <ChannelChip channel={ch} onClick={(e) => { e.stopPropagation(); onOpenChannel(t.channelId); }} />
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(t.parent.avatar)}`}>
                          {t.parent.avatar}
                        </div>
                        <span className="text-caption font-semibold text-black/85">{t.parent.sender}</span>
                        <span className="text-[12px] text-black/40 ml-auto tabular-nums">{t.parent.timestamp}</span>
                      </div>
                      <p className={`text-body leading-[1.5] line-clamp-2 ${t.unread ? 'text-black/85 font-medium' : 'text-black/65'}`}>
                        {t.parent.content}
                      </p>
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.05]">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#204CC7]">
                          <Reply className="w-3 h-3" aria-hidden="true" />
                          {t.replies.length} {t.replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                        <span className="text-[12px] text-black/40">Last reply {t.lastReplyAt}</span>
                        <div className="flex -space-x-1.5 ml-auto">
                          {t.participantAvatars.slice(0, 4).map((a, i) => (
                            <div key={i} className={`w-5 h-5 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white ${getAvatarColor(a)}`}>
                              {a}
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MENTIONS VIEW
   ═══════════════════════════════════════════════════════════════════ */

function MentionsView({
  mentions, channels, filter, onFilterChange, unreadCount, totalCount, onOpenChannel,
}: {
  mentions: Mention[];
  channels: Channel[];
  filter: 'all' | 'unread';
  onFilterChange: (f: 'all' | 'unread') => void;
  unreadCount: number;
  totalCount: number;
  onOpenChannel: (channelId: string, mentionId?: string) => void;
}) {
  return (
    <>
      <ViewHeader
        icon={<AtSign className="w-5 h-5 text-black/55" />}
        title="Mentions"
        subtitle="Every message where you've been pinged across channels and DMs."
        right={
          <FilterPills
            value={filter}
            onChange={(v) => onFilterChange(v as 'all' | 'unread')}
            options={[
              { value: 'all', label: 'All', count: totalCount },
              { value: 'unread', label: 'Unread', count: unreadCount },
            ]}
          />
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[820px] mx-auto px-8 py-6">
          {mentions.length === 0 ? (
            <EmptyState
              icon={<AtSign className="w-6 h-6 text-black/30" />}
              title={filter === 'unread' ? 'No unread mentions' : 'No mentions yet'}
              body="Anyone who @-mentions you in a channel or DM will show up here."
            />
          ) : (
            <ul className="space-y-1.5">
              {mentions.map(m => {
                const ch = channels.find(c => c.id === m.channelId);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onOpenChannel(m.channelId, m.id)}
                      className="group relative w-full text-left rounded-lg border border-black/[0.06] bg-white px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 hover:border-black/[0.12] hover:bg-black/[0.015]"
                    >
                      {!m.read && (
                        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-[#204CC7]" aria-label="Unread" />
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <ChannelChip channel={ch} onClick={(e) => { e.stopPropagation(); onOpenChannel(m.channelId, m.id); }} />
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(m.avatar)}`}>
                          {m.avatar}
                        </div>
                        <span className="text-caption font-semibold text-black/85">{m.sender}</span>
                        {m.role && <span className="text-[11px] text-black/45 font-medium">{m.role}</span>}
                        <span className="text-[12px] text-black/40 ml-auto tabular-nums">{m.date} · {m.timestamp}</span>
                      </div>
                      <p className="text-body leading-[1.55] text-black/80">
                        {m.contentBefore}
                        <span className="px-1 py-px rounded bg-[#204CC7]/10 text-[#204CC7] font-semibold">@miyajan</span>
                        {m.contentAfter}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STARRED (SAVED) VIEW
   ═══════════════════════════════════════════════════════════════════ */

function StarredView({
  saved, channels, onOpenChannel, onUnsave,
}: {
  saved: { key: string; channelId: string; msg: Message }[];
  channels: Channel[];
  onOpenChannel: (id: string) => void;
  onUnsave: (channelId: string, msgId: number) => void;
}) {
  return (
    <>
      <ViewHeader
        icon={<Star className="w-5 h-5 text-black/55" />}
        title="Saved"
        subtitle="Messages you've saved for later — only visible to you."
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[820px] mx-auto px-8 py-6">
          {saved.length === 0 ? (
            <EmptyState
              icon={<Star className="w-6 h-6 text-black/30" />}
              title="No saved messages"
              body="Hover over any message and tap the star to save it here."
            />
          ) : (
            <ul className="space-y-1.5">
              {saved.map(s => {
                const ch = channels.find(c => c.id === s.channelId);
                return (
                  <li key={s.key}>
                    <div className="group relative rounded-lg border border-black/[0.06] bg-white px-4 py-3.5 transition-colors hover:border-black/[0.12] hover:bg-black/[0.015]">
                      <button
                        type="button"
                        onClick={() => onOpenChannel(s.channelId)}
                        className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                        aria-label={`Open in ${ch?.companyName ?? ch?.name ?? 'channel'}`}
                      />
                      <div className="relative flex items-center gap-2 mb-1.5">
                        <ChannelChip channel={ch} onClick={(e) => { e.stopPropagation(); onOpenChannel(s.channelId); }} />
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getAvatarColor(s.msg.avatar)}`}>
                          {s.msg.avatar}
                        </div>
                        <span className="text-caption font-semibold text-black/85">{s.msg.sender}</span>
                        <span className="text-[12px] text-black/40 ml-auto tabular-nums">{s.msg.timestamp}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onUnsave(s.channelId, s.msg.id); }}
                          aria-label="Remove from saved"
                          title="Remove from saved"
                          className="relative inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-500 hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 transition-colors"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                      <p className="relative text-body leading-[1.55] text-black/75 pointer-events-none">{s.msg.content}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FILES VIEW
   ═══════════════════════════════════════════════════════════════════ */

function FilesView({
  files, channels, filter, onFilterChange, counts, onOpenChannel, onOpenFile,
}: {
  files: SharedFile[];
  channels: Channel[];
  filter: 'all' | 'doc' | 'image' | 'link';
  onFilterChange: (f: 'all' | 'doc' | 'image' | 'link') => void;
  counts: { all: number; doc: number; image: number; link: number };
  onOpenChannel: (id: string) => void;
  onOpenFile: (file: SharedFile) => void;
}) {
  return (
    <>
      <ViewHeader
        icon={<Paperclip className="w-5 h-5 text-black/55" />}
        title="Files & links"
        subtitle="Everything shared across your team channels and DMs."
        right={
          <FilterPills
            value={filter}
            onChange={(v) => onFilterChange(v as 'all' | 'doc' | 'image' | 'link')}
            options={[
              { value: 'all',   label: 'All',    count: counts.all },
              { value: 'doc',   label: 'Docs',   count: counts.doc },
              { value: 'image', label: 'Images', count: counts.image },
              { value: 'link',  label: 'Links',  count: counts.link },
            ]}
          />
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[820px] mx-auto px-8 py-6">
          {files.length === 0 ? (
            <EmptyState
              icon={<Paperclip className="w-6 h-6 text-black/30" />}
              title="Nothing here yet"
              body="When your team shares files or links in any channel, they'll show up here."
            />
          ) : (
            <ul className="space-y-1.5">
              {files.map(f => {
                const ch = channels.find(c => c.id === f.channelId);
                return (
                  <li key={f.id}>
                    <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-white px-4 py-3 hover:border-black/[0.12] hover:bg-black/[0.015] transition-colors">
                      <FileTypeIcon type={f.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ChannelChip channel={ch} onClick={(e) => { e.stopPropagation(); onOpenChannel(f.channelId); }} />
                          <span className="text-[12px] text-black/55">{f.sharedBy}</span>
                          <span className="text-[12px] text-black/30">·</span>
                          <span className="text-[12px] text-black/45 tabular-nums">{f.sharedAt}</span>
                        </div>
                        <p className="text-caption font-semibold text-black/85 truncate mt-0.5">{f.name}</p>
                        <p className="text-[12px] text-black/45 truncate">{f.meta}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenFile(f)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/45 hover:bg-black/[0.05] hover:text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
                        aria-label={`Open ${f.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function FileTypeIcon({ type }: { type: 'doc' | 'image' | 'link' }) {
  const config = {
    doc:   { bg: 'bg-blue-50',    color: 'text-blue-600',    icon: <FileText className="w-4 h-4" /> },
    image: { bg: 'bg-rose-50',    color: 'text-rose-600',    icon: <FileImage className="w-4 h-4" /> },
    link:  { bg: 'bg-emerald-50', color: 'text-emerald-600', icon: <Link2 className="w-4 h-4" /> },
  }[type];
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color}`}>
      {config.icon}
    </div>
  );
}

function FilterPills<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" className="flex items-center gap-1 p-1 rounded-lg bg-black/[0.04]">
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`h-7 px-3 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
              active ? 'bg-[#204CC7] text-white shadow-sm' : 'text-black/60 hover:text-black/85'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={`tabular-nums ${active ? 'text-white/85' : 'text-black/40'}`}>{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED — CHANNEL CHIP & EMPTY STATE
   ═══════════════════════════════════════════════════════════════════ */

function ChannelChip({ channel, onClick }: { channel?: Channel; onClick?: (e: React.MouseEvent) => void }) {
  if (!channel) return null;
  const isDM = channel.kind === 'dm';
  const isClient = channel.kind === 'client';
  const svc = isClient && channel.service ? serviceMeta[channel.service] : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
        isClient && svc
          ? `${svc.chipBg} ${svc.chipText} hover:brightness-95`
          : 'bg-black/[0.05] text-black/70 hover:bg-black/[0.08] hover:text-black/90'
      }`}
    >
      {isClient && svc ? (
        <span className={`w-2 h-2 rounded-sm ${svc.dot}`} aria-hidden="true" />
      ) : isDM ? (
        <AtSign className="w-2.5 h-2.5" aria-hidden="true" />
      ) : channel.isPrivate ? (
        <Lock className="w-2.5 h-2.5" aria-hidden="true" />
      ) : (
        <Hash className="w-2.5 h-2.5" aria-hidden="true" />
      )}
      {isClient ? (channel.companyName || channel.name) : channel.name}
    </button>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-[inboxFadeIn_220ms_ease-out]">
      <div className="w-14 h-14 rounded-xl bg-black/[0.04] flex items-center justify-center mb-3">{icon}</div>
      <p className="text-h3 font-semibold text-black/80 mb-1">{title}</p>
      <p className="text-caption text-black/50 max-w-[380px]">{body}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   THREAD DRAWER (right side)
   ═══════════════════════════════════════════════════════════════════ */

function ThreadDrawer({
  thread, channel, composer, onComposerChange, crosspost, onCrosspostChange, onSend, onClose, onOpenChannel,
  getReactions, onToggleReaction, extraReplies = [],
}: {
  thread: Thread;
  channel?: Channel;
  composer: string;
  onComposerChange: (v: string) => void;
  crosspost: boolean;
  onCrosspostChange: (v: boolean) => void;
  onSend: () => void;
  onClose: () => void;
  onOpenChannel: (id: string) => void;
  getReactions: (msg: Message | ThreadReply) => Reaction[];
  onToggleReaction: (msg: Message | ThreadReply, emoji: string) => void;
  extraReplies?: ThreadReply[];
}) {
  const allReplies = [...thread.replies, ...extraReplies];
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      ref={drawerRef}
      role="complementary"
      aria-label="Thread"
      className="w-[400px] border-l border-black/[0.06] flex flex-col bg-white flex-shrink-0"
      style={{ animation: 'inboxSlideIn 200ms ease-out' }}
    >
      {/* Header */}
      <header className="h-[60px] px-5 flex items-center justify-between border-b border-black/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-black/[0.04] flex items-center justify-center flex-shrink-0">
            <Reply className="w-3.5 h-3.5 text-black/55" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-caption font-bold text-black truncate">Thread</p>
            {channel && (
              <button
                type="button"
                onClick={() => onOpenChannel(channel.id)}
                className="inline-flex items-center gap-1 text-[12px] text-black/55 hover:text-[#204CC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 rounded transition-colors"
              >
                {channel.isPrivate ? <Lock className="w-2.5 h-2.5" aria-hidden="true" /> : <Hash className="w-2.5 h-2.5" aria-hidden="true" />}
                {channel.name}
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close thread"
          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          {/* Parent message */}
          <ThreadMessage
            msg={thread.parent}
            isParent
            reactions={getReactions(thread.parent)}
            onToggleReaction={(emoji) => onToggleReaction(thread.parent, emoji)}
          />
          <div className="flex items-center gap-3 my-3 px-2">
            <div className="flex-1 h-px bg-black/[0.06]" />
            <span className="text-[11px] font-semibold text-black/45">{allReplies.length} {allReplies.length === 1 ? 'reply' : 'replies'}</span>
            <div className="flex-1 h-px bg-black/[0.06]" />
          </div>
          {/* Replies */}
          {allReplies.map(r => (
            <ThreadMessage
              key={r.id}
              msg={r}
              reactions={getReactions(r)}
              onToggleReaction={(emoji) => onToggleReaction(r, emoji)}
            />
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="px-4 py-3 border-t border-black/[0.06] flex-shrink-0">
        <div className="border border-black/[0.12] rounded-xl bg-white focus-within:border-[#204CC7]/40 focus-within:shadow-[0_0_0_3px_rgba(32,76,199,0.08)] transition-all">
          <textarea
            value={composer}
            onChange={e => onComposerChange(e.target.value)}
            placeholder="Reply to this thread…"
            rows={2}
            className="w-full px-3.5 pt-2.5 pb-1.5 text-[13.5px] leading-[1.5] text-black/90 placeholder:text-black/40 focus:outline-none resize-none bg-transparent"
            aria-label="Reply to thread"
          />
          <div className="px-3 py-2 flex items-center justify-between border-t border-black/[0.04]">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={crosspost}
                onChange={e => onCrosspostChange(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-black/30 text-[#204CC7] focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
              />
              <span className="text-[12px] text-black/60">
                Also send to <span className="font-semibold text-black/80">{channel ? (channel.kind === 'dm' ? channel.name : `#${channel.name}`) : 'channel'}</span>
              </span>
            </label>
            <button
              type="button"
              onClick={onSend}
              disabled={!composer.trim()}
              className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 ${
                composer.trim()
                  ? 'bg-[#204CC7] text-white hover:bg-[#1a3fa3]'
                  : 'bg-black/[0.05] text-black/25 cursor-not-allowed'
              }`}
              aria-label="Send reply"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-black/35 mt-1.5 text-right">
          <kbd className="font-sans">Esc</kbd> to close
        </p>
      </div>
    </aside>
  );
}

function ThreadMessage({
  msg, isParent, reactions, onToggleReaction, saved, onToggleSave,
}: {
  msg: ThreadReply | Message;
  isParent?: boolean;
  reactions: Reaction[];
  onToggleReaction: (emoji: string) => void;
  saved?: boolean;
  onToggleSave?: () => void;
}) {
  const m = msg as Message;
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className={`group/tm relative flex gap-2.5 px-2 py-2 rounded-lg transition-colors ${isParent ? 'bg-black/[0.02]' : 'hover:bg-black/[0.02]'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${getAvatarColor(m.avatar)}`} aria-hidden="true">
        {m.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-[13px] font-bold ${m.isUser ? 'text-[#204CC7]' : 'text-black/90'}`}>{m.sender}</span>
          {m.role && <span className="text-[11px] px-1.5 py-px rounded bg-black/[0.04] text-black/55 font-medium">{m.role}</span>}
          <time className="text-[11px] text-black/40 tabular-nums">{m.timestamp}</time>
        </div>
        <p className="text-[13.5px] leading-[1.55] text-black/85 whitespace-pre-wrap break-words mt-0.5">{renderWithMentions(m.content)}</p>
        {/* Reaction chips — only render when reactions exist. Picker entry
            lives in the right-side hover toolbar, mirroring MessageBubble. */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5" role="group" aria-label="Reactions">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction(r.emoji)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                  r.reacted
                    ? 'bg-[#204CC7]/10 border-[#204CC7]/25 text-[#204CC7] hover:bg-[#204CC7]/15'
                    : 'bg-white border-black/[0.08] text-black/65 hover:bg-black/[0.03] hover:border-black/15'
                }`}
                aria-pressed={r.reacted}
                aria-label={`${r.emoji} ${r.count} ${r.count === 1 ? 'reaction' : 'reactions'}${r.reacted ? ', you reacted — click to remove' : ', click to add yours'}`}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Hover actions — same right-side toolbar pattern as MessageBubble.
          Inside a thread we omit Reply (the composer at the bottom is the
          reply surface) and surface React + Star only. Toolbar stays open
          while the picker is open. */}
      {!isParent && (
        <div className={`absolute -top-3 right-2 items-center gap-0.5 px-1 py-0.5 rounded-md bg-white border border-black/[0.08] shadow-sm ${pickerOpen ? 'flex' : 'hidden group-hover/tm:flex'}`}>
          <span className="relative inline-flex">
            <HoverIconButton
              label={reactions.length > 0 ? 'Add another reaction' : 'Add reaction'}
              onClick={() => setPickerOpen(v => !v)}
              active={pickerOpen}
            >
              <Smile className="w-3.5 h-3.5" />
            </HoverIconButton>
            {pickerOpen && (
              <EmojiQuickPicker
                onPick={(emoji) => { onToggleReaction(emoji); setPickerOpen(false); }}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </span>
          {onToggleSave && (
            <button
              type="button"
              onClick={onToggleSave}
              aria-label={saved ? 'Remove from saved' : 'Save for later'}
              aria-pressed={saved}
              title={saved ? 'Remove from saved' : 'Save for later'}
              className={`w-7 h-7 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 ${
                saved
                  ? 'bg-amber-100/80 text-amber-600 hover:bg-amber-100'
                  : 'text-black/55 hover:bg-black/[0.05] hover:text-black/85'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MEMBERS DRAWER — Admin/HOD removes a Brego employee from a client channel.
   Pattern: hover-revealed UserMinus on each row → row morphs into an inline
   confirmation with optional reason → row fades out → bottom toast offers Undo.
   We never show a separate modal; the action stays in flow.
   ═══════════════════════════════════════════════════════════════════ */

function MembersDrawer({
  channel, roster, currentUserId, canManage, onClose, onRemove,
}: {
  channel: Channel;
  roster: ChannelMember[];
  currentUserId: string;
  canManage: boolean;
  onClose: () => void;
  onRemove: (member: ChannelMember, reason?: string) => void;
}) {
  const [search, setSearch] = useState('');
  // Per-row pending-confirm state. Only one row can be in confirm mode at a time
  // (clicking Remove on a different row replaces the in-flight confirm) so the
  // user can't accidentally queue up two destructive actions.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? roster.filter(m => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))
    : roster;

  // Stable sort: current user first (so admins can find themselves), then
  // admins, then alpha by name.
  const sorted = [...filtered].sort((a, b) => {
    if ((a.id === currentUserId) !== (b.id === currentUserId)) return a.id === currentUserId ? -1 : 1;
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const startRemove = (id: string) => {
    setPendingId(id);
    setReason('');
  };
  const cancelRemove = () => {
    setPendingId(null);
    setReason('');
  };
  const confirmRemove = (member: ChannelMember) => {
    onRemove(member, reason.trim() || undefined);
    setPendingId(null);
    setReason('');
  };

  return (
    <aside
      role="complementary"
      aria-label={`Members of ${channel.companyName || channel.name}`}
      className="w-[360px] border-l border-black/[0.06] flex flex-col bg-white flex-shrink-0"
      style={{ animation: 'inboxSlideIn 200ms ease-out' }}
    >
      {/* ── Header ── */}
      <header className="h-[60px] px-5 flex items-center justify-between border-b border-black/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[#204CC7]/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-[#204CC7]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-caption font-bold text-black truncate">Members</p>
            <p className="text-[11px] text-black/45 tabular-nums">
              {roster.length} {roster.length === 1 ? 'person' : 'people'} on this channel
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close members"
          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* ── Search ── */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/35" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a teammate"
            aria-label="Find a member"
            className="w-full h-9 pl-8 pr-3 text-[13px] rounded-md bg-black/[0.03] border border-transparent focus:border-[#204CC7]/30 focus:bg-white focus:outline-none transition-colors placeholder:text-black/35"
          />
        </div>
      </div>

      {/* ── Member list ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-3" role="list">
        {sorted.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] text-black/55">No teammate matches "{search}".</p>
          </div>
        ) : (
          sorted.map((m) => {
            const isSelf = m.id === currentUserId;
            const isPending = pendingId === m.id;
            // Removable iff: viewer can manage and target is not the viewer
            // themselves. Self-leave is a separate flow on the profile page.
            const removable = canManage && !isSelf;
            return (
              <div
                key={m.id}
                role="listitem"
                className={`group/m relative px-3 py-2.5 rounded-lg transition-colors ${
                  isPending ? 'bg-[#E2445C]/[0.04]' : 'hover:bg-black/[0.025]'
                }`}
              >
                {/* Standard row */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white ${getAvatarColor(m.initials)}`}>
                      {m.initials}
                    </div>
                    {m.online && (
                      <span className="absolute -bottom-0 -right-0 w-2.5 h-2.5 bg-[#00C875] rounded-full border-2 border-white" aria-label="Online" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13.5px] font-semibold text-black/90 truncate">{m.name}</span>
                      {isSelf && (
                        <span className="text-[10.5px] font-semibold text-black/45">(You)</span>
                      )}
                      {m.isAdmin && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-[2px] rounded bg-[#204CC7]/10 text-[#204CC7]">
                          <ShieldCheck className="w-2.5 h-2.5" aria-hidden="true" />Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-black/55 truncate mt-0.5">
                      {m.role}{m.joinedNote ? ` · ${m.joinedNote}` : ''}
                    </p>
                  </div>
                  {/* Remove affordance — hover-revealed, hidden during inline confirm */}
                  {removable && !isPending && (
                    <button
                      type="button"
                      onClick={() => startRemove(m.id)}
                      aria-label={`Remove ${m.name} from this channel`}
                      title="Remove from channel"
                      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-black/40 hover:bg-[#E2445C]/10 hover:text-[#E2445C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2445C]/30 transition-colors opacity-0 group-hover/m:opacity-100 focus-visible:opacity-100 flex-shrink-0"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline confirm — replaces the right-edge action with a focused
                    micro-form. Reason is optional but encouraged for the audit log. */}
                {isPending && (
                  <div className="mt-2.5 pl-12">
                    <p className="text-[12.5px] text-black/75 leading-snug">
                      Remove <span className="font-semibold text-black/90">{m.name}</span> from
                      {' '}<span className="font-semibold text-black/90">{channel.companyName || `#${channel.name}`}</span>?
                    </p>
                    <p className="text-[11px] text-black/45 mt-0.5">
                      They'll lose access immediately. You can re-add them anytime.
                    </p>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason (optional, recorded in audit log)"
                      aria-label="Reason for removal"
                      maxLength={120}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmRemove(m);
                        if (e.key === 'Escape') cancelRemove();
                      }}
                      className="mt-2 w-full h-8 px-2.5 text-[12.5px] rounded-md bg-white border border-black/[0.12] focus:border-[#204CC7]/40 focus:outline-none placeholder:text-black/35"
                    />
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={cancelRemove}
                        className="h-7 px-2.5 inline-flex items-center text-[12px] font-semibold text-black/65 rounded-md hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmRemove(m)}
                        className="h-7 px-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-white bg-[#E2445C] rounded-md hover:bg-[#c93a50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2445C]/40 transition-colors"
                      >
                        <UserMinus className="w-3 h-3" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer hint ── */}
      <div className="px-5 py-3 border-t border-black/[0.06] flex-shrink-0 flex items-center gap-2">
        {canManage ? (
          <p className="text-[11px] text-black/45 leading-snug">
            <ShieldCheck className="w-3 h-3 text-[#204CC7] inline-block -mt-0.5 mr-1" aria-hidden="true" />
            You can manage members on this channel. Removed people lose access immediately.
          </p>
        ) : (
          <p className="text-[11px] text-black/45 leading-snug">
            Only admins and HODs can manage members on this channel.
          </p>
        )}
      </div>
    </aside>
  );
}

/**
 * Bottom-anchored toast that surfaces after a removal. Persists for 6s with
 * a one-tap Undo. Lives at the root so it survives drawer close / channel
 * switch — the user shouldn't lose their safety net just because they
 * dismissed the panel.
 */
function RemovalToast({
  member, channelLabel, onUndo, onDismiss,
}: {
  member: ChannelMember;
  channelLabel: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-lg bg-black/90 text-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)]"
      style={{ animation: 'inboxToastIn 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${getAvatarColor(member.initials)}`} aria-hidden="true">
        {member.initials}
      </div>
      <p className="text-[12.5px] leading-tight">
        <span className="font-semibold">{member.name}</span>
        <span className="text-white/70"> removed from </span>
        <span className="font-semibold">{channelLabel}</span>
      </p>
      <button
        type="button"
        onClick={onUndo}
        className="h-7 px-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-[#7BA9FF] hover:text-white hover:bg-white/10 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
      >
        <Undo2 className="w-3 h-3" aria-hidden="true" />
        Undo
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="w-7 h-7 inline-flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AI SUMMARY DRAWER
   ═══════════════════════════════════════════════════════════════════ */

function AISummaryDrawer({
  loading, data, revealIdx, onClose, onRegenerate,
}: {
  loading: boolean;
  data: AISummaryData | null;
  revealIdx: number;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  return (
    <aside
      role="complementary"
      aria-label="AI conversation summary"
      className="w-[380px] border-l border-black/[0.06] flex flex-col bg-white flex-shrink-0"
      style={{ animation: 'inboxSlideIn 200ms ease-out' }}
    >
      <header className="h-[60px] px-5 flex items-center justify-between border-b border-black/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#7C3AED]/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-caption font-bold text-black">Summary</p>
            {data && <p className="text-[11px] text-black/45 tabular-nums">{data.messageRange.split('·')[0]?.trim()}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close summary"
          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-black/55 hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <div className="h-3 w-20 bg-black/[0.06] rounded animate-pulse" />
              <div className="h-3 w-full bg-black/[0.04] rounded animate-pulse" />
              <div className="h-3 w-[88%] bg-black/[0.04] rounded animate-pulse" />
              <div className="h-3 w-[70%] bg-black/[0.04] rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 bg-black/[0.06] rounded animate-pulse" />
              <div className="h-3 w-full bg-black/[0.04] rounded animate-pulse" />
              <div className="h-3 w-[80%] bg-black/[0.04] rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-center gap-2 pt-3">
              <Sparkles className="w-3.5 h-3.5 text-[#7C3AED] animate-pulse" />
              <span className="text-[12px] text-[#7C3AED]/70 font-medium animate-pulse">Reading the conversation…</span>
            </div>
          </div>
        ) : data ? (
          <div className="p-5">
            <div className={`pb-4 transition-all duration-300 ${revealIdx >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <p className="text-body leading-[1.6] text-black/75">{data.overview}</p>
            </div>
            {data.keyDecisions.length > 0 && (
              <div className={`py-4 border-t border-black/[0.06] transition-all duration-300 ${revealIdx >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-3.5 h-3.5 text-[#204CC7]" aria-hidden="true" />
                  <span className="text-[12px] font-bold text-black/65 uppercase tracking-wider">Key decisions</span>
                </div>
                <ul className="space-y-2">
                  {data.keyDecisions.map((d, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <ArrowRight className="w-3 h-3 text-[#204CC7]/60 mt-1 flex-shrink-0" aria-hidden="true" />
                      <span className="text-[13px] leading-[1.5] text-black/70">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.actionItems.length > 0 && (
              <div className={`py-4 border-t border-black/[0.06] transition-all duration-300 ${revealIdx >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <ListChecks className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="text-[12px] font-bold text-black/65 uppercase tracking-wider">Action items</span>
                  <span className="ml-auto text-[11px] text-black/40 tabular-nums">
                    {data.actionItems.filter(a => a.status === 'done').length}/{data.actionItems.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {data.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 py-2 px-1 rounded-md hover:bg-black/[0.02] transition-colors">
                      {item.status === 'done'
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        : <CircleDot className="w-4 h-4 text-black/25 mt-0.5 flex-shrink-0" aria-hidden="true" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-[1.45] ${item.status === 'done' ? 'text-black/35 line-through' : 'text-black/75'}`}>
                          {item.text}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${getAvatarColor(item.ownerAvatar)}`}>
                            {item.ownerAvatar}
                          </div>
                          <span className={`text-[12px] ${item.status === 'done' ? 'text-black/30' : 'text-black/55'}`}>{item.owner}</span>
                          {item.due && item.due !== 'Done' && (
                            <>
                              <span className="text-black/15">·</span>
                              <span className={`text-[12px] font-medium ${item.due === 'ASAP' || item.due.includes('Today') ? 'text-[#E2445C]' : 'text-black/45'}`}>
                                {item.due}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {data && !loading && (
        <div className="px-5 py-3 border-t border-black/[0.06] flex items-center justify-between flex-shrink-0">
          <span className="text-[11px] text-black/40">AI-generated · {data.generatedAt}</span>
          <button
            type="button"
            onClick={onRegenerate}
            className="text-[12px] font-semibold text-[#7C3AED] hover:text-[#6d28d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30 rounded transition-colors"
          >
            Regenerate
          </button>
        </div>
      )}
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BROWSE CLIENTS MODAL — full directory with search + service filter.
   Keeps the sidebar lean by keeping 30+ clients out of sight until needed.
   ═══════════════════════════════════════════════════════════════════ */

function BrowseClientsModal({
  clients, pinnedIds, search, onSearchChange, serviceFilter, onServiceFilterChange,
  onTogglePin, onOpen, onClose,
}: {
  clients: Channel[];
  pinnedIds: Set<string>;
  search: string;
  onSearchChange: (v: string) => void;
  serviceFilter: 'all' | ClientService;
  onServiceFilterChange: (v: 'all' | ClientService) => void;
  onTogglePin: (id: string) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(c => {
      if (serviceFilter !== 'all' && c.service !== serviceFilter) return false;
      if (!q) return true;
      return c.companyName?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  }, [clients, search, serviceFilter]);

  const counts = useMemo(() => ({
    all: clients.length,
    PM: clients.filter(c => c.service === 'PM').length,
    AT: clients.filter(c => c.service === 'AT').length,
  }), [clients]);

  const filterPill = (value: 'all' | ClientService, label: string, count: number) => {
    const active = serviceFilter === value;
    const svc = value !== 'all' ? serviceMeta[value] : null;
    return (
      <button
        key={value}
        type="button"
        onClick={() => onServiceFilterChange(value)}
        className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
          active
            ? svc
              ? `${svc.chipBg} ${svc.chipText}`
              : 'bg-[#204CC7]/[0.10] text-[#204CC7]'
            : 'text-black/60 hover:bg-black/[0.04]'
        }`}
        aria-pressed={active}
      >
        {svc && <span className={`w-2 h-2 rounded-sm ${svc.dot}`} aria-hidden="true" />}
        {label}
        <span className={`text-[11px] font-semibold tabular-nums ${active ? '' : 'text-black/35'}`}>{count}</span>
      </button>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Browse client channels"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      style={{ animation: 'inboxFadeIn 140ms ease-out' }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-[560px] bg-white rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] flex flex-col overflow-hidden"
        style={{ maxHeight: '70vh' }}
      >
        {/* Header — search */}
        <div className="px-4 pt-4 pb-3 border-b border-black/[0.06]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search clients…"
              className="w-full h-10 pl-10 pr-10 rounded-lg border border-black/[0.08] text-body text-black/90 placeholder:text-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 focus-visible:border-[#204CC7]/30 transition-all"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-black/45 hover:bg-black/[0.05] hover:text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3">
            {filterPill('all', 'All', counts.all)}
            {filterPill('PM',  'Performance Marketing', counts.PM)}
            {filterPill('AT',  'Accounts & Taxation',   counts.AT)}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-caption text-black/50">No clients match your search.</p>
            </div>
          ) : (
            <ul role="list" className="space-y-0.5">
              {filtered.map(c => {
                const svc = c.service ? serviceMeta[c.service] : serviceMeta.PM;
                const pinned = pinnedIds.has(c.id);
                return (
                  <li key={c.id} className="group">
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className="w-full px-2.5 py-2 flex items-center gap-3 rounded-lg hover:bg-black/[0.03] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
                    >
                      <span className={`w-5 h-5 rounded-md ${svc.dot} flex-shrink-0`} aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-body font-semibold text-black/90 truncate">{c.companyName || c.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-[1px] rounded ${svc.chipBg} ${svc.chipText}`}>
                            {svc.label}
                          </span>
                          {c.hasMention && <span className="w-[6px] h-[6px] rounded-full bg-[#E2445C]" aria-label="Has mention" />}
                        </span>
                        <span className="block text-[12px] text-black/45 truncate mt-0.5">
                          #{c.name} · Last active {c.lastActive || 'recently'} · {c.members || 0} members
                        </span>
                      </span>
                      {c.unread > 0 && (
                        <span className="min-w-[20px] h-[20px] px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums bg-[#204CC7] text-white flex-shrink-0">
                          {c.unread}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onTogglePin(c.id); }}
                        aria-label={pinned ? `Unpin ${c.companyName}` : `Pin ${c.companyName}`}
                        title={pinned ? 'Unpin' : 'Pin to sidebar'}
                        className={`w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                          pinned
                            ? 'text-[#204CC7] hover:bg-[#204CC7]/10'
                            : 'text-black/35 opacity-0 group-hover:opacity-100 hover:bg-black/[0.05] hover:text-black/70'
                        }`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} aria-hidden="true" />
                      </button>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-black/[0.06] text-[11px] text-black/45 flex items-center justify-between bg-[#FAFAFB]">
          <span>{filtered.length} of {clients.length} clients</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-black/[0.1] bg-white text-[10px] font-semibold text-black/55">Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CREATE CHANNEL MODAL
   ═══════════════════════════════════════════════════════════════════
   Single modal for both internal (`#general`-style) and client channels.
   - Type selector at the top swaps the form below.
   - Names are auto-slugged so the user can type freely; we strip to
     [a-z0-9-] and dedupe-check against existing ids.
   - Admins are auto-included on every new channel via `roster()` so the
     creator never has to remember.
   - Validation is inline + non-blocking until submit; the Create button
     stays enabled so the form is forgiving to use. */
function CreateChannelModal({
  existingIds, onCreate, onClose,
}: {
  existingIds: string[];
  onCreate: (channel: Channel) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<'channel' | 'client'>('channel');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [service, setService] = useState<ClientService>('PM');
  const [submitted, setSubmitted] = useState(false);
  // Members the creator has explicitly chosen — admins + current user are
  // appended automatically at submit, so we never store them here. This keeps
  // the picker UI simple: every checked row in state is "extra people".
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);

  // Locked rows = current user + the three org admins. Always on the channel,
  // never togglable. Keeping this as a Set means we can `.has(id)` anywhere
  // without iterating.
  const lockedIds = useMemo(
    () => new Set<string>([CURRENT_USER_ID, ...ADMIN_IDS]),
    []
  );

  // Stable, alphabetised pool of "pickable" teammates for the list. Locked
  // people are pinned to the top and shown as read-only; everyone else is
  // toggleable below them.
  const allMembers = useMemo(() => {
    const list = Object.values(teamPool);
    return list.sort((a, b) => {
      const aLocked = lockedIds.has(a.id) ? 0 : 1;
      const bLocked = lockedIds.has(b.id) ? 0 : 1;
      if (aLocked !== bLocked) return aLocked - bLocked;
      return a.name.localeCompare(b.name);
    });
  }, [lockedIds]);

  const visibleMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return allMembers;
    return allMembers.filter(m =>
      m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
    );
  }, [allMembers, memberSearch]);

  const toggleMember = (id: string) => {
    if (lockedIds.has(id)) return;
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Total people on the channel after submit: locked (current user + admins) +
  // explicitly chosen extras. Used in the live count + footer button label.
  const totalMemberCount = lockedIds.size + selectedMemberIds.size;

  // Focus the most relevant first input depending on the selected kind so
  // keyboard users can start typing immediately.
  useEffect(() => {
    if (kind === 'channel') nameRef.current?.focus();
    else companyRef.current?.focus();
  }, [kind]);

  // Esc closes the modal; we attach once on mount.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const slugify = (raw: string) =>
    raw.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

  const slug = kind === 'channel' ? slugify(name) : slugify(companyName);
  const sourceLabel = kind === 'channel' ? name.trim() : companyName.trim();

  const nameError = (() => {
    if (!sourceLabel) return kind === 'channel' ? 'Channel name is required' : 'Company name is required';
    if (!slug) return 'Use letters or numbers';
    if (existingIds.includes(slug)) return 'A channel with this name already exists';
    return null;
  })();

  const showNameError = submitted && nameError;

  const handleSubmit = () => {
    setSubmitted(true);
    if (nameError) return;
    // Build the final roster: current user + chosen teammates, then `roster()`
    // dedupe-merges the org admins. Order from the picker is preserved so the
    // creator sees the people they added grouped together in the drawer.
    const seedIds = [CURRENT_USER_ID, ...Array.from(selectedMemberIds)];
    const finalRoster = roster(seedIds);
    if (kind === 'channel') {
      onCreate({
        id: slug,
        name: slug,
        kind: 'channel',
        description: description.trim() || undefined,
        isPrivate,
        unread: 0,
        roster: finalRoster,
        members: undefined,
      });
    } else {
      const company = companyName.trim();
      onCreate({
        id: slug,
        name: slug,
        kind: 'client',
        service,
        companyName: company,
        unread: 0,
        roster: finalRoster,
        members: undefined,
        lastActive: 'just now',
      });
    }
  };

  const TypeCard = ({ value, title, body, icon }: {
    value: 'channel' | 'client'; title: string; body: string; icon: React.ReactNode;
  }) => {
    const active = kind === value;
    return (
      <button
        type="button"
        onClick={() => setKind(value)}
        aria-pressed={active}
        className={`flex-1 text-left p-3.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
          active
            ? 'border-[#204CC7]/40 bg-[#204CC7]/[0.04] shadow-[0_0_0_3px_rgba(32,76,199,0.06)]'
            : 'border-black/[0.08] bg-white hover:border-black/[0.18] hover:bg-black/[0.015]'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-7 h-7 rounded-md flex items-center justify-center ${active ? 'bg-[#204CC7] text-white' : 'bg-black/[0.05] text-black/55'}`}>
            {icon}
          </span>
          <span className={`text-[13px] font-bold ${active ? 'text-[#204CC7]' : 'text-black/85'}`}>{title}</span>
        </div>
        <p className="text-[12px] text-black/55 leading-[1.45]">{body}</p>
      </button>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-channel-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      style={{ animation: 'inboxFadeIn 140ms ease-out' }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[520px] bg-white rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-black/[0.06] flex items-start justify-between">
          <div className="min-w-0">
            <h2 id="create-channel-title" className="text-h3 font-bold text-black">Create a channel</h2>
            <p className="text-[12px] text-black/55 mt-0.5">Channels organize conversations by team or client account.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 -mr-1 -mt-0.5 flex items-center justify-center rounded-md text-black/45 hover:bg-black/[0.05] hover:text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Type selector */}
          <div className="flex items-stretch gap-2.5">
            <TypeCard
              value="channel"
              title="Internal channel"
              body="For Brego teammates only — projects, ops, announcements."
              icon={<Hash className="w-3.5 h-3.5" />}
            />
            <TypeCard
              value="client"
              title="Client channel"
              body="A dedicated workspace for one client account."
              icon={<Users className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Internal-channel fields */}
          {kind === 'channel' ? (
            <>
              <div>
                <label htmlFor="cc-name" className="block text-[12px] font-semibold text-black/75 mb-1.5">
                  Channel name <span className="text-[#E2445C]">*</span>
                </label>
                <div className={`relative flex items-center rounded-lg border bg-white transition-all focus-within:ring-2 focus-within:ring-[#204CC7]/25 ${
                  showNameError ? 'border-[#E2445C]/45' : 'border-black/[0.12] focus-within:border-[#204CC7]/40'
                }`}>
                  <span className="pl-3 text-black/40 text-[14px] font-medium select-none">#</span>
                  <input
                    ref={nameRef}
                    id="cc-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. q2-planning"
                    maxLength={40}
                    className="flex-1 h-10 pl-1.5 pr-3 bg-transparent text-body text-black/90 placeholder:text-black/35 focus:outline-none"
                  />
                </div>
                {showNameError ? (
                  <p className="mt-1.5 text-[12px] text-[#E2445C] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {nameError}
                  </p>
                ) : (
                  slug && (
                    <p className="mt-1.5 text-[12px] text-black/45">Will appear as <span className="font-semibold text-black/70">#{slug}</span></p>
                  )
                )}
              </div>

              <div>
                <label htmlFor="cc-desc" className="block text-[12px] font-semibold text-black/75 mb-1.5">Description <span className="text-black/40 font-normal">(optional)</span></label>
                <input
                  id="cc-desc"
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What's this channel for?"
                  maxLength={120}
                  className="w-full h-10 px-3 rounded-lg border border-black/[0.12] bg-white text-body text-black/90 placeholder:text-black/35 focus:outline-none focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/25 transition-all"
                />
              </div>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-black/[0.08] bg-[#FAFAFB] cursor-pointer hover:border-black/[0.18] transition-colors">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-black/20 text-[#204CC7] focus:ring-[#204CC7]/40"
                />
                <div>
                  <div className="text-[13px] font-semibold text-black/85 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-black/55" aria-hidden="true" />
                    Make private
                  </div>
                  <p className="text-[12px] text-black/55 leading-[1.4] mt-0.5">
                    Only invited members can find and view this channel.
                  </p>
                </div>
              </label>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="cc-company" className="block text-[12px] font-semibold text-black/75 mb-1.5">
                  Client company <span className="text-[#E2445C]">*</span>
                </label>
                <input
                  ref={companyRef}
                  id="cc-company"
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Lenskart"
                  maxLength={60}
                  className={`w-full h-10 px-3 rounded-lg border bg-white text-body text-black/90 placeholder:text-black/35 focus:outline-none transition-all ${
                    showNameError
                      ? 'border-[#E2445C]/45 focus:border-[#E2445C]/55 focus:ring-2 focus:ring-[#E2445C]/20'
                      : 'border-black/[0.12] focus:border-[#204CC7]/40 focus:ring-2 focus:ring-[#204CC7]/25'
                  }`}
                />
                {showNameError ? (
                  <p className="mt-1.5 text-[12px] text-[#E2445C] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {nameError}
                  </p>
                ) : (
                  slug && (
                    <p className="mt-1.5 text-[12px] text-black/45">Channel id will be <span className="font-semibold text-black/70">{slug}</span></p>
                  )
                )}
              </div>

              <div>
                <span className="block text-[12px] font-semibold text-black/75 mb-1.5">Service line</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'PM' as ClientService, label: 'SEM',  description: 'Performance Marketing' },
                    { value: 'AT' as ClientService, label: 'A&T',  description: 'Accounts & Taxation' },
                  ]).map(opt => {
                    const meta = serviceMeta[opt.value];
                    const active = service === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setService(opt.value)}
                        aria-pressed={active}
                        className={`h-12 px-3 rounded-lg border inline-flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 ${
                          active
                            ? `${meta.chipBg} border-transparent`
                            : 'border-black/[0.1] bg-white hover:border-black/[0.2]'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-sm ${meta.dot}`} aria-hidden="true" />
                        <span className={`text-[13px] font-bold ${active ? meta.chipText : 'text-black/85'}`}>{opt.label}</span>
                        <span className={`text-[12px] ${active ? meta.chipText + ' opacity-80' : 'text-black/50'}`}>{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Members picker ──
              Locked rows (current user + 3 admins) sit on top, visually muted
              and non-interactive. The rest of the team is below as toggleable
              rows. The whole list scrolls inside its own container so the modal
              footer stays anchored. */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="block text-[12px] font-semibold text-black/75">Members</span>
              <span className="text-[11px] text-black/45 tabular-nums">
                {totalMemberCount} {totalMemberCount === 1 ? 'person' : 'people'} will join
              </span>
            </div>
            <div className="rounded-lg border border-black/[0.1] bg-white overflow-hidden">
              <div className="relative border-b border-black/[0.06]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/40" aria-hidden="true" />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search teammates by name or role"
                  className="w-full h-9 pl-9 pr-3 text-[13px] text-black/85 placeholder:text-black/35 bg-transparent focus:outline-none"
                />
              </div>
              <ul className="max-h-[180px] overflow-y-auto" role="listbox" aria-label="Add teammates">
                {visibleMembers.length === 0 ? (
                  <li className="px-3 py-4 text-center text-[12px] text-black/45">No teammates match "{memberSearch}"</li>
                ) : visibleMembers.map(m => {
                  const locked = lockedIds.has(m.id);
                  const isSelf = m.id === CURRENT_USER_ID;
                  const checked = locked || selectedMemberIds.has(m.id);
                  return (
                    <li key={m.id}>
                      <label
                        className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${
                          locked
                            ? 'bg-[#FAFAFB] cursor-default'
                            : 'hover:bg-black/[0.025] cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggleMember(m.id)}
                          className="w-4 h-4 rounded border-black/20 text-[#204CC7] focus:ring-[#204CC7]/40 disabled:opacity-60"
                          aria-label={`${checked ? 'Remove' : 'Add'} ${m.name}`}
                        />
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${getAvatarColor(m.initials)}`} aria-hidden="true">
                          {m.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-black/85 truncate">
                              {m.name}{isSelf && <span className="text-black/45 font-normal"> (You)</span>}
                            </span>
                            {m.online && <span className="w-1.5 h-1.5 rounded-full bg-[#00C875] flex-shrink-0" aria-label="Online" />}
                          </div>
                          <p className="text-[11px] text-black/55 truncate">{m.role}</p>
                        </div>
                        {m.isAdmin && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#204CC7] bg-[#204CC7]/[0.08] px-1.5 py-[2px] rounded flex-shrink-0">
                            <ShieldCheck className="w-2.5 h-2.5" aria-hidden="true" />
                            Admin
                          </span>
                        )}
                        {locked && !m.isAdmin && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/45 flex-shrink-0">You</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-1.5 text-[11px] text-black/50 flex items-start gap-1">
              <ShieldCheck className="w-3 h-3 text-[#204CC7] flex-shrink-0 mt-[2px]" aria-hidden="true" />
              Tejas, Mihir, and Harshal are added automatically as channel admins.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-black/[0.06] bg-[#FAFAFB] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-black/65 hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="h-9 px-4 rounded-md text-[13px] font-semibold bg-[#204CC7] text-white hover:bg-[#1a3fa3] inline-flex items-center gap-1.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/40 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Create with {totalMemberCount} {totalMemberCount === 1 ? 'member' : 'members'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DELETE CHANNEL CONFIRM
   ═══════════════════════════════════════════════════════════════════
   Destructive action — deliberately friction-light (single confirm button)
   but visually loud (red leading icon + red action). For a production app
   we'd add a type-to-confirm step for client channels, but in the demo
   the toast-undo pattern doesn't apply since deletes are immediate. */
function DeleteChannelConfirm({
  channel, onConfirm, onClose,
}: {
  channel: Channel;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isClient = channel.kind === 'client';
  const label = isClient ? (channel.companyName || channel.name) : `#${channel.name}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-channel-title"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4"
      style={{ animation: 'inboxFadeIn 140ms ease-out' }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[440px] bg-white rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-black/[0.06] overflow-hidden">
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-[#E2445C]/[0.10] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#E2445C]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="delete-channel-title" className="text-h3 font-bold text-black">
              Delete <span className="text-[#E2445C]">{label}</span>?
            </h2>
            <p className="text-body text-black/65 mt-1.5 leading-[1.5]">
              This channel and all of its messages, files, and pinned items will be permanently removed.
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-black/[0.06] bg-[#FAFAFB] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-black/65 hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#204CC7]/30 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="h-9 px-4 rounded-lg text-[13px] font-semibold bg-[#E2445C] text-white hover:bg-[#c43a4f] inline-flex items-center gap-1.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2445C]/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Delete channel
          </button>
        </div>
      </div>
    </div>
  );
}

/* Re-export Bell + Headphones to silence unused-import linter without affecting tree shake */
export const __unused = { Bell, Headphones, ChevronUp, ChevronDown };
