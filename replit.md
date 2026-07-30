# ZizoChat Web

A real-time WhatsApp Web clone with full backend, live messaging via Socket.io, Google Sign-In + OTP auth, and WebRTC calls.

## How to run

Two workflows run simultaneously:

| Workflow | Command | Port |
|---|---|---|
| Start application | `npm run dev` | 5000 (webview) |
| Start Backend | `cd server && node index.js` | 3001 (console) |

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3001`.

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite (port 5000)
- Tailwind CSS, Lucide React
- `@react-oauth/google` — Google Sign-In button
- `socket.io-client` — real-time messaging
- WebRTC (mesh P2P) — voice/video calls

**Backend** (`server/`)
- Node.js + Express
- MongoDB Atlas (Mongoose)
- Socket.io — real-time events + WebRTC signaling
- `google-auth-library` — verify Google ID tokens
- Nodemailer + Gmail — OTP emails
- JWT — session tokens

## Auth flow

1. User clicks "Sign in with Google" → Google popup
2. Frontend sends ID token to `POST /api/auth/google`
3. Backend verifies token, creates/updates user in MongoDB, sends 6-digit OTP to email
4. User enters OTP → `POST /api/auth/verify-otp`
5. Backend returns JWT, frontend stores in localStorage and connects Socket.io

## Project structure

```
server/
  index.js              — Express + Socket.io server
  config/db.js          — MongoDB connection
  middleware/auth.js    — JWT middleware
  models/               — User, Chat, Message, OTP (Mongoose)
  routes/               — auth, chats, messages, users
  socket/index.js       — all real-time event handlers

src/
  App.tsx               — root shell, incoming call banner
  store.tsx             — global state, socket connection, API integration
  services/
    api.ts              — REST API wrapper
    socket.ts           — Socket.io client singleton
  components/
    LoginScreen.tsx     — Google Sign-In + OTP verification
    Sidebar.tsx         — chat list, search, user controls
    ChatArea.tsx        — message thread
    MessageBubble.tsx   — text/image/voice/poll bubbles
    MessageInput.tsx    — input bar with emoji, attach, voice, poll
    CallModal.tsx       — WebRTC voice/video call modal
    ProfileDrawer.tsx   — current user profile
    ContactInfoDrawer.tsx — contact / group info
    ui.tsx              — shared primitives
```

## ⚠️ Required: Configure Google OAuth

Before Google Sign-In works, add the Replit domain as an **authorized JavaScript origin** in Google Cloud Console:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Open your OAuth 2.0 client (`108457596196-...`)
3. Under **Authorized JavaScript origins**, add:
   `https://88f9cf52-4316-40f4-8e24-638bf920c515-00-2uoyhvp7ups9z.pike.replit.dev`
4. Save and wait ~5 minutes

## Secrets required

| Secret | Purpose |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `EMAIL_USER` | Gmail address for OTP emails |
| `EMAIL_PASS` | Gmail app password |
| `JWT_SECRET` | JWT signing secret |
| `VITE_GOOGLE_CLIENT_ID` | Env var for frontend Google button |

## User preferences

_None recorded yet._
