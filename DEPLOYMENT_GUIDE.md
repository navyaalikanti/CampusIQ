# CampusIQ Production Deployment Guide

This guide will walk you through deploying your application for a production environment. Your project is split into two parts: a React/Vite Frontend and an Express/Node.js Backend.

## 1. Environment Variables Configuration
To make the application secure, all sensitive data (like API Keys and secrets) have been moved to `.env` files. You must configure these variables on your hosting platforms, just as they are detailed in your `.env.example` files.

### Backend Secrets (`backend/.env`)
- `PORT` (Usually provided by the hosting platform automatically)
- `JWT_SECRET` (A long random string. E.g., `supersecret_campusiq_jwt_key_2026`)
- `FIREBASE_...` keys required for `firebase-admin` / Firestore.
- `GEMINI_API_KEY` (Your Google Gemini AI API key).
- `SUPABASE_...` keys.

### Frontend Secrets (`frontend/.env`)
All frontend variables MUST start with `VITE_` otherwise Vite will not bundle them!
- `VITE_FIREBASE_...` required to initialize the Firebase Client SDK.
- `VITE_SUPABASE_...` required to initialize the Supabase Client SDK.
- **Important:** Ensure your `baseUrl` in `frontend/src/lib/api.js` points to your deployed backend URL in production (e.g., updating it to `import.meta.env.VITE_API_URL` and adding `VITE_API_URL=https://your-backend.onrender.com/api`).

## 2. Deploying the Backend (e.g., Render, Railway, or Heroku)

The backend is a Node.js monolith serving an API. It can be easily deployed to a service like Render or Railway.

**Steps for Render:**
1. Create a new **Web Service**.
2. Connect your GitHub repository.
3. Set the Root Directory to `backend`.
4. Build Command: `npm install`
5. Start Command: `npm start` (or `node server.js`)
6. **Important:** Add all your backend environment variables in the "Environment Variables" section of the Render dashboard.

## 3. Deploying the Frontend (e.g., Vercel, Netlify)

Vite React apps deploy extremely beautifully on Vercel.

**Steps for Vercel:**
1. create a new **Project** on Vercel.
2. Connect your GitHub repository.
3. Set the Framework Preset to `Vite`.
4. Set the Root Directory to `frontend`.
5. The Build command will automatically be `npm run build` and the Output Directory will be `dist`.
6. **Important:** Add all your `VITE_...` environment variables in the Vercel dashboard BEFORE you build.

> **Production Tip:** Your frontend uses an `api.js` file with a hardcoded `/api` base URL which assumes your frontend and backend run on the exact same domain. In separate deployments, you'll need to modify `baseURL` inside `frontend/src/lib/api.js` to look for a environment variable indicating the full path to your live backend server API (e.g., `baseURL: import.meta.env.VITE_API_URL || '/api'`).
