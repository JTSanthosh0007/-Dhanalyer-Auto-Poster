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

  console.log("Attempting to post to LinkedIn...");
  console.log("URN:", urn);
  console.log("Content length:", content.length);

  try {
    // Use the newer LinkedIn API format
    const response = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        author: `urn:li:person:${urn}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { 
              text: content 
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202210",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    console.log("✅ LinkedIn post successful!");
    console.log("Response:", response.data);
    return response.data;

  } catch (error) {
    console.error("❌ LinkedIn posting failed:");
    console.error("Status:", error.response?.status);
    console.error("Error:", error.response?.data);
    console.error("Headers:", error.response?.headers);
    
    // Try alternative URN format
    if (error.response?.status === 403) {
      console.log("Trying alternative URN format...");
      try {
        const altResponse = await axios.post(
          "https://api.linkedin.com/v2/ugcPosts",
          {
            author: urn, // Try without urn:li:person: prefix
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { 
                  text: content 
                },
                shareMediaCategory: "NONE"
              }
            },
            visibility: {
              "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            }
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "LinkedIn-Version": "202210",
              "X-Restli-Protocol-Version": "2.0.0"
            }
          }
        );
        
        console.log("✅ LinkedIn post successful with alternative URN format!");
        return altResponse.data;
        
      } catch (altError) {
        console.error("❌ Alternative URN format also failed:", altError.response?.data);
        throw error; // Throw original error
      }
    }
    
    throw error;
  }
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

// ─── AI API Proxy (to avoid CORS issues) ─────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  const { provider, model, apiKey, prompt } = req.body;
  
  if (!provider || !model || !apiKey || !prompt) {
    return res.status(400).json({ error: "Missing required fields: provider, model, apiKey, prompt" });
  }

  try {
    let response, data;

    if (provider === "google") {
      // First, let's check what models are available
      try {
        const listResponse = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const availableModels = listResponse.data.models || [];
        console.log("Available models:", availableModels.map(m => m.name));
        
        // Find all working models that support generateContent
        const workingModels = availableModels.filter(m => 
          m.supportedGenerationMethods && 
          m.supportedGenerationMethods.includes('generateContent')
        ).map(m => m.name.replace('models/', ''));
        
        console.log("Models supporting generateContent:", workingModels);
        
        if (workingModels.length === 0) {
          return res.status(400).json({ 
            error: "No compatible models found. Available models: " + 
            availableModels.map(m => m.name).join(', ')
          });
        }
        
        // Try each model until one works (to handle high demand errors)
        let lastError;
        for (const modelName of workingModels) {
          try {
            console.log(`Trying model: ${modelName}`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            
            response = await axios.post(url, {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 800 }
            }, {
              headers: {
                "Content-Type": "application/json"
              }
            });
            
            data = response.data;
            console.log(`✅ Success with model: ${modelName}`);
            return res.json({ content: data.candidates[0].content.parts[0].text });
            
          } catch (error) {
            console.log(`❌ Failed with model ${modelName}:`, error.response?.data?.error?.message || error.message);
            lastError = error;
            
            // If it's a high demand error (503), try the next model
            if (error.response?.status === 503) {
              continue;
            }
            // For other errors, also continue to try next model
            continue;
          }
        }
        
        // If all models failed
        throw lastError;
        
      } catch (error) {
        console.error("Google API Error:", error.response?.data || error.message);
        const errorMessage = error.response?.data?.error?.message || error.message;
        return res.status(500).json({ error: `AI API Error: ${errorMessage}` });
      }
    }

    return res.status(400).json({ error: "Only Google Gemini provider is supported" });

  } catch (error) {
    console.error("AI API Error:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message;
    res.status(500).json({ error: `AI API Error: ${errorMessage}` });
  }
});

// Test LinkedIn connection and get Person URN
app.get("/api/test-linkedin", async (req, res) => {
  try {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({ error: "No LinkedIn token configured" });
    }

    // Get user info to verify token and get URN
    const response = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": "202210"
      }
    });

    const userInfo = response.data;
    console.log("LinkedIn User Info:", userInfo);
    
    res.json({ 
      success: true, 
      userInfo: userInfo,
      message: "LinkedIn token is valid. Update your .env with the correct URN if needed."
    });
  } catch (error) {
    console.error("LinkedIn Test Error:", error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data || error.message,
      message: "LinkedIn token test failed"
    });
  }
});

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
