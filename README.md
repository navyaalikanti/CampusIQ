# CampusIQ - AI-Powered Collaborative Learning Platform

CampusIQ is an advanced educational ecosystem designed to foster seamless collaboration between students, faculty mentors, and graduate mentors. It integrates AI-driven study tools, real-time communication, and academic resource management into a premium, unified workspace.

---

## 🚀 Key Features

### 🤖 AI Intelligence Layer
- **Auto-Summaries:** Instantly generate concise summaries from uploaded PDF notes.
- **AI Quiz Generation:** Automatically create practice quizzes based on your study materials.
- **Smart Doubt Solving:** Get AI-driven answers to complex academic questions within study rooms.

### 📚 Resource Hub
- **Peer-to-Peer Sharing:** Upload, discover, and download curated study materials and previous year papers.
- **Seamless Organization:** Filter resources by Subject, Year, Branch, and Semester.
- **Collaborative Rating:** Rate and endorse high-quality materials to help peers.

### 🤝 Strategic Mentorship
- **Mentor Discovery:** Connect with faculty or alumni based on shared skills and research interests.
- **Session Booking:** Schedule one-on-one sessions for career guidance or academic support.
- **Connection Tracking:** Manage requests and track your professional mentor network.

### 🏛️ Collaborative Workspaces
- **Study Rooms:** Join or create persistent study rooms with group chat and pinned resources.
- **Live Classes:** Participate in live video sessions powered by Jitsi SDK integration.
- **Discussion Boards:** Engage in campus-wide academic threads and real-time community polls.

### 🎮 Gamification (Collab Score)
- **Contribution Tracking:** Earn points for sharing resources, solving doubts, and hosting sessions.
- **Leaderboard:** Compete with peers and get recognized for your collaboration efforts.

---

## 🛠 Tech Stack

- **Frontend:** [React 19](https://reactjs.org/), [Vite](https://vitejs.dev/), [Lucide React](https://lucide.dev/), [Jitsi SDK](https://jitsi.org/).
- **Backend:** [Node.js](https://nodejs.org/), [Express](https://expressjs.com/).
- **Database & Auth:** [Firebase Firestore](https://firebase.google.com/docs/firestore), [Firebase Auth](https://firebase.google.com/docs/auth).
- **Storage:** [Supabase Storage](https://supabase.com/storage) (for large PDFs and media).
- **AI Integration:** [Google Gemini AI API](https://ai.google.dev/).
- **Real-time:** [WebSockets (WS)](https://github.com/websockets/ws) for live workspace updates.

---

## 📂 Project Structure

```bash
CampusIQ/
├── backend/            # Express.js Server
│   ├── server.js       # Central API & WebSocket logic
│   ├── uploads/        # Local disk storage (temporary)
│   └── logs/           # Server-side audit logs
├── frontend/           # React + Vite Frontend
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Workspace containers
│   │   ├── lib/        # API and Firebase logic
│   │   └── hooks/      # Custom React hooks
│   └── public/         # Static assets
└── DEPLOYMENT_GUIDE.md # Detailed production steps
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/navyaalikanti/CampusIQ.git
   cd CampusIQ
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   # Create a .env file based on .env.example and add your keys
   npm start
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   # Create a .env file based on .env.example
   npm run dev
   ```

---

## 🔐 Environment Variables

CampusIQ requires several API keys to function correctly. Ensure you have the following in your `.env` files:

### Backend (`/backend/.env`)
```env
PORT=5055
JWT_SECRET=your_jwt_secret
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### Frontend (`/frontend/.env`)
```env
VITE_API_URL=http://localhost:5055
VITE_FIREBASE_API_KEY=...
VITE_SUPABASE_URL=...
```
*(See `.env.example` in both folders for a complete list)*

---

## 🌍 Deployment

### Backend
- Deploy to **Render** or **Railway**.
- Ensure all Environment Variables are set in the provider's dashboard.

### Frontend
- Deploy to **Vercel** or **Netlify**.
- Set `VITE_API_URL` to point to your live backend domain.

For vertical step-by-step instructions, view the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## 📜 License

Created as part of the CampusIQ education ecosystem. All rights reserved.
