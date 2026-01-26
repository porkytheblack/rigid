# Taka UI Specification

## Design Language & Visual System

---

## Design Philosophy

**"Stay out of the way."**

Taka's interface should feel like it barely exists. The focus is always on your content—your checklists, your recordings, your issues. Chrome is minimal. Surfaces are quiet. Actions are fast.

Three principles guide every design decision:

1. **Density without clutter** — Show information tightly, but never overwhelm. Every pixel earns its place.

2. **Keyboard-first, mouse-friendly** — Power users live on the keyboard. Everyone else shouldn't notice.

3. **Instant feedback** — Every action feels immediate. No spinners unless absolutely necessary. Optimistic updates everywhere.

---

## Design Tokens

### Color Palette

Taka uses a neutral base with a single accent color. The palette is designed for long sessions—easy on the eyes, high contrast where it matters.

#### Background Layers

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#0F0F0F` | App background |
| `--bg-surface` | `#171717` | Cards, panels, dropdowns |
| `--bg-elevated` | `#1F1F1F` | Modals, popovers, tooltips |
| `--bg-hover` | `#262626` | Hover states on interactive elements |
| `--bg-active` | `#2E2E2E` | Active/pressed states |

#### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#EFEFEF` | Headings, primary content |
| `--text-secondary` | `#A0A0A0` | Descriptions, metadata, placeholders |
| `--text-tertiary` | `#6B6B6B` | Disabled states, subtle hints |
| `--text-inverse` | `#0F0F0F` | Text on accent backgrounds |

#### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | `#262626` | Dividers, card borders |
| `--border-default` | `#333333` | Input borders, separators |
| `--border-strong` | `#444444` | Focus rings, emphasis |

#### Accent

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#6366F1` | Primary actions, links, focus states |
| `--accent-hover` | `#818CF8` | Hover on accent elements |
| `--accent-muted` | `#6366F120` | Accent backgrounds (20% opacity) |

#### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--status-success` | `#22C55E` | Verified, fixed, passing |
| `--status-warning` | `#F59E0B` | In progress, needs attention |
| `--status-error` | `#EF4444` | Failed, broken, critical |
| `--status-info` | `#3B82F6` | Informational highlights |

#### Tag Colors

A muted palette for user-assignable tags:

| Token | Value |
|-------|-------|
| `--tag-gray` | `#52525B` |
| `--tag-red` | `#7F1D1D` |
| `--tag-orange` | `#7C2D12` |
| `--tag-yellow` | `#713F12` |
| `--tag-green` | `#14532D` |
| `--tag-blue` | `#1E3A5F` |
| `--tag-purple` | `#4C1D95` |
| `--tag-pink` | `#831843` |

---

### Typography

One typeface. Clear hierarchy. No decorative fonts.

#### Font Family

| Token | Value |
|-------|-------|
| `--font-sans` | `'Inter', -apple-system, BlinkMacSystemFont, sans-serif` |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', monospace` |

#### Font Sizes

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `--text-xs` | `11px` | `16px` | Badges, timestamps, tiny labels |
| `--text-sm` | `12px` | `18px` | Secondary text, metadata |
| `--text-base` | `13px` | `20px` | Body text, default |
| `--text-md` | `14px` | `22px` | Emphasized body, input text |
| `--text-lg` | `16px` | `24px` | Section headers |
| `--text-xl` | `20px` | `28px` | Page titles |
| `--text-2xl` | `24px` | `32px` | Modal titles, onboarding |

#### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | `400` | Body text |
| `--font-medium` | `500` | Labels, buttons, emphasis |
| `--font-semibold` | `600` | Headings, strong emphasis |

---

### Spacing

An 4px base unit. Consistent rhythm throughout.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight gaps, inline spacing |
| `--space-2` | `8px` | Icon gaps, compact padding |
| `--space-3` | `12px` | Default padding, list gaps |
| `--space-4` | `16px` | Card padding, section gaps |
| `--space-5` | `20px` | Comfortable breathing room |
| `--space-6` | `24px` | Section separation |
| `--space-8` | `32px` | Major section breaks |
| `--space-10` | `40px` | Page-level spacing |
| `--space-12` | `48px` | Large containers |

