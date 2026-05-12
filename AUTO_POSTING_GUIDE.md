# Dhanalyser Auto-Posting Guide

## 🎯 How Automatic Posting Works

The Dhanalyser LinkedIn Auto-Poster now features **fully automatic posting** - no manual clicks required!

### System Flow

```
1. Generate Post (AI) 
   ↓
2. Automatically Schedule to Server Queue
   ↓
3. Server Cron Jobs Monitor Queue
   ↓
4. Post Automatically at Scheduled Time
   ↓
5. LinkedIn Published ✅
```

## 📅 Weekly Schedule (IST)

Posts are automatically scheduled and posted at these times:

| Day       | Time  | Label            |
|-----------|-------|------------------|
| Monday    | 09:30 | Market Open      |
| Tuesday   | 14:00 | Mid-Day Update   |
| Wednesday | 09:30 | Market Open      |
| Thursday  | 14:00 | Mid-Day Update   |
| Friday    | 15:30 | Market Close     |

## 🚀 Quick Start

### 1. Start the Server

```bash
npm run server
```

The server runs cron jobs that check the queue every scheduled time and automatically post to LinkedIn.

### 2. Configure LinkedIn Credentials

Add to your `.env` file:

```env
LINKEDIN_ACCESS_TOKEN=your_token_here
LINKEDIN_PERSON_URN=your_urn_here
```

### 3. Generate Posts

In the app:
- Click **"✨ Generate Post"** - Creates ONE post and auto-schedules it
- Click **"📅 Full Week (5 posts)"** - Creates 5 posts and auto-schedules all

**That's it!** Posts will automatically publish at their scheduled times.

## 🤖 AI Content Generation

### Dhanalyser Community Integration

The AI now includes information about the **Dhanalyser Community** feature in posts:

**Community Features:**
- 📋 Shared watchlists - Curated stock collections
- 💬 Real-time stock discussions
- 📊 Portfolio sharing (opt-in)
- 🎯 Investment ideas tied to live data
- 🛡️ AI-moderated quality control

Posts naturally mention these features when contextually relevant.

### Content Strategy

Each generated post includes:
1. **Hook** - Engaging opening about market news
2. **Body** - Market insight and analysis (2-3 sentences)
3. **CTA** - How Dhanalyser/Community helps investors
4. **Hashtags** - #Dhanalyser #StockMarket #Trading #Investing #Finance

## 🔧 Technical Details

### Server-Side (server.js)

**Cron Jobs:**
```javascript
// Cron jobs run in UTC timezone
// IST = UTC + 5:30

Monday    11:30 IST = 06:00 UTC → "0 6 * * 1"
Tuesday   09:30 IST = 04:00 UTC → "0 4 * * 2"
Wednesday 12:30 IST = 07:00 UTC → "0 7 * * 3"
Thursday  14:30 IST = 09:00 UTC → "0 9 * * 4"
Friday    09:30 IST = 04:00 UTC → "0 4 * * 5"
```

**Auto-Posting Logic:**
1. Cron job triggers at scheduled time
2. Checks `postQueue` for pending posts matching the day
3. Calls `postToLinkedIn(content)` with post content
4. Updates post status to "posted" or "failed"
5. Moves to `postHistory`

### Client-Side (App.js)

**Auto-Schedule on Generate:**
```javascript
async function generatePost() {
  // ... AI generation ...
  
  const newPost = { /* post data */ };
  
  // Automatically schedule to server queue
  await schedulePost(newPost);
  
  // Post is now in server queue for auto-posting
}
```

## 📊 Post Status Flow

```
draft → scheduled → posted
  ↓         ↓          ↓
 [UI]   [Server]  [LinkedIn]
```

- **draft** - Just created, not yet in server queue
- **scheduled** - In server queue, will auto-post at scheduled time
- **posted** - Successfully published to LinkedIn
- **failed** - Posting failed (check server logs)

## 🛠️ Troubleshooting

### Posts Not Auto-Posting?

**Check 1: Server Running?**
```bash
npm run server
```
Look for: `✅ All 5 cron jobs registered (Mon–Fri IST schedule)`

**Check 2: LinkedIn Credentials?**
```bash
# Test your LinkedIn connection
curl http://localhost:5000/api/test-linkedin
```

**Check 3: Posts in Queue?**
```bash
# Check server queue
curl http://localhost:5000/api/queue
```

**Check 4: Server Logs**
Watch the server console for cron triggers:
```
⏰ [Monday] Cron triggered — checking queue...
🚀 Posting to LinkedIn for Monday...
✅ Posted successfully! LinkedIn ID: xxx
```

### Common Issues

**Issue:** "No pending post for [Day]"
- **Solution:** Generate a post first. Posts must be in the queue before the scheduled time.

**Issue:** "LinkedIn posting failed: 403"
- **Solution:** Check your `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` in `.env`

**Issue:** Posts stuck in "draft" status
- **Solution:** Server might not be running. Start with `npm run server`

## 🎨 Manual Override Options

Even with auto-posting enabled, you can:

- **📋 Copy** - Copy post text to clipboard
- **🕐 Schedule** - Manually add draft posts to queue
- **🚀 Post Now** - Bypass schedule and post immediately

## 📈 Monitoring

### View Queue Status
```bash
curl http://localhost:5000/api/queue
```

### View Post History
```bash
curl http://localhost:5000/api/history
```

### Server Health Check
```bash
curl http://localhost:5000/api/health
```

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Contains sensitive tokens
2. **Use environment variables** - Keep credentials on server only
3. **Rotate tokens regularly** - LinkedIn tokens can expire
4. **Monitor server logs** - Watch for unauthorized access attempts

## 📝 Content Guidelines

Posts automatically follow these rules:
- Max 220 words
- Professional yet conversational tone
- Global market context
- Natural Dhanalyser mentions (not ads)
- Occasional Community feature mentions
- Safe, finance-themed image prompts

## 🌐 Deployment

### Local Development
```bash
npm run dev  # Starts both React app and server
```

### Production (Vercel)
1. Deploy frontend to Vercel
2. Deploy server separately (Railway, Render, etc.)
3. Update `SERVER_URL` in app settings
4. Add LinkedIn credentials to server environment

## 📞 Support

If auto-posting isn't working:
1. Check server console logs
2. Verify LinkedIn credentials
3. Test with "Post Now" button first
4. Check cron job registration on server start

---

**Built for Dhanalyser** - Making retail investors smarter, one post at a time. 🚀
