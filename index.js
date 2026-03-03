// server/index.js
// Dhanalyer Auto Poster — Backend Server
// Handles LinkedIn posting + cron scheduling

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ─── In-memory post queue ────────────────────────────────────────────────────
let postQueue = []; // { id, content, scheduledDay, scheduledTime, status }
let postHistory = [];

// ─── LinkedIn Post Function ──────────────────────────────────────────────────
async function postToLinkedIn(content) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const urn = process.env.LINKEDIN_PERSON_URN;

  if (!token || !urn) {
    throw new Error("Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN in .env");
  }

  const response = await axios.post(
    "https://api.linkedin.com/v2/ugcPosts",
    {
      author: urn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202210",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  return response.data;
}

// ─── Schedule Map (IST → UTC, IST = UTC+5:30) ────────────────────────────────
// Monday    11:30 IST = 06:00 UTC  → cron: "0 6 * * 1"
// Tuesday   09:30 IST = 04:00 UTC  → cron: "0 4 * * 2"
// Wednesday 12:30 IST = 07:00 UTC  → cron: "0 7 * * 3"
// Thursday  14:30 IST = 09:00 UTC  → cron: "0 9 * * 4"
// Friday    09:30 IST = 04:00 UTC  → cron: "0 4 * * 5"

const CRON_SCHEDULE = {
  Monday:    "0 6 * * 1",
  Tuesday:   "0 4 * * 2",
  Wednesday: "0 7 * * 3",
  Thursday:  "0 9 * * 4",
  Friday:    "0 4 * * 5",
};

// ─── Register all cron jobs ──────────────────────────────────────────────────
Object.entries(CRON_SCHEDULE).forEach(([day, cronExpr]) => {
  cron.schedule(cronExpr, async () => {
    console.log(`⏰ [${day}] Cron triggered — checking queue...`);

    const pending = postQueue.find(p => p.scheduledDay === day && p.status === "pending");
    if (!pending) {
      console.log(`📭 No pending post for ${day}`);
      return;
    }

    try {
      console.log(`🚀 Posting to LinkedIn for ${day}...`);
      const result = await postToLinkedIn(pending.content);
      pending.status = "posted";
      pending.postedAt = new Date().toISOString();
      pending.linkedinId = result.id;
      postHistory.push({ ...pending });
      postQueue = postQueue.filter(p => p.id !== pending.id);
      console.log(`✅ Posted successfully! LinkedIn ID: ${result.id}`);
    } catch (err) {
      pending.status = "failed";
      pending.error = err.message;
      console.error(`❌ Failed to post: ${err.message}`);
    }
  }, { timezone: "UTC" });
});

console.log("✅ All 5 cron jobs registered (Mon–Fri IST schedule)");

// ─── API Routes ──────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    server: "Dhanalyer Auto Poster",
    time: new Date().toISOString(),
    linkedinConfigured: !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_PERSON_URN),
  });
});

// Add post to queue
app.post("/api/queue", (req, res) => {
  const { content, scheduledDay, scheduledTime } = req.body;
  if (!content || !scheduledDay) {
    return res.status(400).json({ error: "content and scheduledDay are required" });
  }
  const post = {
    id: Date.now().toString(),
    content,
    scheduledDay,
    scheduledTime: scheduledTime || "09:30",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  postQueue.push(post);
  console.log(`📥 Post queued for ${scheduledDay}`);
  res.json({ success: true, post });
});

// Get all queued posts
app.get("/api/queue", (req, res) => {
  res.json({ queue: postQueue });
});

// Delete from queue
app.delete("/api/queue/:id", (req, res) => {
  postQueue = postQueue.filter(p => p.id !== req.params.id);
  res.json({ success: true });
});

// Manually post immediately (for testing)
app.post("/api/post-now", async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });
  try {
    const result = await postToLinkedIn(content);
    const record = {
      id: Date.now().toString(),
      content,
      status: "posted",
      postedAt: new Date().toISOString(),
      linkedinId: result.id,
    };
    postHistory.push(record);
    res.json({ success: true, linkedinId: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get post history
app.get("/api/history", (req, res) => {
  res.json({ history: postHistory });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Dhanalyer Auto Poster Server running on port ${PORT}`);
  console.log(`📡 LinkedIn configured: ${!!(process.env.LINKEDIN_ACCESS_TOKEN)}`);
  console.log(`📅 Cron jobs active for Mon–Fri IST schedule\n`);
});