---

### Radii

Subtle rounding. Never bubbly.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `4px` | Badges, small buttons |
| `--radius-md` | `6px` | Buttons, inputs, cards |
| `--radius-lg` | `8px` | Modals, large cards |
| `--radius-full` | `9999px` | Pills, avatars, circular elements |

---

### Shadows

Minimal shadows. Elevation through layered backgrounds, not drop shadows.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Dropdowns, popovers |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modals |

---

### Motion

Fast and subtle. Animation should feel like polish, not performance.

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-instant` | `50ms` | Immediate feedback (hover states) |
| `--duration-fast` | `100ms` | Micro-interactions |
| `--duration-normal` | `150ms` | Standard transitions |
| `--duration-slow` | `250ms` | Modals, larger movements |
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | General purpose |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |

---

## Layout Structure

### App Shell

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (240px)  │  Main Content                           │
│                   │                                         │
│  ┌─────────────┐  │  ┌───────────────────────────────────┐  │
│  │ App Title   │  │  │ Page Header                       │  │
│  │ + Project   │  │  │ Title + Actions                   │  │
│  └─────────────┘  │  └───────────────────────────────────┘  │
│                   │                                         │
│  Navigation       │  ┌───────────────────────────────────┐  │
│  ├─ Dashboard     │  │                                   │  │
│  ├─ Checklist     │  │  Content Area                     │  │
│  ├─ Sessions      │  │                                   │  │
│  ├─ Issues        │  │  (scrollable)                     │  │
│  ├─ Codex         │  │                                   │  │
│  └─ Screenshots   │  │                                   │  │
│                   │  │                                   │  │
│  ───────────────  │  │                                   │  │
│                   │  │                                   │  │
│  Quick Actions    │  │                                   │  │
│  ├─ New Issue     │  │                                   │  │
│  ├─ Screenshot    │  │                                   │  │
│  └─ Record        │  └───────────────────────────────────┘  │
│                   │                                         │
│  ───────────────  │                                         │
│  Settings         │                                         │
└─────────────────────────────────────────────────────────────┘
```

**Sidebar:** Fixed width, collapsible to icons only (56px). Houses all navigation and quick actions.

**Main Content:** Flexible width, scrollable. Contains page header and content area.

**No nested scrolling.** Only the main content area scrolls. Sidebar is fixed.

---

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| `≥1200px` | Full layout, sidebar expanded |
| `900–1199px` | Sidebar collapsed to icons |
| `<900px` | Sidebar becomes overlay drawer |

---

## Navigation

### Sidebar Navigation

Each nav item shows:
- Icon (16px)
- Label
- Optional count badge (for issues, pending items)

**States:**
- Default: `--text-secondary`, no background
- Hover: `--bg-hover`
- Active: `--bg-active`, `--text-primary`, accent left border (2px)

**Keyboard:**
- `↑` / `↓` to move between items
- `Enter` to select
- `1-6` to jump directly to section (when sidebar focused)

---

### Command Palette

The heart of keyboard navigation. Triggered by `⌘K` (Mac) or `Ctrl+K` (Windows/Linux).

```
┌────────────────────────────────────────────────┐
│ 🔍  Type a command or search...                │
├────────────────────────────────────────────────┤
│  Recent                                        │
│  ├─ Payment flow bug #47                       │
│  ├─ Session: v0.4 testing                      │
│  └─ Auth flow (Codex)                          │
│                                                │
│  Actions                                       │
│  ├─ New issue                          ⌘I      │
│  ├─ Take screenshot                    ⌘⇧S     │
│  ├─ Start recording                    ⌘⇧R     │
│  ├─ New checklist item                 ⌘⇧N     │
│  └─ New codex entry                    ⌘⇧D     │
│                                                │
│  Navigation                                    │
│  ├─ Go to Dashboard                    ⌘1      │
│  ├─ Go to Checklist                    ⌘2      │
│  ├─ Go to Sessions                     ⌘3      │
│  └─ ...                                        │
└────────────────────────────────────────────────┘
```

**Behavior:**
- Opens centered, 480px wide
- Fuzzy search across all content and commands
- Results grouped by type
- `↑` / `↓` to navigate, `Enter` to select, `Esc` to close
- Recent items shown by default before typing

