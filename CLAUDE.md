# CLAUDE.md — Brego Business Backend

> Employee-facing admin platform built by **Momin** (anas@bregobusiness.com) at Brego Business.
> This file captures the full project state so any new Claude session can pick up seamlessly.

---

## 1. Tech Stack

- **Framework:** Next.js (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS (utility-first, no component library except shadcn primitives)
- **Icons:** Lucide React (primary), Material Symbols Outlined (navigation only)
- **Font:** Manrope (all weights 300–700)
- **Package manager:** npm

---

## 2. Design System — Mandatory Rules

### Typography tokens (defined in `tailwind.config.js`)
| Token        | Size  | Weight | Use                        |
|-------------|-------|--------|----------------------------|
| `text-h1`   | 24px  | 700    | Page titles                |
| `text-h2`   | 20px  | 700    | Section headings           |
| `text-h3`   | 16px  | 600    | Sub-headings               |
| `text-body` | 14px  | 400    | Body text (minimum size)   |
| `text-caption`| 13px | 500   | Captions, labels           |

**`text-micro` (10.5px) is FORBIDDEN in UI.** Minimum allowed font size is **13px**.

### Brand colours
| Name           | Hex       | Use                     |
|---------------|-----------|-------------------------|
| Primary Blue  | `#204CC7` | CTAs, active states, brand |
| Green         | `#00C875` | Success, positive       |
| Orange        | `#FDAB3D` | Warnings                |
| Red           | `#E2445C` | Destructive, errors     |
| PM Purple     | `#7C3AED` | Performance Marketing   |
| A&T Cyan      | `#06B6D4` | Accounts & Taxation     |

### Spacing
8px grid system: `sp-1` (4px) through `sp-8` (40px). Defined as CSS variables and Tailwind tokens.

### Border radius
`sm` = 6px, `md` = 8px, `lg` = 12px, `full` = 999px.

---

## 3. Layout Conventions

- **Navigation bar:** 52px height + 1px bottom border = **53px total**. Defined in `components/navigation.tsx`.
- **Full-page layout:** Always use `h-[calc(100vh-53px)]` for content below nav. Never use `h-full` (it depends on parent constraints).
- **Sidebar + content pattern:** 240–260px fixed left sidebar + flex-1 scrollable right area. Used in Inbox, Profile, Dataroom.
- **Drawer pattern:** Right-side panels are 360px wide, slide in with CSS keyframe animation:
  ```css
  @keyframes slideIn {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  ```
- **Progressive reveal:** Sections fade in with staggered `setTimeout` (300ms intervals) using opacity + translate-y transitions.

---

## 4. Navigation & Routes

Defined in `components/navigation.tsx`:

| Route               | Label     | Module                    |
|---------------------|-----------|---------------------------|
| `/dashboard`        | Dashboard | Overview.tsx              |
| `/inbox`            | Inbox     | Inbox.tsx                 |
| `/reports`          | Reports   | Various report components |
| `/workspace`        | Workspace | TaskManagement, A&T, PM   |
| `/dataroom`         | Dataroom  | Dataroom.tsx              |
| `/profile`          | Profile   | ProfileSettings.tsx       |
| `/adminland`        | Adminland | Adminland.tsx             |

---

## 5. Module Status & Key Decisions

### Inbox (`Inbox.tsx`, ~500 lines)
- **Design reference:** Slack Web App
- Slack-like layout: 248px sidebar with collapsible channel categories, main chat area, fixed composer
- Message grouping: avatar gutter for first message, timestamp-only for consecutive same-sender messages
- AI Summary feature: "Summarize" CTA opens a **360px right drawer** (ClickUp-style) with structured breakdown
- Summary data model includes: overview, keyDecisions, actionItems, topics, participants, sentiment, messageRange
- Progressive reveal animation (5 sections, 300ms stagger)
- Loading skeleton with pulse animation
- **Status:** Complete

### Profile Settings (`ProfileSettings.tsx`)
- **Design reference:** World-class settings page (not a modal)
- Dedicated full-page layout with 260px left sidebar containing profile hero card + 4 nav tabs
- Tabs: Profile (editable personal info + read-only org section), Security (password strength meter, active sessions), Notifications (3 grouped sections), Status (live preview + radio cards)
- Password strength helper: 4-bar meter (Weak/Fair/Good/Strong)
- No longer accepts `onClose` prop (optional in interface for backward compat)
- **Status:** Complete

### Task Management (`workspace/TaskManagement.tsx`)
- My Assignments widget with functional **Today / This Week** filter buttons
- Filter uses state `assignmentFilter: 'today' | 'thisWeek'`
- Task list wrapped in IIFE pattern `{(() => { const displayTasks = ...; return (<>...</>); })()}` to scope filter-dependent variables
- Date reference: `todayISO = '2026-03-18'` (from `task-data.ts`)
- **Status:** Complete (filter feature)

### Dataroom (`Dataroom.tsx`, ~850 lines)
- **Design reference:** Google Drive (will use Google Drive API)
- Google Drive-like file browser with workspace switcher (A&T, PM, Brego Group)
- Sidebar: Quick Access nav, Folder Tree, Owner Filter, Storage indicator
- Main content: breadcrumb nav, search, list/grid view toggle, sortable columns, bulk actions bar
- Nested folder navigation via `parentId` relationships + breadcrumb array
- New folder modal, Upload modal with drag-and-drop zone
- **Activity drawer** (360px right panel): opened via History button in header, shows Today/Earlier sections with staggered slide-in animation, action-type icons, workspace summary card with file/folder/shared/storage stats
- Inline activity log has been **removed** (activity lives only in the drawer now)
- Header bar: h-[56px], generous spacing, 260px search, 36px buttons
- Table rows: h-[50px] data rows, h-[42px] column headers, px-5 horizontal padding
- **Status:** Complete

### Reports
- Multiple report modules: `SalesReport.tsx`, `CLAReport.tsx`, `AttritionReport.tsx`, `GrowthPLReport.tsx`, `MarginReportData.ts`
- Not recently modified in this session

### Adminland (`Adminland.tsx`)
- Not modified in this session

---

## 6. Brego Business Context

### Team members (used in mock data across modules)
| Name            | Role           | Initials | Colour    |
|----------------|----------------|----------|-----------|
| Tejas Atha     | COO            | TA       | `#3B82F6` |
| Chinmay Pawar  | PM HOD         | CP       | `#7C3AED` |
| Zubear Shaikh  | A&T HOD        | ZS       | `#06B6D4` |
| Mihir L.       | Admin          | ML       | `#F59E0B` |
| Harshal R.     | Operations     | HR       | `#10B981` |

### Services
- **Performance Marketing (PM)** — colour `#7C3AED`
- **Accounts & Taxation (A&T)** — colour `#06B6D4`
- **Brego Group (BG)** — colour `#204CC7`

### Workstations
Mumbai HQ, Remote, Goa Office, Alibag Office, Hybrid

---

## 7. File Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout with Navigation
│   ├── page.tsx                # Landing redirect
│   ├── globals.css             # Design system CSS variables
│   ├── dashboard/page.tsx
│   ├── inbox/page.tsx          # Imports <Inbox />
│   ├── profile/page.tsx        # Imports <ProfileSettings />
│   ├── dataroom/page.tsx       # Imports <Dataroom />
│   ├── workspace/              # Workspace sub-routes
│   ├── reports/                # Report sub-routes
│   └── adminland/              # Adminland sub-routes
├── components/
│   ├── navigation.tsx          # 52px top nav bar
│   ├── status-badge.tsx        # Reusable status badge
│   └── ui/                     # shadcn primitives
├── workspace/
│   ├── TaskManagement.tsx      # Task board + My Assignments
│   ├── AccountsTaxation.tsx    # A&T workspace
│   ├── PerformanceMarketing.tsx# PM workspace
│   ├── task-data.ts            # Task types & mock data
│   └── shared/                 # Shared workspace components
├── Inbox.tsx                   # Slack-like messaging
├── ProfileSettings.tsx         # Full-page settings
├── Dataroom.tsx                # Google Drive-like file browser
├── Overview.tsx                # Dashboard
├── Adminland.tsx               # Admin panel
├── Guidelines.md               # Typography rules
├── tailwind.config.js          # Design tokens
├── next.config.ts              # Next.js config
└── CLAUDE.md                   # This file
```

---

## 8. Known Pre-Existing TypeScript Errors

These two errors exist and are **not** caused by recent work:

1. `next.config.ts(5,3)` — `'dev' does not exist in type 'NextConfig'`
2. `workspace/AccountsTaxation.tsx(522,204)` — `Property 'name' does not exist on type '{ initials: string; color: string; }'`

Always verify with `npx tsc --noEmit` after changes. Only these two should appear.

---

## 9. Design Principles (Momin's Direction)

- **"Clean and intuitive"** — minimal chrome, generous whitespace, no visual clutter
- **"World-class"** — production-quality UI, not prototypey
- **"Realistic"** — mock data should reflect actual Brego team, clients, and business context
- **WCAG accessibility** — proper `aria-*` attributes, keyboard navigation, contrast ratios
- **Full-page layouts over modals** for important flows (e.g., Profile was migrated from modal to dedicated page)
- **Reference-driven design** — Momin provides reference apps (Slack, ClickUp, Monday.com, Google Drive) and expects the UI to match that quality level
- **Breathing room** — elements should never feel cramped; generous padding, taller rows, wider search bars
