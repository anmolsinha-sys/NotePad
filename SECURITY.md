# Security notes

## Rotate these keys now

The previous `.env` file sat on disk with live credentials (it was never committed to git, but the file itself contains real secrets and should be treated as compromised). Rotate each one:

### 1. Supabase service-role key
Supabase dashboard → project → **Project Settings** → **API** → **Service role** → *Reset*.
Update `SUPABASE_KEY` in `.env` locally and in your deployment env.

### 2. Cloudinary API secret
Cloudinary console → **Account Details** → **API Keys** → *Rotate*.
Update `CLOUDINARY_API_SECRET` (the key can stay; only the secret rotates).

### 3. JWT signing secret
Generate a new one locally:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```
Replace `JWT_SECRET` in `.env`. **Warning:** rotating this invalidates all existing user sessions — everyone has to log in again.

## Baseline hygiene

- `.env` is in `.gitignore`. Do not remove it. Never commit a `.env`. Use `.env.example` for shared placeholders.
- The services now enforce:
  - Restricted CORS (origin whitelist via `CLIENT_URL`, comma-separated for multiple)
  - Rate limiting on auth (`10/min`) and write endpoints (`120/min`)
  - Server-side password validation (≥ 8 chars)
  - Whitelisted update fields (no owner-id spoofing)
  - Image upload: 5 MB cap, MIME allowlist
  - Generic client-facing error messages (full errors are server-logged only)
- Real-time collab server listens on port `5003`. The client socket falls back to `5003` when `NEXT_PUBLIC_LIVE_URL` is unset.

## Production checklist

- Serve over HTTPS and set `Secure`/`SameSite=Lax` on auth cookies
- Set `CLIENT_URL` to the deployed origin (comma-separated if multiple)
- Don't rely on `NEXT_PUBLIC_*` fallbacks in production — set them explicitly in the build env
- Consider Supabase Row-Level Security policies in addition to the app-level checks