---

### Breadcrumbs

For nested views (e.g., viewing a specific session or issue):

```
Sessions  /  v0.4 Testing Session  /  Annotation #3
```

Each segment is clickable. Keyboard: `⌘[` to go back one level.

---

## Core Views

### Dashboard

The home view. Shows app health at a glance.

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                           ⌘1     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ Checklist       │  │ Open Issues     │  │ Codex       │  │
│  │                 │  │                 │  │             │  │
│  │  12/18 passing  │  │  7 open         │  │  8 entries  │  │
│  │  ████████░░░░   │  │  3 critical     │  │  2 drafts   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│                                                             │
│  Recent Sessions                                    See all │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔴 v0.4 Testing Session           Today, 2:34 PM     │   │
│  │    3 annotations · 2 issues created                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ⚪ v0.4 Quick Verify               Today, 11:20 AM   │   │
│  │    1 annotation · Payment fix verified               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ⚪ v0.3 Full Regression            Yesterday         │   │
│  │    8 annotations · 4 issues created                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Critical Issues                                    See all │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔴 #47  Payment confirmation unresponsive   v0.4     │   │
│  │ 🔴 #45  Dashboard chart not rendering       v0.4     │   │
│  │ 🔴 #38  Auth token not refreshing           v0.3     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Stat cards:** Clickable, navigate to respective section.

**Lists:** Show 3-5 most relevant items. "See all" links to full view.

---

### Checklist View

```
┌─────────────────────────────────────────────────────────────┐
│  Checklist                                    + Add Item    │
│  18 items · 12 passing · 4 failing · 2 untested            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: All ▾     Tags: auth, payments ×      v0.4 ▾      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth                                                │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ✓  User can sign up with email              auth     │   │
│  │ ✓  User can log in                          auth     │   │
│  │ ✗  Token refreshes automatically            auth     │   │
│  │ ○  Password reset flow works                auth     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Payments                                            │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ✓  Payment form accepts valid cards        payments  │   │
│  │ ✗  Confirmation shows after payment        payments  │   │
│  │ ✓  Receipt email is sent                   payments  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Status indicators:**
- `✓` Green — Passing/verified
- `✗` Red — Failing/broken
- `○` Gray — Untested

**Interactions:**
- Click checkbox area to cycle status
- Click item text to expand details
- Drag to reorder
- Right-click for context menu (edit, delete, link to issue)

**Keyboard:**
- `↑` / `↓` navigate items
- `Space` cycle status
- `Enter` expand/collapse
- `E` quick edit
- `⌘⌫` delete

---

### Sessions View

```
┌─────────────────────────────────────────────────────────────┐
│  Sessions                                    Start Recording│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: All ▾     Version: v0.4 ▾     Sort: Newest ▾      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ┌────────┐                                          │   │
│  │  │ ▶ 🎬   │  v0.4 Testing Session                   │   │
│  │  │  4:32  │  Today, 2:34 PM · 3 annotations         │   │
│  │  └────────┘                                          │   │
│  │             Tags: auth, payments, dashboard          │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  ┌────────┐                                          │   │
│  │  │ ▶ 🎬   │  v0.4 Quick Verify                      │   │
│  │  │  1:15  │  Today, 11:20 AM · 1 annotation         │   │
│  │  └────────┘                                          │   │
│  │             Tags: payments                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Session card:**
- Thumbnail preview of recording
- Duration
- Timestamp
- Annotation count
- Tags

**Click to enter session detail view.**

---

### Session Detail View

