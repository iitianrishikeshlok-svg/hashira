# 🚀 VisualMind AI — Deployment Guide

This guide explains how to deploy VisualMind AI online so anyone can access it on the web.

---

## 🌟 Method 1: All-in-One on Render (Recommended & Easiest)
Render will build both the frontend and run the Express backend on a single free URL.

### Steps:
1. Log in to [Render.com](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository: `https://github.com/iitianrishikeshlok-svg/hashira`.
4. Configure the settings:
   - **Name:** `visualmind-ai`
   - **Language / Environment:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Instance Type:** `Free`
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = `your_gemini_api_key`
   - `SUPABASE_URL` = `https://ytdcoustodmthhpnzeox.supabase.co`
   - `SUPABASE_ANON_KEY` = `your_supabase_anon_key`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your_supabase_service_role_key`
6. Click **Deploy Web Service**.
7. Render will build the React frontend and launch the Express backend. Once finished, you will receive a live URL: `https://visualmind-ai.onrender.com`.

---

## ⚡ Method 2: Vercel (Frontend) + Render (Backend)

If you prefer using Vercel's global CDN for the frontend:

### Step 1: Deploy Backend to Render
1. Follow Method 1 above, but set the name to `visualmind-backend`.
2. Once deployed, copy your Render URL, e.g., `https://visualmind-backend.onrender.com`.

### Step 2: Deploy Frontend to Vercel
1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import `https://github.com/iitianrishikeshlok-svg/hashira`.
4. Framework Preset: **Vite** (auto-detected).
5. Under **Environment Variables**, add:
   - `VITE_API_URL` = `https://visualmind-backend.onrender.com`
   - `VITE_SUPABASE_URL` = `https://ytdcoustodmthhpnzeox.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your_supabase_anon_key`
6. Click **Deploy**.
7. Your app is live at `https://hashira.vercel.app`!
