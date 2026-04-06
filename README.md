# 🚀 Notepad Ultra | Next-Gen Editor

A premium, production-level rich text and code editor built with a microservice architecture.

## ✨ Features
- **Modern & Slick UI**: High-end glassmorphic design and smooth animations using Framer Motion.
- **Rich Text Editing**: Powered by TipTap (bold, italic, highlight, lists, etc.).
- **IDE-Style Code Highlighting**: Syntax highlighting for over 50+ languages.
- **Image Support**: Drag & drop or upload images directly to Cloudinary with resizing previews.
- **Microservices**:
  - **Auth Service**: JWT-based secure authentication.
  - **Notes Service**: MongoDB CRUD with Cloudinary integration.
  - **Live Service**: Real-time collaboration using Socket.io.
- **Live Sharing**: Multi-user editing (broadcast updates and cursor activity).

---

## 🛠️ Tech Stack
- **Frontend**: Next.js 14+, Tailwind CSS, Framer Motion, TipTap.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: MongoDB (Mongoose).
- **Storage**: Cloudinary.
- **Auth**: JWT (Json Web Token).

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas account (or local instance)
- Cloudinary account

### 2. Configuration
The root `.env` file is already configured with your provided credentials.

### 3. Installation
Install dependencies for all services:
```bash
npm run install:all
```

### 4. Running the Development environment
Launch all services (Auth, Notes, Live, Client) concurrently:
```bash
npm run dev
```

The application will be available at:
- **Client**: http://localhost:3000
- **Auth Service**: http://localhost:5001
- **Notes Service**: http://localhost:5002
- **Live Service**: http://localhost:5003

---

## 🏗️ Architecture
The project follows a **Monorepo** structure:
- `/client`: Next.js frontend application.
- `/services/auth-service`: Express-based authentication server.
- `/services/notes-service`: Express-based CRUD server for notepad data.
- `/services/live-service`: Real-time WebSocket server for collaboration.