```
┌─────────────────────────────────────────────────────────────┐
│  ← Sessions  /  v0.4 Testing Session                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │                                                      │   │
│  │                  Video Player                        │   │
│  │                                                      │   │
│  │                                                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  ▶  ──●────────────────────────────  1:24 / 4:32    │   │
│  │       🔴        🔴              🔴                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Annotations                               + Add Annotation │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔴 0:47  Dashboard chart not rendering              │   │
│  │          "Blank space where chart should be"         │   │
│  │          → Issue #45                                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 🔴 2:15  Payment confirmation unresponsive          │   │
│  │          "Click does nothing, no error shown"        │   │
│  │          → Issue #47                                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 🟡 3:58  Slow load on user list                     │   │
│  │          "Takes 3+ seconds, needs investigation"     │   │
│  │          No linked issue                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Video player:**
- Standard controls (play/pause, scrub, speed)
- Annotation markers on timeline (colored dots)
- Click marker to jump to that moment

**Annotation list:**
- Timestamp (clickable, jumps video)
- Title
- Description preview
- Linked issue (if created)

**Keyboard:**
- `Space` play/pause
- `←` / `→` skip 5 seconds
- `⇧←` / `⇧→` skip 15 seconds
- `A` add annotation at current time
- `↑` / `↓` navigate annotations
- `Enter` jump to selected annotation

---

### Issues View

```
┌─────────────────────────────────────────────────────────────┐
│  Issues                                        + New Issue  │
│  7 open · 12 fixed · 3 verified                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: Open ▾    Priority: All ▾    Tags: All ▾          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🔴 #47  Payment confirmation unresponsive            │   │
│  │         payments · v0.4 · critical                   │   │
│  │         Created today from Session "v0.4 Testing"    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 🔴 #45  Dashboard chart not rendering                │   │
│  │         dashboard · v0.4 · critical                  │   │
│  │         Created today from Session "v0.4 Testing"    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 🟡 #44  Slow load on user list                       │   │
│  │         dashboard · v0.4 · minor                     │   │
│  │         Created today from Session "v0.4 Testing"    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 🔴 #38  Auth token not refreshing                    │   │
│  │         auth · v0.3 · critical                       │   │
│  │         Created 3 days ago · Screenshot attached     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Issue row:**
- Priority indicator (color)
- Issue number
- Title
- Tags, version, priority label
- Source (session, screenshot, manual)

**Click to open issue detail.**

---

### Issue Detail View

```
┌─────────────────────────────────────────────────────────────┐
│  ← Issues  /  #47 Payment confirmation unresponsive         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Status: Open ▾         Priority: Critical ▾               │
│  Tags: payments ×  +    Version: v0.4 ▾                    │
│  Codex: Payment Flow ▾                                      │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  Description                                         Edit   │
│  Clicking the confirm button on the payment form does       │
│  nothing. No loading state, no error message, no response.  │
│  The button appears to accept the click but nothing         │
│  happens afterward.                                         │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  Evidence                                                   │
│  ┌────────────────────────────────────┐                     │
│  │  📹 Recording clip (0:12)          │                     │
│  │  From: v0.4 Testing Session @ 2:15 │                     │
│  └────────────────────────────────────┘                     │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  Copy as Prompt                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  The payment confirmation button is unresponsive...  │   │
│  │                                          📋 Copy     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  Activity                                                   │
│  · Created from session annotation — Today, 2:34 PM        │
│  · Linked to Codex entry "Payment Flow" — Today, 3:15 PM   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key sections:**
- Metadata bar (status, priority, tags, version, codex link)
- Description (editable)
- Evidence (screenshot or recording clip)
- "Copy as Prompt" — pre-formatted for AI assistants
- Activity log

---

### Codex View

```
┌─────────────────────────────────────────────────────────────┐
│  Codex                                        + New Entry   │
│  8 entries · 2 drafts                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search codex...                                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📘  Auth Flow                               auth     │   │
│  │     How login, signup, and token refresh work        │   │
│  │     3 linked issues · Updated today                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 📘  Payment Flow                         payments    │   │
│  │     Stripe integration and confirmation logic        │   │
│  │     2 linked issues · Updated today                  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 📘  Dashboard Data Loading                dashboard  │   │
│  │     How charts and stats are fetched                 │   │
│  │     1 linked issue · Updated yesterday               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ 📝  User Permissions                         draft   │   │
│  │     [Draft] Role-based access control                │   │
│  │     No linked issues · Created 2 days ago            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Entry row:**
- Icon (📘 complete, 📝 draft)
- Title
- Description preview
- Tags
- Linked issue count
- Last updated

---

### Codex Entry Detail

