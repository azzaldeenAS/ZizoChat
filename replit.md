# ZizoChat Web

A WhatsApp Web interactive prototype built with React 18 + TypeScript + Vite + Tailwind CSS. Features Arabic RTL layout, dark/light mode, voice messages, polls, group chats, call modals, and LocalStorage persistence.

## How to run

```
npm run dev
```

The dev server runs on port 5000. The Replit workflow "Start application" starts it automatically.

## Stack

- React 18 + TypeScript
- Vite (dev server on port 5000, all hosts allowed for Replit proxy)
- Tailwind CSS
- Lucide React (icons)
- React Context API + LocalStorage (no backend)

## Project structure

```
src/
  App.tsx              — root shell (login gate + layout)
  store.tsx            — global state via React Context + LocalStorage
  data.ts              — seed data (contacts, messages, chats, CURRENT_USER)
  types.ts             — TypeScript types
  utils.ts             — helpers (cn, getContact, uid, nowTime, …)
  index.css            — global styles (Tailwind + custom)
  components/
    LoginScreen.tsx    — QR code login screen
    Sidebar.tsx        — chat list, search, status rings
    ChatArea.tsx       — message thread + header
    MessageBubble.tsx  — text / image / voice / poll bubbles
    MessageInput.tsx   — text input, emoji, attach, voice recorder, poll creator
    ProfileDrawer.tsx  — current user profile drawer
    ContactInfoDrawer.tsx — contact / group info drawer
    CallModal.tsx      — voice / video call popup
    ui.tsx             — shared primitives (Modal, Drawer, Menu, Tooltip, …)
```

## User preferences

_None recorded yet._
