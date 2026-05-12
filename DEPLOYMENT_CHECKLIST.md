# 🚀 Dhanalyser Auto-Poster Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Code Changes Verified
- [x] Auto-scheduling implemented in `generatePost()` function
- [x] Community features added to AI prompts
- [x] UI status indicators updated (draft/scheduled/posted)
- [x] Fallback content includes Community features
- [x] Indian market context added (NSE/BSE, FII, etc.)

### 2. Server Configuration
- [ ] `.env` file created with all required variables
- [ ] `LINKEDIN_ACCESS_TOKEN` configured
- [ ] `LINKEDIN_PERSON_URN` configured
- [ ] Server starts without errors
- [ ] All 5 cron jobs registered successfully

### 3. Testing Completed
- [ ] Server health check passes
- [ ] Post can be added to queue
- [ ] Queue monitoring works
- [ ] Manual "Post Now" works
- [ ] Auto-scheduling works (post added to queue on generation)

---

## 📋 Environment Variables Required

### Server-Side (.env)
```env
# LinkedIn API Credentials
LINKEDIN_ACCESS_TOKEN=your_token_here
LINKEDIN_PERSON_URN=urn:li:person:YOUR_URN

# Server Configuration
PORT=5000
```

### Client-Side (localStorage in browser)
- `api_key` - Google Gemini API key
- `ai_provider` - "google"
- `ai_model` - "gemini-1.5-flash"
- `server_url` - "http://localhost:5000" (dev) or production URL

---

## 🧪 Testing Steps

### Step 1: Test Server
```bash
# Start server
npm run server

# Expected output:
# ✅ All 5 cron jobs registered (Mon–Fri IST schedule)
# 🚀 Dhanalyer Auto Poster Server running on port 5000
# 📡 LinkedIn configured: true
# 📅 Cron jobs active for Mon–Fri IST schedule
```

### Step 2: Test Health Endpoint
```bash
curl http://localhost:5000/api/health

# Expected response:
# {
#   "status": "ok",
#   "server": "Dhanalyer Auto Poster",
#   "time": "2026-05-12T...",
#   "linkedinConfigured": true
# }
```

### Step 3: Test Queue System
```bash
node test-auto-posting.js

# Expected output:
# ✅ Server Status: ok
# ✅ LinkedIn Configured: true
# ✅ Posts can be added to queue
# ✅ Queue is being monitored
```

### Step 4: Test Community Content
```bash
# Set your API key first
export GOOGLE_API_KEY="your_key_here"

# Run test
node test-community-content.js

# Expected output:
# ✅ Community features mentioned: watchlist, community, follow
# ✅ No generic phrases detected
```

### Step 5: Test UI
```bash
# Start React app
npm start

# Open browser: http://localhost:3000
# 1. Go to Settings tab
# 2. Add Google API key
# 3. Save settings
# 4. Go to Generator tab
# 5. Click "Generate Post"
# 6. Verify post appears in Posts tab with "scheduled" status
```

---

## 🔍 Verification Checklist

### Server Verification
- [ ] Server starts on port 5000
- [ ] No error messages in console
- [ ] Cron jobs registered (5 jobs)
- [ ] LinkedIn configured: true
- [ ] Health endpoint responds

### Queue Verification
- [ ] Can add posts to queue via API
- [ ] Queue endpoint returns posts
- [ ] Posts have correct status (pending)
- [ ] Posts have correct day/time

### Content Verification
- [ ] Generated posts mention specific Community features
- [ ] No generic phrases like "analyze trends with precision"
- [ ] Indian market context included (NSE/BSE when relevant)
- [ ] Posts are under 220 words
- [ ] Hashtags included: #Dhanalyser #StockMarket #Trading #Investing #Finance

### UI Verification
- [ ] Settings tab saves API key
- [ ] Generate button works
- [ ] Posts appear in Posts tab
- [ ] Status shows "scheduled" (not "draft")
- [ ] "✓ Auto-posting at [time]" badge appears
- [ ] Countdown timer works
- [ ] Weekly schedule displays correctly

---

## 🚦 Deployment Steps

### Local Development
```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Start React app
npm start

# Browser: http://localhost:3000
```

### Production Deployment

#### Option 1: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
1. Push code to GitHub
2. Connect repository to Vercel
3. Set build command: `npm run build`
4. Deploy