```
┌─────────────────────────────────────────────────────────────┐
│  ← Codex  /  Payment Flow                            Edit   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tags: payments × stripe ×  +                               │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  What it does                                               │
│  Handles the complete payment flow from cart to             │
│  confirmation, including Stripe checkout integration.       │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  How it works                                               │
│  1. User clicks "Pay" on cart page                          │
│  2. Frontend calls /api/checkout/session                    │
│  3. Backend creates Stripe checkout session                 │
│  4. User redirected to Stripe hosted checkout               │
│  5. On success, Stripe webhooks hit /api/webhooks/stripe    │
│  6. Backend updates order status, sends confirmation email  │
│  7. User redirected to /order/[id]/confirmation             │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  Key files                                                  │
│  · /app/api/checkout/session/route.ts                       │
│  · /app/api/webhooks/stripe/route.ts                        │
│  · /components/PaymentButton.tsx                            │
│  · /lib/stripe.ts                                           │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  Gotchas                                                    │
│  · Webhook must verify Stripe signature                     │
│  · Local testing requires Stripe CLI forwarding             │
│  · Confirmation page polls for order status                 │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  Linked Issues                                              │
│  · #47 Payment confirmation unresponsive (open)             │
│  · #32 Webhook timeout on slow connections (fixed)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Markdown supported in all text fields.**

---

### Screenshots View

```
┌─────────────────────────────────────────────────────────────┐
│  Screenshots                                 + Take Screenshot│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: All ▾     Tags: All ▾     Version: All ▾          │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │          │  │          │  │          │  │          │    │
│  │   IMG    │  │   IMG    │  │   IMG    │  │   IMG    │    │
│  │          │  │          │  │          │  │          │    │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤    │
│  │ Chart    │  │ Mobile   │  │ Login    │  │ Form     │    │
│  │ missing  │  │ nav      │  │ error    │  │ layout   │    │
│  │ Today    │  │ Today    │  │ Yest.    │  │ Yest.    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │          │  │          │  │          │                  │
│  │   IMG    │  │   IMG    │  │   IMG    │                  │
│  │          │  │          │  │          │                  │
│  ├──────────┤  ├──────────┤  ├──────────┤                  │
│  │ Tooltip  │  │ Empty    │  │ Loading  │                  │
│  │ clipped  │  │ state    │  │ spinner  │                  │
│  │ 2d ago   │  │ 3d ago   │  │ 3d ago   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Grid layout** for visual scanning.

**Click to open screenshot detail** with annotations and linked issue.

---

## Components

### Buttons

**Variants:**

| Variant | Background | Text | Usage |
|---------|------------|------|-------|
| Primary | `--accent` | `--text-inverse` | Main actions |
| Secondary | `--bg-surface` | `--text-primary` | Secondary actions |
| Ghost | Transparent | `--text-secondary` | Tertiary, inline actions |
| Danger | `--status-error` | `--text-inverse` | Destructive actions |

**Sizes:**

| Size | Height | Padding | Font |
|------|--------|---------|------|
| Small | `28px` | `8px 12px` | `--text-sm` |
| Medium | `32px` | `8px 16px` | `--text-base` |
| Large | `40px` | `12px 20px` | `--text-md` |

**States:** Default → Hover → Active → Disabled

---

### Inputs

**Text input:**
- Height: `32px`
- Background: `--bg-surface`
- Border: `--border-default`
- Focus: `--accent` border, subtle glow

**Textarea:**
- Min height: `80px`
- Auto-grows with content

**Select/Dropdown:**
- Same styling as text input
- Chevron indicator
- Dropdown uses `--bg-elevated`

---

### Tags

Small, pill-shaped labels.

- Height: `20px`
- Padding: `2px 8px`
- Font: `--text-xs`
- Background: Tag color at 20% opacity
- Border: Tag color at 40% opacity
- Text: Tag color lightened

**Removable tags** show × on hover.

---

### Badges

For counts and status indicators.

- Height: `18px`
- Min-width: `18px` (circular for single digit)
- Font: `--text-xs`, `--font-medium`
- Background: `--bg-hover` (neutral) or status color (semantic)

---

### Cards

```
┌────────────────────────────────────────┐
│  Card content                          │  ← --space-4 padding
│                                        │
│                                        │
└────────────────────────────────────────┘
```

