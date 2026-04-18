# Notepad Ultra — Bug Fix Sweep + Developer-Focused Redesign

**Date:** 2026-04-18
**Status:** Draft — awaiting user review

## Goal

Turn Notepad Ultra from a functional-but-buggy prototype into a clean, developer-focused notes app: fix all known bugs, tighten security, replace the 2018-era glassmorphic UI with a Zed/Linear/Obsidian-hybrid aesthetic, and add a small number of high-leverage features (command palette, slash commands, image resizing, full-text search, version history, focus mode, markdown export/import).

Non-goals: AI features, templates marketplace, mobile native app, teams/orgs.

---

## Part A — Bug Fixes

Grouped by area. Each item references `file:line` so the implementer can jump straight to the change. Severity tiers drive commit order: critical/high first, medium next, low last.

### A.1 Security & Config (critical)

1. **Committed secrets** — root `.env` tracked in git with real Supabase/Cloudinary/JWT keys.
   - Fix: `git rm --cached .env`, add to `.gitignore`, write `SECURITY.md` with a checklist of which keys the user must rotate (Supabase service key, Cloudinary API secret, JWT_SECRET).
2. **Port mismatch** — `client/src/lib/socket.ts` falls back to `5004`; `services/live-service` runs on `5003`. Real-time silently fails without env vars set.
   - Fix: align fallback to `5003`.
3. **Public note authorization bypass** — `services/notes-service/controllers/notesController.js` `getNote()` returns a note to unauthenticated callers even when `is_public=false`, as long as the UUID is known.
   - Fix: explicit check `if (!note.is_public && (!req.user || req.user.id !== note.owner_id && !collaborators.includes(req.user.id))) return 403`.
4. **CORS wide open** — `app.use(cors())` in all three services.
   - Fix: restrict to `process.env.CLIENT_URL`, `credentials: true`.
5. **Missing server-side password validation** — auth-service accepts any password.
   - Fix: enforce `length >= 8` server-side; keep frontend hint.
6. **Update endpoint field whitelist** — notes update deletes only `owner_id`; everything else passes through.
   - Fix: explicit whitelist `{ title, content, tags, is_pinned, is_public }`.
7. **Image upload validation** — no MIME check, no file-size limit, 10mb JSON limit.
   - Fix: multer `fileFilter` (image/jpeg, image/png, image/webp, image/gif), `limits.fileSize = 5MB`.
8. **JWT storage hygiene** — token stored in both cookies (no `secure`/`sameSite`) and localStorage.
   - Fix: pick cookies only, set `secure: production`, `sameSite: 'lax'`. Remove localStorage token usage.
9. **Leaky error messages** — raw Supabase errors returned to client.
   - Fix: log server-side, return generic messages.
10. **Rate limiting** — none.
    - Fix: `express-rate-limit` on auth (5/min) and notes write endpoints (60/min).

### A.2 Editor / Real-time (high)

11. **Sync echo loop** — `Editor.tsx` `onUpdate` emits after `setContent` from remote, causing A→B→A bounce.
    - Fix: `isRemoteUpdate` ref; set before `setContent`, skip emit inside `onUpdate` when true.
12. **Cursor emit flood** — fires on every selection change.
    - Fix: throttle to 100ms.
13. **Ghost-user problem** — same email in two tabs = two presence avatars.
    - Fix: dedupe by email in live-service `users` broadcast; emit `replaced-by-newer-tab` to old socket.
14. **No offline/reconnect UI** — silent disconnect.
    - Fix: status-bar indicator (`connected`/`reconnecting`/`offline`); block edits while offline, queue them.
15. **Read-only paste bypass** — viewer can paste text into editor even when `editable=false`.
    - Fix: verify TipTap `editable` prop blocks paste and drop; if not, add explicit `handlePaste`/`handleDrop` returning true in readonly mode.
16. **Race in `joinNoteRoom`** — reconnect handler can be registered twice.
    - Fix: `socket.off('connect', handler)` before `socket.on`.

### A.3 Dashboard (high/medium)

17. **No error toasts** — create/delete/rename failures silent.
    - Fix: add `sonner` or `react-hot-toast`; wrap mutations.
18. **`is_pinned` vs `isPinned` mismatch** — sorter uses one, renderer uses the other; pinned icon invisible in some states.
    - Fix: canonicalize on `is_pinned` (snake_case, matches DB).
19. **Timezone bug** — `new Date(note.updated_at)` parsed as local, not UTC.
    - Fix: use `date-fns` `formatDistanceToNow` on proper UTC parsing.
