# Dhanalyser Auto-Poster - Vercel Deployment Guide

## 🚀 Deploy to Vercel

### Prerequisites
1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository** - Push your code to GitHub
3. **LinkedIn API Credentials** - From LinkedIn Developer Console

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - Dhanalyser Auto-Poster"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dhanalyser-auto-poster.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the React app

### Step 3: Configure Environment Variables
In Vercel Dashboard → Project → Settings → Environment Variables, add:

```
LINKEDIN_CLIENT_ID=YOUR_CLIENT_ID
LINKEDIN_CLIENT_SECRET=YOUR_CLIENT_SECRET
LINKEDIN_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
LINKEDIN_PERSON_URN=YOUR_PERSON_URN
```

**Use your actual values from the .env file (not shown here for security)**

### Step 4: Deploy
- Vercel will automatically build and deploy
- Your app will be available at: `https://your-project-name.vercel.app`

## 🔧 Features
- ✅ **AI Post Generation** - Google Gemini integration
- ✅ **LinkedIn Auto-Posting** - Direct API integration  
- ✅ **Scheduling** - Cron jobs for Mon-Fri posting
- ✅ **Global Markets** - Worldwide stock market focus
- ✅ **Responsive UI** - Works on desktop and mobile

## 🛠️ Local Development
```bash
npm install
npm run dev  # Starts both frontend and backend
```

## 📱 Usage
1. **Settings** - Add your Google Gemini API key
2. **Generate** - Create AI-powered LinkedIn posts
3. **Schedule** - Queue posts for automatic posting
4. **Post Now** - Immediately post to LinkedIn

## 🔐 Security
- Environment variables are encrypted on Vercel
- API keys are never exposed to the frontend
- LinkedIn tokens expire every 60 days (refresh needed)

## 📞 Support
For issues or questions, contact the development team.