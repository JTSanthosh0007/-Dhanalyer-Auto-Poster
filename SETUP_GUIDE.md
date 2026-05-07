# 🚀 Dhanalyer Auto Poster - Setup Complete!

## ✅ Current Status

Your application is now **RUNNING**:

- **Backend Server**: http://localhost:5000 ✅
- **React Frontend**: http://localhost:3000 ✅

## 📋 What's Running

1. **Backend Server (Port 5000)**
   - Express server with LinkedIn API integration
   - Cron jobs for automated posting (Mon-Fri IST schedule)
   - API endpoints for post management

2. **React Frontend (Port 3000)**
   - AI-powered post generator using Claude
   - Dashboard for managing posts
   - Real-time countdown to next scheduled post

## 🔧 Next Steps to Complete Setup

### 1. Get Your Anthropic API Key (for AI post generation)

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to `.env.local`:
   ```
   REACT_APP_ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

### 2. Set Up LinkedIn API (for real posting)

#### Step 1: Create LinkedIn App
1. Go to https://www.linkedin.com/developers
2. Click **Create App**
3. Fill in:
   - App name: `Dhanalyer Auto Poster`
   - LinkedIn Page: Select your company page
   - App logo: Upload any logo
4. Click **Create app**

#### Step 2: Add Products
1. In your app dashboard, go to **Products** tab
2. Request access to:
   - ✅ **Share on LinkedIn**
   - ✅ **Sign In with LinkedIn using OpenID Connect**
3. Wait for approval (usually instant)

#### Step 3: Get Access Token
1. Go to https://www.linkedin.com/developers/tools/oauth/token-generator
2. Select your app
3. Check the scope: `w_member_social` (required for posting)
4. Click **Request access token**
5. Copy the token (valid for 60 days)

#### Step 4: Get Your Person URN
Run this command in your terminal (replace YOUR_TOKEN):
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.linkedin.com/v2/userinfo
```

Copy the `sub` field value (it looks like: `urn:li:person:ABC123xyz`)

#### Step 5: Update .env File
Edit the `.env` file in the project root:
```env
LINKEDIN_ACCESS_TOKEN=AQV...your-token-here
LINKEDIN_PERSON_URN=urn:li:person:YOUR_URN_HERE
```

#### Step 6: Restart the Backend Server
After updating `.env`, restart the server:
- Stop the current server process
- Run: `npm run server`

## 🎯 How to Use

### Open the Dashboard
Visit http://localhost:3000 in your browser

### Generate Posts
1. Go to the **Generate** tab
2. Select a topic from the dropdown
3. Click **✨ Generate Post**
4. AI will create a LinkedIn-ready post

### Generate Full Week
Click **📅 Full Week** to generate 5 posts at once (one for each weekday)

### Manage Posts
1. Go to the **Posts** tab
2. Click on any post to expand and view full content
3. Actions available:
   - **📋 Copy**: Copy post to clipboard
   - **🕐 Schedule**: Add to automated posting queue
   - **🚀 Post Now**: Post immediately to LinkedIn

### Configure Settings
1. Go to the **Settings** tab
2. Verify server URL: `http://localhost:5000`
3. Click **🔌 Test Connection** to verify backend is working
4. Once LinkedIn credentials are added to `.env`, the server will show as configured

## 📅 Posting Schedule (IST)

The app automatically posts at these times:

| Day       | Time  | Description        |
|-----------|-------|--------------------|
| Monday    | 11:30 | Mid-morning Power  |
| Tuesday   | 09:30 | Peak Day ⭐        |
| Wednesday | 12:30 | Afternoon Surge    |
| Thursday  | 14:30 | Deep Dive          |
| Friday    | 09:30 | Weekend Lead       |

## 🛠️ Development Commands

```bash
# Start backend server only
npm run server

# Start React frontend only
npm start

# Start both (requires concurrently package)
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
-Dhanalyer-Auto-Poster/
├── src/
│   ├── App.js          # Main React component
│   └── index.js        # React entry point
├── public/
│   └── index.html      # HTML template
├── server.js           # Express backend + cron jobs
├── .env                # Backend environment variables
├── .env.local          # Frontend environment variables
├── package.json        # Dependencies
└── README.md           # Original documentation
```

## 🔒 Security Notes

- **Never commit** `.env` or `.env.local` files to Git
- LinkedIn access tokens expire after 60 days - regenerate when needed
- Keep your Anthropic API key secure
- The `.gitignore` file already excludes these sensitive files

## 🐛 Troubleshooting

### "Cannot reach server" error
- Make sure backend is running on port 5000
- Check that `.env` file exists with correct values
- Verify no firewall is blocking port 5000

### "Generation failed" error
- Verify your Anthropic API key in `.env.local`
- Check that you have API credits available
- Ensure you're using the correct key format: `sk-ant-...`

### "Post failed" error
- Verify LinkedIn credentials in `.env`
- Check that access token hasn't expired (60-day limit)
- Ensure you have the correct Person URN
- Verify your LinkedIn app has "Share on LinkedIn" product enabled

### Port already in use
- Backend (5000): Stop any other process using port 5000
- Frontend (3000): Change PORT in `.env.local` to another port like 3001

## 📞 Support

For issues or questions:
1. Check the original README.md for detailed LinkedIn API setup
2. Review the console logs in both terminal windows
3. Verify all environment variables are set correctly

## 🎉 You're All Set!

Your Dhanalyer Auto Poster is ready to use! Open http://localhost:3000 and start generating AI-powered LinkedIn posts.

---

**Built by Dhanalyer** — Fintech for a Resilient World 🌍