20. **Race on mount** — auth + notes fetched in parallel; if auth fails, notes response still setsState.
    - Fix: sequential — validate first, then fetch notes.
21. **Delete confirm** — `window.confirm` easily Entered-past.
    - Fix: modal with explicit "Delete permanently" red button.
22. **No pagination / infinite scroll** — all notes loaded at once.
    - Fix: server-side pagination, 50/page, intersection-observer loader.

### A.4 Share / Public access (medium)

23. **Share URL = raw UUID** — enumerable.
    - Fix: add `share_token` column (nanoid 12 chars); public URL is `/s/:token`; backend resolves token → note.
24. **Invite button is a no-op.**
    - Fix: wire to new `POST /api/notes/:id/invite` (adds email to collaborators); toast on success.
25. **`isPublic` toggle local-only** — parent state never updates.
    - Fix: lift state into dashboard; pass setter into ShareModal.

### A.5 Misc (low/medium)

26. **Mermaid `innerHTML = svg`** — XSS risk if mermaid breaks.
    - Fix: `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })`.
27. **Confetti on tag change** — wrong trigger.
    - Fix: remove confetti entirely (doesn't fit new aesthetic).
28. **PDF export on huge docs** — silent hang.
    - Fix: warn when `content.length > 500k`; offer markdown export instead.
29. **Tailwind `bg-linear-to-r`** — swap for standard `bg-gradient-to-r` (only used on auth page; disappears in redesign anyway).
30. **No token refresh** — 90-day abrupt logout.
    - Fix: deferred; flag for future.

---

## Part B — UI Redesign (developer aesthetic)

### B.1 Design system

| Token | Value |
|---|---|
| Accent | `emerald-500` `#10b981` for primary; `emerald-400` hover |
| Background (dark) | `#0a0a0a` (near-black), panels `#111111`, hovers `#1a1a1a` |
| Background (light) | `#fafafa`, panels `#ffffff`, hovers `#f4f4f5` |
| Border | `#27272a` dark / `#e4e4e7` light (1px, no shadows) |
| Text | `#fafafa` / `#18181b` primary; `#a1a1aa` / `#71717a` muted |
| Font — UI | Inter (variable) |
| Font — mono | JetBrains Mono (code blocks, timestamps, numerics) |
| Radius | 4px (inputs, buttons), 6px (cards), 8px (modals) |
| Motion | 120–150ms ease-out; no spring flourishes |
| Density | compact — 32px row height in lists, 14px body, 13px labels |

All glassmorphism, large gradients, framer-motion spring flourishes, and confetti are removed.

### B.2 Layout

**Dashboard** (`/dashboard`):
```
┌────────────┬─────────────────────────────────┐
│ Sidebar    │ Main                             │
│            │                                  │
│ + New Note │ [Search ⌘K]         [New ⌘N]     │
│ ─────────  │                                  │
│ Pinned (3) │ ─ Note row (title · tags · 2h ago)
│ All (42)   │ ─ Note row                       │
│ ─ Tags ─   │ ─ Note row                       │
│ #work (5)  │                                  │
│ #ideas (2) │                                  │
│            │                                  │
│ ─ Bottom ─ │                                  │
│ ⚙ Settings │                                  │
│ 👤 user    │                                  │
└────────────┴─────────────────────────────────┘
```

**Editor** (`/note/[id]`):
```
┌─────────────────────────────────────────────┐
│ ← Dashboard  ·  title (editable inline)     │
│ ───────────────────────────────────── Share │
│                                              │
│      [ Editor with slash commands ]         │
│                                              │
│                                              │
│ ─── Status bar ───                           │
│ 342 words · saved 3s ago · ● connected · 2 👥│
└─────────────────────────────────────────────┘
```

**Auth** (`/auth`): centered card, no gradients, no glass. Logo at top, form, mode toggle at bottom.

### B.3 Command palette (⌘K)

Overlay modal, centered, 640px wide. Fuzzy-matches:
- Notes by title
- Actions: New note, Toggle theme, Export PDF/MD, Share, Toggle focus, Sign out
- Tags: `#work`, `#ideas`

Implementation: lightweight — no `cmdk` lib needed unless we want headless primitives. Use TipTap-style custom reducer. Keyboard: ↑/↓ navigate, Enter select, Esc close.

### B.4 Keyboard shortcuts

| Keys | Action |
|---|---|
| ⌘K | Command palette |
| ⌘N | New note |
| ⌘S | Force save now (normally autosave) |
| ⌘. | Toggle focus mode |
| ⌘/ | Cheatsheet overlay |
| ⌘⇧E | Export menu |
| `j` / `k` (dashboard) | Move selection down/up in note list |
| Enter (dashboard) | Open selected note |

### B.5 Status bar (editor)

Fixed bottom, 28px tall, monospace. Left: `342 words`. Center: `saved 3s ago` or `saving…`. Right: `● connected` + collaborator avatars.

---

## Part C — New Features

### C.1 Command palette
See B.3.

### C.2 Slash commands in editor
Typing `/` opens a TipTap suggestion popup with:
- `/h1`, `/h2`, `/h3`
- `/code` (language prompt)
- `/mermaid`
- `/image` (opens file picker)
- `/gallery` (horizontal image row, see C.6)
- `/todo`, `/bullet`, `/number`
- `/divider`, `/quote`, `/table`

### C.3 Image resize + stretch + horizontal gallery
**Spec:**
- TipTap Image node replaced with custom `ResizableImage` node:
  - Attrs: `src`, `alt`, `width` (px or %), `height` (auto or px), `align` (left/center/right).
  - Drag handles on corners and right edge — Notion-style. Aspect-ratio lock toggle (default: locked; shift-drag unlocks).
  - Keyboard: focused image + arrow keys nudges width by 10px.
- New `ImageGallery` node — a container holding 2–4 `ResizableImage` children in a flex row, each sized by `flex-basis %`:
  - Slash command `/gallery` or drag-drop multiple images at once.
  - Drag inner divider to redistribute widths.
  - Selecting a gallery item shows add/remove image controls.
  - Renders responsively on read-only view: collapses to stacked on narrow widths.
- Persisted in TipTap JSON (not HTML) — new node types registered in schema; exporters updated (PDF + markdown).

### C.4 Full-text search
- Postgres migration: add `tsvector` column on `notes(title, content_text)`, trigger to update on write.
- New endpoint `GET /api/notes/search?q=...` — returns top 20 matches with snippet.
- Wired into command palette and dashboard search input.

### C.5 Version history
- New table `note_versions(id, note_id, content, created_at, created_by)`.
- Snapshot on save if `>5 min` since last version for that note, OR on manual save (⌘S).
- Sidebar drawer in editor: "History" — list of versions with relative time; preview + restore. Restore creates a new version pointing to the restored content (non-destructive).
- Cap: keep latest 50 versions per note.

### C.6 Focus mode
- `⌘.` toggle: hides sidebar, status bar, toolbar. Max width 720px centered. Subtle fade of non-focused paragraphs (optional via setting).

### C.7 Markdown export + import
- Export: new `lib/export.ts` function `toMarkdown(doc)` using TipTap JSON → MD; uses `turndown`-equivalent mappings for our custom nodes (gallery → sequence of `![]()` images).
- Import: dashboard accepts `.md` file drop → creates new note with parsed content (using `marked` or similar; render once and capture TipTap JSON).

### C.8 Offline indicator + retry queue
- `useConnectionStatus` hook — wraps socket + fetch errors.
- In offline state, autosave queues ops in IndexedDB; on reconnect, flush in order.

---

## Part D — Execution order

Commits on `main` (as requested), milestone-sized:

1. **Security & config fixes** — items A.1 + SECURITY.md
2. **Real-time + editor bugs** — items A.2 + A.3 + A.4 + A.5
3. **Design system base** — tokens, globals.css, font loading, Tailwind config, remove framer-motion flourishes
4. **Redesigned pages** — auth, dashboard, editor chrome (keep TipTap content model untouched)
5. **Command palette + shortcuts + slash commands** (C.1, C.2)
6. **Image resize + gallery** (C.3)
7. **Full-text search** (C.4) — includes Supabase migration
8. **Version history** (C.5) — includes Supabase migration
9. **Focus mode + markdown export/import + offline indicator** (C.6, C.7, C.8)

After each milestone: manual smoke-test locally, commit, move on. If a milestone reveals regressions in prior work, fix them before moving on.

---

## Part E — Out of scope

Explicitly rejected to keep the sprint focused:
- AI/LLM assistant
- Templates marketplace
- Teams / orgs / permissions beyond collaborator array
- Mobile native app
- End-to-end encryption
- Plugin system
- Token refresh (flagged for future)

## Part F — Known constraints

- `client/AGENTS.md` warns: "This is NOT the Next.js you know — breaking changes, read `node_modules/next/dist/docs/` before writing code." Honor this — check docs before Next.js-specific APIs.
- Supabase is the database — migrations via `migrations.sql`. Keep single-file migration habit.
- User will rotate exposed keys after `.env` is untracked.
