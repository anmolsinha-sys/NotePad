# Notepad

A developer-focused notepad with real-time collaboration, client-side encryption, wikilinks, a force-directed graph view, and a command palette. Rich text, code blocks, tables, mermaid diagrams, and Canva-style free-positioned images — all keyboard-first.

![status](https://img.shields.io/badge/status-alpha-amber) ![license](https://img.shields.io/badge/license-MIT-emerald) ![stack](https://img.shields.io/badge/stack-Next.js%2016%20%2B%20Node%20%2B%20Supabase-blue)

## Highlights

- **Real-time collaboration** — multi-user presence, live cursors, optimistic sync
- **Password-protected notes** — per-note AES-GCM encryption with PBKDF2; passphrase never leaves the browser
- **Wikilinks + backlinks + graph view** — build a second brain, see it as a force-directed graph
- **Version history with diff** — auto-snapshots every 5 min, inline red/green diff viewer
- **Command palette (⌘K)** + **slash commands** + **smart snippets** (`:date`, `:time`, `:uuid`, emoji autocomplete)
- **Canvas-style images** — drag anywhere, resize, multi-image galleries
- **Smart paste** — URLs auto-fetch titles, JSON/YAML becomes code blocks
- **Full-text search** — Postgres `tsvector` backed
- **Web clipper** — bookmarklet for one-click clipping from any page
- **PWA** — installable desktop/mobile app with offline shell
- **Themes** — dark/light/system + 5 accent colors
- **Markdown import/export + PDF export** with print-ready styling
- **Writing streak + heatmap**, **due dates**, **focus mode**, **typewriter scroll**, **reading view for public notes**, **chat thread per note**

## Architecture

```
┌────────────┐     ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  Client    │────▶│ Auth Service │    │ Notes Service │    │ Live Service │
│  Next.js   │────▶│  :5001 JWT   │    │   :5002 CRUD  │    │  :5003 WS    │
│   :3000    │─────┴──────────────┘────┴───────────────┘────┴──────────────┘
                                   │                  │
                                   └──── Supabase ────┘
                                   (Postgres + Storage)
                                   + Cloudinary (images)
```

| Service | Port | Purpose |
|---|---|---|
| `client` | 3000 | Next.js 16 frontend (App Router, TipTap editor, Tailwind 4) |
| `auth-service` | 5001 | Signup / login / validate / delete account (JWT, bcrypt, rate-limited) |
| `notes-service` | 5002 | Notes CRUD, invites, comments, versions, search, uploads, URL meta |
| `live-service` | 5003 | Socket.io — broadcasts updates, cursors, presence, comments |

## Quick start

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- A Cloudinary account (free tier is fine)

### 1. Clone & install

```bash
git clone https://github.com/anmolsinha-sys/NotePad.git
cd NotePad
npm run install:all
```

### 2. Create `.env` at the repo root

```env
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_KEY="<service-role-key>"
JWT_SECRET="<generate-with-openssl-rand-base64-48>"

CLOUDINARY_CLOUD_NAME="<name>"
CLOUDINARY_API_KEY="<key>"
CLOUDINARY_API_SECRET="<secret>"

CLIENT_URL="http://localhost:3000"
PORT_AUTH=5001
PORT_NOTES=5002
PORT_LIVE=5003
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 3. Run the database migration

Open the Supabase SQL editor and run the contents of `migrations.sql`. It's idempotent — safe to re-run as the schema evolves.

### 4. Start everything

```bash
npm run dev
```

This runs all four services concurrently. You should see:

```
Client running on http://localhost:3000
Auth Service running on port 5001
Notes Service running on port 5002
Live Service running on port 5003
```

Open http://localhost:3000, sign up, start writing.

### 5. Production build

```bash
cd client && npm run build && npm start
```

Client is a PWA — on HTTPS you'll see "Install Notepad" in Chrome / Edge / Safari.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `⌘N` | New note |
| `⌘S` | Save now |
| `⌘.` | Toggle focus mode |
| `⌘/` | Keyboard help |
| `⌘⇧G` | Graph view |
| `/` | Slash commands inside editor |
| `[[` | Wikilink picker |
| `:date ` / `:time ` / `:uuid ` | Inline expanders |
| `:emoji` | Emoji autocomplete |

## Features, in depth

### Encryption

Per-note client-side encryption lives in `client/src/lib/crypto.ts`. The flow:

1. User locks a note with a passphrase.
2. Browser derives a key via PBKDF2-SHA-256 (150k iterations).
3. Content is encrypted with AES-GCM; the ciphertext is stored on the server as `NPENC1:<base64(salt || iv || ciphertext)>`.
4. The passphrase is cached in memory for the session; never sent to the server.

If the user loses the passphrase, the contents are unrecoverable — by design.

### Real-time collaboration

- Socket.io handshake requires a valid JWT (verified against Supabase on connect).
- Edits, cursors, presence, comments are broadcast per-note only to authorized sockets (owner, editor, viewer, or anyone if `is_public`).
- Encrypted notes skip real-time broadcast to avoid leaking plaintext to other clients.

### Version history

- Snapshots auto-save every 5 min of active editing or on demand (`⌘S` triggers immediate save; next content change starts the timer again).
- Trimmed to 50 snapshots per note.
- Restore creates a snapshot of current content first, so restores are reversible.

### Image positioning

Images have two modes:

- **Flow**: inline with text, with alignment (left / center / right / inline).
- **Free**: absolute-positioned anywhere on the page, even over text. Drag handle on the body, resize handle at the SE corner.

Dropping 2+ images at once creates a horizontal gallery with draggable dividers.

### Web clipper

Drag the bookmarklet in Settings to your bookmarks bar. Click it on any page — selection + URL + title are shipped to `/clip`, which creates a note tagged `clip`.

## API

All endpoints require `Authorization: Bearer <jwt>` except `POST /api/auth/signup` and `POST /api/auth/login`.

| Method | Path | Service |
|---|---|---|
| `POST` | `/api/auth/signup` | auth |
| `POST` | `/api/auth/login` | auth |
| `GET` | `/api/auth/validate` | auth |
| `DELETE` | `/api/auth/account` | auth |
| `GET` | `/api/notes` | notes |
| `GET` | `/api/notes/:id` | notes |
| `POST` | `/api/notes` | notes |
| `PATCH` | `/api/notes/:id` | notes |
| `DELETE` | `/api/notes/:id` | notes |
| `POST` | `/api/notes/:id/invite` | notes |
| `GET` | `/api/notes/:id/versions` | notes |
| `POST` | `/api/notes/:id/versions/:vid/restore` | notes |
| `GET` | `/api/notes/:id/comments` | notes |
| `POST` | `/api/notes/:id/comments` | notes |
| `DELETE` | `/api/notes/:id/comments/:cid` | notes |
| `GET` | `/api/url-meta?url=...` | notes |
| `POST` | `/api/upload` | notes |

## Security posture

Baked in:

- Bcrypt-hashed passwords (12 rounds) with server-side length & format validation
- JWT expiry (30 days), generic error messages (no account enumeration)
- Origin-restricted CORS, rate-limiting on auth and write endpoints
- Full input whitelisting on `PATCH /api/notes/:id`
- Multer MIME + size limits (5 MB) on image uploads
- SSRF guard on `/api/url-meta`: resolves the hostname, rejects RFC 1918 / 169.254.0.0/16 / loopback / multicast, manual redirect handling with a cap of 2 hops, 256 KB body limit
- Socket.io handshake requires a valid JWT; server never trusts client-supplied user payloads
- Stored-HTML renders sanitized with DOMPurify (history preview, PDF export, mermaid SVG)
- Per-note viewer vs editor split — viewers hit 403 on PATCH

Known deferrals:

- JWT still lives in a cookie that isn't `httpOnly` (axios reads it client-side). Move to server-side session cookies if you need full XSS defense-in-depth.
- Orphaned Cloudinary uploads are not reclaimed automatically.
- `.env` is untracked but exists on disk — rotate Supabase / Cloudinary / JWT secrets immediately if the file or this repo ever leaks. See [`SECURITY.md`](./SECURITY.md).

## Tech stack

**Client**
- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript 5
- Tailwind CSS 4
- TipTap 3 (StarterKit, CodeBlockLowlight, Table, TextStyle, Color, Highlight, Image, Suggestion)
- socket.io-client, axios, sonner, lucide-react
- d3-force (graph view), diff-match-patch (version diff), DOMPurify (sanitization), marked + turndown (markdown I/O)

**Server**
- Express 4
- @supabase/supabase-js
- jsonwebtoken, bcryptjs, cors, express-rate-limit
- multer + multer-storage-cloudinary
- socket.io

**Database**
- Postgres via Supabase
- `notes`, `note_versions`, `note_comments`, `users`, plus generated `tsvector` column for search

## Project layout

```
.
├── client/                          # Next.js app
│   ├── src/
│   │   ├── app/                     # Routes: /, /auth, /dashboard, /note/[id], /clip
│   │   ├── components/              # Editor, CommandPalette, GraphView, HistoryDrawer, ...
│   │   └── lib/                     # crypto, socket, markdown, wikilink, slash-commands, ...
│   ├── public/sw.js                 # PWA service worker
│   └── next.config.ts
├── services/
│   ├── auth-service/                # JWT auth
│   ├── notes-service/               # Notes CRUD + everything around them
│   └── live-service/                # Socket.io realtime
├── migrations.sql                   # Idempotent schema
├── SECURITY.md
├── docker-compose.yml
├── package.json                     # Concurrent `npm run dev`
└── README.md                        # You are here
```

## Contributing

This is an alpha project with a lot of surface. Bugfixes and small features are welcome. File an issue first for anything larger.

```bash
git checkout -b feature/your-idea
# ...
npm run install:all
npm run dev
# verify your change works end-to-end
git commit -m "feat: your idea"
```

## License

MIT © Anmol Sinha