- Background: `--bg-surface`
- Border: `--border-subtle`
- Radius: `--radius-md`
- Hover (if interactive): `--border-default`, subtle lift

---

### Tooltips

- Background: `--bg-elevated`
- Text: `--text-primary`
- Padding: `4px 8px`
- Font: `--text-sm`
- Radius: `--radius-sm`
- Shadow: `--shadow-md`
- Delay: 300ms before showing

---

### Modals

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│     ┌──────────────────────────────────────────────┐       │
│     │  Modal Title                            ✕    │       │
│     ├──────────────────────────────────────────────┤       │
│     │                                              │       │
│     │  Modal content                               │       │
│     │                                              │       │
│     │                                              │       │
│     ├──────────────────────────────────────────────┤       │
│     │                      Cancel     Confirm      │       │
│     └──────────────────────────────────────────────┘       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

- Backdrop: Black at 60% opacity
- Modal background: `--bg-elevated`
- Max-width: `480px` (small), `640px` (medium), `800px` (large)
- Shadow: `--shadow-lg`
- Animation: Fade in + slight scale up (150ms)
- Close: `Esc` key, click backdrop, or × button

---

### Context Menus

Right-click menus and dropdown menus.

```
┌─────────────────────────┐
│  Edit              ⌘E   │
│  Duplicate         ⌘D   │
│  ──────────────────────  │
│  Add tag           ⌘T   │
│  Link to issue...       │
│  ──────────────────────  │
│  Delete            ⌘⌫   │
└─────────────────────────┘
```

- Background: `--bg-elevated`
- Border: `--border-subtle`
- Shadow: `--shadow-md`
- Item height: `32px`
- Hover: `--bg-hover`
- Destructive items: `--status-error` text
- Keyboard shortcuts right-aligned, `--text-tertiary`

---

### Toast Notifications

Brief, non-blocking feedback.

```
┌──────────────────────────────────────────┐
│  ✓  Issue #47 created                    │
└──────────────────────────────────────────┘
```