**Backend (Railway):**
1. Create new project on Railway
2. Connect GitHub repository
3. Add environment variables:
   - `LINKEDIN_ACCESS_TOKEN`
   - `LINKEDIN_PERSON_URN`
   - `PORT=5000`
4. Set start command: `npm run server`
5. Deploy
6. Copy Railway URL (e.g., `https://your-app.railway.app`)

**Update Frontend:**
1. In Vercel, add environment variable:
   - `REACT_APP_SERVER_URL=https://your-app.railway.app`
2. Redeploy

#### Option 2: Single Server (VPS)

**On your VPS:**
```bash
# Install dependencies
npm install

# Create .env file
nano .env
# Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN

# Build React app
npm run build

# Install PM2 for process management
npm install -g pm2

# Start server with PM2
pm2 start server.js --name dhanalyser-server

# Serve React build with nginx or serve
npm install -g serve
pm2 start "serve -s build -l 3000" --name dhanalyser-frontend

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 📊 Monitoring

### Server Logs
```bash
# Watch server console for cron triggers
# You should see:
⏰ [Monday] Cron triggered — checking queue...
🚀 Posting to LinkedIn for Monday...
✅ Posted successfully! LinkedIn ID: xxx
```

### Queue Status
```bash
# Check current queue
curl http://localhost:5000/api/queue

# Check post history
curl http://localhost:5000/api/history
```

### LinkedIn Verification
1. Check your LinkedIn profile
2. Verify posts appear at scheduled times
3. Check post content includes Community features

---

## 🐛 Troubleshooting

### Issue: Server won't start (EADDRINUSE)
**Solution:**
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or use different port
PORT=5001 npm run server
```

### Issue: Posts not auto-posting
**Check:**
1. Server is running
2. Cron jobs registered (check server console)
3. Posts are in queue (curl http://localhost:5000/api/queue)
4. LinkedIn credentials are correct
5. Server time is correct (UTC)

### Issue: Generic content generated
**Solution:**
1. Check AI prompt includes Community features
2. Verify `SYSTEM_PROMPT` in `src/App.js`
3. Test with `node test-community-content.js`
4. Review `EXAMPLE_POSTS.md` for guidance

### Issue: LinkedIn API errors (403)
**Solution:**
1. Verify `LINKEDIN_ACCESS_TOKEN` is valid
2. Check `LINKEDIN_PERSON_URN` format
3. Test with: `curl http://localhost:5000/api/test-linkedin`
4. Token may have expired (60-day validity)

---

## 📈 Success Metrics

### Week 1 Goals
- [ ] 5 posts generated and scheduled
- [ ] All 5 posts auto-posted successfully
- [ ] 100% mention specific Community features
- [ ] 0 generic "analyze trends" phrases
- [ ] LinkedIn engagement tracked

### Week 2+ Goals
- [ ] Consistent posting schedule maintained
- [ ] Community feature variety (rotate features)
- [ ] Engagement metrics improving
- [ ] No manual intervention required

---

## 🎯 Final Checklist Before Going Live

- [ ] All tests passing
- [ ] Server running stable for 24 hours
- [ ] Sample posts reviewed and approved
- [ ] LinkedIn credentials verified
- [ ] Backup plan in place (manual posting if needed)
- [ ] Monitoring setup (server logs, queue status)
- [ ] Documentation complete
- [ ] Team trained on system

---

## 📞 Support Resources

### Documentation Files
- `AUTO_POSTING_GUIDE.md` - Complete system guide
- `WHATS_FIXED.md` - What was changed and why
- `EXAMPLE_POSTS.md` - Good vs bad content examples
- `READY_TO_USE.md` - Quick start guide

### Test Scripts
- `test-auto-posting.js` - Test queue system
- `test-community-content.js` - Test content generation

### Key Files
- `server.js` - Backend with cron jobs
- `src/App.js` - Frontend with auto-scheduling
- `.env` - Environment variables (DO NOT COMMIT)

---

## ✅ Deployment Complete!

Once all items are checked:
1. ✅ System is ready for production
2. ✅ Auto-posting is enabled
3. ✅ Community content is integrated
4. ✅ Monitoring is in place

**Next Steps:**
- Generate first week of posts
- Monitor auto-posting on Monday
- Track LinkedIn engagement
- Iterate on content based on performance

---

**Built for Dhanalyser** - Automating LinkedIn presence for India's smartest investing community. 🚀
