# Dhanalyer Auto Poster 🚀

AI-powered LinkedIn auto-post engine for **Dhanalyer Fintech** — posts daily content about war's impact on global finance, automatically, at peak engagement times.

---

## What It Does

- 🤖 **AI generates** LinkedIn posts about fintech × war × financial resilience
- ⏰ **Auto-schedules** posts at peak IST times (Mon–Fri)
- 🚀 **Real LinkedIn posting** via LinkedIn API
- 📊 **Dashboard** to manage, preview, copy, and track all posts

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/JTSanthosh0007/-Dhanalyer-Auto-Poster.git
cd -Dhanalyer-Auto-Poster
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
```
Then edit `.env` and fill in your keys (see below).

### 3. Run the App
```bash
# Terminal 1 — React frontend
npm start

# Terminal 2 — Backend server (LinkedIn posting + cron)
npm run server
```

Open http://localhost:3000

---

## LinkedIn API Setup

### Step 1 — Create LinkedIn App
1. Go to https://www.linkedin.com/developers
2. Click **Create App**
3. App name: `Dhanalyer Auto Poster`
4. Attach your LinkedIn Company Page

### Step 2 — Add Products
In your app → **Products** tab → Request:
- ✅ Share on LinkedIn
- ✅ Sign In with LinkedIn using OpenID Connect

### Step 3 — Get Access Token
1. Go to https://www.linkedin.com/developers/tools/oauth/token-generator
2. Select your app
3. Check all scopes (especially `w_member_social`)
4. Click **Request access token**
5. Copy the token → paste into `.env`

> ⚠️ Token expires in **60 days**. Generate a new one before it expires.

### Step 4 — Get Your Person URN
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.linkedin.com/v2/userinfo
```
Copy the `sub` field → paste as `LINKEDIN_PERSON_URN` in `.env`

### Step 5 — Fill Your .env
```env
REACT_APP_ANTHROPIC_API_KEY=sk-ant-...
LINKEDIN_ACCESS_TOKEN=AQV...
LINKEDIN_PERSON_URN=urn:li:person:ABC123
PORT=5000
```

---

## Post Schedule (IST)

| Day       | Time    | Why                    |
|-----------|---------|------------------------|
| Monday    | 11:30   | Mid-morning check-in   |
| Tuesday   | 09:30   | ⭐ Peak engagement day  |
| Wednesday | 12:30   | Afternoon surge        |
| Thursday  | 14:30   | Deep-dive content      |
| Friday    | 09:30   | Weekend lead           |

---

## Project Structure

```
dhanalyer-auto-poster/
├── src/
│   ├── App.js          # React dashboard
│   └── index.js        # Entry point
├── server/
│   └── index.js        # Express + cron + LinkedIn API
├── public/
│   └── index.html
├── .env.example        # Copy to .env and fill in
├── .gitignore
└── package.json
```

---

## API Endpoints

| Method | Route           | Description              |
|--------|-----------------|--------------------------|
| GET    | /api/health     | Server status check      |
| POST   | /api/post-now   | Post immediately         |
| POST   | /api/queue      | Add post to schedule     |
| GET    | /api/queue      | View scheduled posts     |
| DELETE | /api/queue/:id  | Remove from queue        |
| GET    | /api/history    | View posted history      |

---

## Built By

**Dhanalyer** — Fintech for a Resilient World 🌍  
Building financial infrastructure that works when everything else breaks.

---

*Never commit your `.env` file. It's in `.gitignore` for a reason.*