- Position: Bottom-center, 24px from edge
- Background: `--bg-elevated`
- Border-left: 3px, status color
- Auto-dismiss: 3 seconds (success), 5 seconds (error)
- Max 3 toasts visible, stack upward

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `⌘K` | Open command palette |
| `⌘1` | Go to Dashboard |
| `⌘2` | Go to Checklist |
| `⌘3` | Go to Sessions |
| `⌘4` | Go to Issues |
| `⌘5` | Go to Codex |
| `⌘6` | Go to Screenshots |
| `⌘I` | New issue |
| `⌘⇧S` | Take screenshot |
| `⌘⇧R` | Start/stop recording |
| `⌘⇧N` | New checklist item |
| `⌘⇧D` | New codex entry |
| `⌘,` | Settings |
| `⌘\` | Toggle sidebar |
| `?` | Show keyboard shortcuts |

### Navigation

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate lists |
| `Enter` | Open selected item |
| `Esc` | Close modal / go back |
| `⌘[` | Go back |
| `⌘]` | Go forward |
| `Tab` | Next focusable element |
| `⇧Tab` | Previous focusable element |

### In Lists

| Shortcut | Action |
|----------|--------|
| `Space` | Toggle / cycle status |
| `E` | Quick edit |
| `⌘D` | Duplicate |
| `⌘⌫` | Delete |
| `T` | Add tag |
| `⌘C` | Copy (issue becomes prompt) |

### In Video Player

| Shortcut | Action |
|----------|--------|
| `Space` | Play / pause |
| `←` / `→` | Skip 5 seconds |
| `⇧←` / `⇧→` | Skip 15 seconds |
| `A` | Add annotation |
| `F` | Fullscreen |
| `M` | Mute |

---

## Interaction Patterns

### Optimistic Updates

All local actions update the UI immediately. Sync happens in the background. If sync fails, show toast with retry option.

### Inline Editing

Double-click text to edit in place. `Enter` to save, `Esc` to cancel. Works for:
- Issue titles
- Checklist items
- Codex entries
- Tags

### Drag and Drop

- Reorder checklist items
- Reorder codex entries
- Move issues between status columns (if kanban view added later)

Visual feedback: Ghost element follows cursor, drop target highlights.

### Multi-Select

Hold `⌘` (Mac) or `Ctrl` (Win) to select multiple items. Bulk actions appear in a floating bar:

```
┌────────────────────────────────────────────────────┐
│  3 selected     Add tag     Change status     Delete │
└────────────────────────────────────────────────────┘
```

### Empty States

Every view has a friendly empty state:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                        📋                                   │
│                                                             │
│              No checklist items yet                         │
│                                                             │
│         Define what "working" means for your app.           │
│                                                             │
│                  [ + Add first item ]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Relevant icon
- Clear headline
- Brief explanation
- Primary action button

---

## Recording & Screenshot Overlays

### Recording Indicator

When recording is active, show persistent indicator:

```
┌──────────────────┐
│  🔴 Recording    │  ← Top-right corner, always visible
│      4:32        │
└──────────────────┘
```

- Click to pause/resume
- Stop button visible
- Time elapsed
- Draggable to reposition

### Screenshot Tool

When taking a screenshot:

1. Screen dims slightly
2. Crosshair cursor
3. Click and drag to select region (or click for full screen)
4. Selection shows dimensions
5. Release to capture
6. Annotation overlay appears immediately

### Screenshot Annotation Overlay

```
┌─────────────────────────────────────────────────────────────┐
│  Tools:  ✏️ Draw  ▢ Rectangle  ○ Circle  → Arrow  T Text   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│                    [ Screenshot ]                           │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Description: ___________________________________           │
│  Tags: ________________  Version: v0.4 ▾                   │
│                                                             │
│                              Cancel     Create Issue        │
└─────────────────────────────────────────────────────────────┘
```

---

## Settings

Minimal settings, sensible defaults.

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  General                                                    │
│  ───────────────────────────────────────────────────────    │
│  Default version for new items       [ v0.4         ▾ ]    │
│  Screenshot hotkey                   [ ⌘⇧S           ]     │
│  Recording hotkey                    [ ⌘⇧R           ]     │
│                                                             │
│  Appearance                                                 │
│  ───────────────────────────────────────────────────────    │
│  Theme                               [ Dark          ▾ ]    │
│  Sidebar                             [ Expanded      ▾ ]    │
│                                                             │
│  Data                                                       │
│  ───────────────────────────────────────────────────────    │
│  Storage location                    ~/Documents/Taka      │
│                                       [ Change... ]         │
│  Export all data                     [ Export ]             │
│                                                             │
│  Tags                                                       │
│  ───────────────────────────────────────────────────────    │
│  [ auth      ] [ payments  ] [ dashboard ] [ + Add ]       │
│                                                             │
│  Versions                                                   │
│  ───────────────────────────────────────────────────────    │
│  [ v0.4 ✓   ] [ v0.3     ] [ v0.2     ] [ + Add ]         │
│  ✓ = current default                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Light Mode (Optional)

Taka defaults to dark. Light mode available for those who prefer it.

| Token | Dark | Light |
|-------|------|-------|
| `--bg-base` | `#0F0F0F` | `#FFFFFF` |
| `--bg-surface` | `#171717` | `#F9FAFB` |
| `--bg-elevated` | `#1F1F1F` | `#FFFFFF` |
| `--bg-hover` | `#262626` | `#F3F4F6` |
| `--text-primary` | `#EFEFEF` | `#111827` |
| `--text-secondary` | `#A0A0A0` | `#6B7280` |
| `--border-subtle` | `#262626` | `#E5E7EB` |
| `--border-default` | `#333333` | `#D1D5DB` |

Accent and status colors remain consistent across themes.

---

## Summary

Taka's UI is dark, dense, and keyboard-driven. A fixed sidebar handles navigation and quick actions. The command palette (`⌘K`) surfaces everything. Views are focused—checklists, sessions, issues, codex, screenshots—each designed for its specific job. Components are minimal: cards, tags, badges, inputs, modals. Animation is fast and subtle. Every interaction provides instant feedback. The interface stays out of the way so you can focus on testing your app, not learning a new tool.
