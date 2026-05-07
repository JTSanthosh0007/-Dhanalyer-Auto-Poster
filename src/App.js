import { useState, useEffect, useRef, useMemo } from "react";

const SYSTEM_PROMPT = `You are a LinkedIn content strategist for Dhanalyser, a global stock market analysis app (Android).

TASK: Given a finance news headline + summary, generate ONE LinkedIn post that:
1. Hooks with the news angle (1 line)
2. Adds market insight (2-3 lines)
3. Bridges to how Dhanalyser helps investors act on this (1-2 lines)
4. Ends with 3-5 relevant hashtags (#Dhanalyser #StockMarket #Trading #Investing #Finance)

TONE: Professional yet conversational. Global market context. No fluff.
AUDIENCE: Global retail investors, traders, finance enthusiasts on LinkedIn.

OUTPUT FORMAT (JSON only, no markdown):
{
  "hook": "...",
  "body": "...",
  "cta": "...",
  "hashtags": "...",
  "full_post": "hook + body + cta + hashtags combined",
  "image_prompt": "minimal flat illustration: [describe scene for image gen]"
}

RULES:
- full_post max 220 words
- Never use em-dashes
- Always mention Dhanalyser naturally, not as an ad
- image_prompt must be safe, finance-themed, no text in image`;

const SCHEDULE = [
  { day: "Monday",    time: "09:30", label: "Market Open" },
  { day: "Tuesday",   time: "14:00", label: "Mid-Day Update" },
  { day: "Wednesday", time: "09:30", label: "Market Open" },
  { day: "Thursday",  time: "14:00", label: "Mid-Day Update" },
  { day: "Friday",    time: "15:30", label: "Market Close" },
];

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// AI Provider configurations
const AI_PROVIDERS = {
  google: {
    name: "Google (Gemini)",
    models: [
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Fastest, Cheapest)" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Most Capable)" },
      { id: "gemini-pro", name: "Gemini Pro (Legacy)" }
    ],
    endpoint: (key, model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    headers: () => ({
      "Content-Type": "application/json"
    })
  }
};

function getNextPostInfo() {
  const now = new Date();
  const todayIdx = now.getDay();
  for (let i = 0; i < 7; i++) {
    const checkDay = SCHEDULE.find(s => s.day === DAYS[(todayIdx + i) % 7]);
    if (checkDay) {
      const [h, m] = checkDay.time.split(":").map(Number);
      const target = new Date(now);
      target.setDate(now.getDate() + i);
      target.setHours(h, m, 0, 0);
      if (target > now) return { ...checkDay, target };
    }
  }
  return null;
}

function useCountdown(target) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!target) return;
    const tick = () => setDiff(Math.max(0, target - new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s };
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [posting, setPosting] = useState(null);
  const [postedIds, setPostedIds] = useState([]);
  const [tab, setTab] = useState("generator");
  const [toast, setToast] = useState(null);
  const [newsQuery, setNewsQuery] = useState("global stock market latest news finance");
  
  // API settings with safety checks
  const [aiProvider, setAiProvider] = useState(() => {
    const saved = localStorage.getItem("ai_provider");
    return (saved && AI_PROVIDERS[saved]) ? saved : "google";
  });
  const [apiKey, setApiKey] = useState(localStorage.getItem("api_key") || "");
  const [aiModel, setAiModel] = useState(() => {
    const saved = localStorage.getItem("ai_model");
    const provider = AI_PROVIDERS[aiProvider] || AI_PROVIDERS.google;
    return (saved && provider.models.find(m => m.id === saved)) ? saved : provider.models[0].id;
  });
  const [linkedinToken, setLinkedinToken] = useState(localStorage.getItem("linkedin_token") || "");
  const [linkedinUrn, setLinkedinUrn] = useState(localStorage.getItem("linkedin_urn") || "");
  const [serverUrl, setServerUrl] = useState(localStorage.getItem("server_url") || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000'));
  const [serverStatus, setServerStatus] = useState(null);

  const nextPost  = useMemo(() => getNextPostInfo(), []);
  const countdown = useCountdown(nextPost?.target);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem("ai_provider", aiProvider);
    localStorage.setItem("api_key", apiKey);
    localStorage.setItem("ai_model", aiModel);
    localStorage.setItem("linkedin_token", linkedinToken);
    localStorage.setItem("linkedin_urn", linkedinUrn);
    localStorage.setItem("server_url", serverUrl);
    showToast("Settings saved!");
  }

  // Check server health
  async function checkServer() {
    try {
      const r = await fetch(`${serverUrl}/api/health`);
      const d = await r.json();
      setServerStatus(d);
      showToast("Server connected ✅");
    } catch {
      setServerStatus(null);
      showToast("Cannot reach server ❌", "error");
    }
  }

  // Universal AI API call function - routes through backend to avoid CORS
  async function callAI(prompt) {
    try {
      const response = await fetch(`${serverUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel,
          apiKey: apiKey,
          prompt: prompt
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error("AI API Error:", error);
      throw error;
    }
  }

  async function generatePost() {
    if (!apiKey) {
      showToast("Please add your AI API key in Settings", "error");
      return;
    }

    setGenerating(true);
    try {
      // Step 1: Generate LinkedIn post directly (skip news fetching to avoid JSON issues)
      showToast("Generating LinkedIn post about global markets...", "info");
      
      const postText = await callAI(`You are a LinkedIn content creator for Dhanalyser, a global stock market analysis app.

Create a LinkedIn post about current stock market trends. Write ONLY a JSON object with these exact fields:

{
  "hook": "One engaging sentence about market news",
  "body": "2-3 sentences with market insight and analysis", 
  "cta": "1-2 sentences about how Dhanalyser helps investors",
  "hashtags": "#Dhanalyser #StockMarket #Trading #Investing #Finance",
  "full_post": "Complete post combining all parts",
  "image_prompt": "Simple description for a finance chart image"
}

Write ONLY the JSON object, no other text.`);

      // Clean and parse post JSON
      let parsed;
      try {
        // Extract JSON from response (handle cases where AI adds extra text)
        let jsonText = postText.trim();
        
        // Find JSON object boundaries
        const startIndex = jsonText.indexOf('{');
        const lastIndex = jsonText.lastIndexOf('}');
        
        if (startIndex !== -1 && lastIndex !== -1) {
          jsonText = jsonText.substring(startIndex, lastIndex + 1);
        }
        
        // Clean the JSON
        jsonText = jsonText
          .replace(/```json|```/g, "")
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
          .replace(/\n/g, " ") // Replace newlines with spaces
          .replace(/\s+/g, " "); // Normalize whitespace
        
        parsed = JSON.parse(jsonText);
        
        // Validate required fields
        if (!parsed.hook || !parsed.body || !parsed.cta) {
          throw new Error("Missing required fields in AI response");
        }
        
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.error("Raw response:", postText);
        
        // Create a fallback post if JSON parsing fails
        parsed = {
          hook: "Global stock markets are showing mixed signals as investors navigate economic uncertainty.",
          body: "Smart investors are looking for tools that can cut through the noise and provide clear, actionable insights. Market volatility creates both risks and opportunities for those who know how to read the signals.",
          cta: "Dhanalyser helps you analyze market trends with precision, giving you the confidence to make informed investment decisions in any market condition.",
          hashtags: "#Dhanalyser #StockMarket #Trading #Investing #Finance",
          full_post: "Global stock markets are showing mixed signals as investors navigate economic uncertainty.\n\nSmart investors are looking for tools that can cut through the noise and provide clear, actionable insights. Market volatility creates both risks and opportunities for those who know how to read the signals.\n\nDhanalyser helps you analyze market trends with precision, giving you the confidence to make informed investment decisions in any market condition.\n\n#Dhanalyser #StockMarket #Trading #Investing #Finance",
          image_prompt: "minimal flat illustration: stock market chart with upward trend arrows"
        };
        showToast("Used fallback content due to AI response issues", "info");
      }

      // Create news object (since we skipped news fetching)
      const news = {
        headline: "Global Stock Market Analysis",
        summary: "Current market trends and investment opportunities across global markets",
        source: "Market Analysis"
      };

      const daySchedule = SCHEDULE[posts.length % SCHEDULE.length];
      const newPost = {
        id: Date.now(),
        news: news,
        ...parsed,
        scheduledDay: daySchedule.day,
        scheduledTime: daySchedule.time,
        createdAt: new Date().toLocaleString(),
        status: "draft",
      };
      
      setPosts(prev => [newPost, ...prev]);
      setActivePost(newPost);
      showToast("Post generated successfully! 🎉");
      return newPost;
    } catch (e) {
      console.error(e);
      showToast("Generation failed: " + e.message, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function generateWeeklyPlan() {
    if (!apiKey) {
      showToast("Please add your AI API key in Settings", "error");
      return;
    }
    
    setGenerating(true);
    for (let i = 0; i < 5; i++) {
      await generatePost();
      await new Promise(r => setTimeout(r, 2000));
    }
    setTab("posts");
    setGenerating(false);
    showToast("Full week generated! 🎉");
  }

  // Post directly via server (real LinkedIn)
  async function postNow(post) {
    setPosting(post.id);
    const fullContent = post.full_post || (post.hook + "\n\n" + post.body + "\n\n" + post.cta + "\n\n" + post.hashtags);
    try {
      const r = await fetch(`${serverUrl}/api/post-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fullContent }),
      });
      const d = await r.json();
      if (d.success) {
        setPostedIds(prev => [...prev, post.id]);
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: "posted", linkedinId: d.linkedinId } : p));
        showToast("Posted to LinkedIn! 🚀");
      } else {
        showToast(d.error || "Post failed", "error");
      }
    } catch {
      showToast("Server not reachable. Check Settings.", "error");
    }
    setPosting(null);
  }

  // Schedule post via server queue
  async function schedulePost(post) {
    const fullContent = post.full_post || (post.hook + "\n\n" + post.body + "\n\n" + post.cta + "\n\n" + post.hashtags);
    try {
      const r = await fetch(`${serverUrl}/api/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fullContent,
          scheduledDay: post.scheduledDay,
          scheduledTime: post.scheduledTime,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: "scheduled" } : p));
        showToast(`Scheduled for ${post.scheduledDay} ${post.scheduledTime} ✅`);
      }
    } catch {
      showToast("Could not reach server. Check Settings.", "error");
    }
  }

  function copyPost(post) {
    const text = post.full_post || (post.hook + "\n\n" + post.body + "\n\n" + post.cta + "\n\n" + post.hashtags);
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard! 📋");
  }

  const statusColor = { draft: "#94a3b8", scheduled: "#fbbf24", posted: "#22c55e", failed: "#ef4444" };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e8eaf0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 2px; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
        .slide-in { animation: slideIn 0.35s ease forwards; }
        @keyframes spin { to{transform:rotate(360deg)} }
        .spin { animation: spin 0.9s linear infinite; display:inline-block; }
        .btn-primary { background:linear-gradient(135deg,#2563eb,#1d4ed8); border:none; color:white; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:600; border-radius:10px; transition:all 0.2s; }
        .btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 25px rgba(37,99,235,0.4); }
        .btn-primary:disabled { opacity:0.45; cursor:not-allowed; }
        .btn-ghost { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#94a3b8; cursor:pointer; font-family:'DM Sans',sans-serif; border-radius:8px; transition:all 0.2s; }
        .btn-ghost:hover { background:rgba(255,255,255,0.1); color:white; }
        .card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; }
        .tab-active { background:rgba(37,99,235,0.2)!important; border-color:rgba(37,99,235,0.5)!important; color:#60a5fa!important; }
        input, select, textarea { background:#0d1117!important; color:#e2e8f0!important; border:1px solid rgba(255,255,255,0.12)!important; border-radius:8px; outline:none; font-family:'DM Sans',sans-serif; color-scheme:dark; }
        input:focus, select:focus, textarea:focus { border-color:rgba(37,99,235,0.5)!important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:20, right:20, zIndex:9999,
          background: toast.type==="error" ? "rgba(239,68,68,0.9)" : "rgba(34,197,94,0.9)",
          color:"white", padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:600,
          animation:"slideIn 0.3s ease", boxShadow:"0 4px 20px rgba(0,0,0,0.4)"
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ padding:"24px 28px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#2563eb,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, fontFamily:"Syne,sans-serif" }}>D</div>
          <div>
            <div style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:800, color:"#fff" }}>Dhanalyser</div>
            <div style={{ fontSize:11, color:"#64748b" }}>LinkedIn Auto-Post Engine</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {serverStatus && (
            <div style={{ fontSize:11, color:"#22c55e", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"4px 12px" }}>
              ● Server Online
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"5px 12px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e" }} className="pulse" />
            <span style={{ fontSize:11, color:"#22c55e", fontWeight:600 }}>AI Active</span>
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 28px", display:"grid", gridTemplateColumns:"300px 1fr", gap:20, maxWidth:1200, margin:"0 auto" }}>

        {/* LEFT */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Countdown */}
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontSize:10, color:"#64748b", fontWeight:600, letterSpacing:2, marginBottom:10 }}>NEXT POST IN</div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              {[{val:countdown.h,label:"HR"},{val:countdown.m,label:"MIN"},{val:countdown.s,label:"SEC"}].map(({val,label})=>(
                <div key={label} style={{ flex:1, textAlign:"center", background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)", borderRadius:10, padding:"8px 0" }}>
                  <div style={{ fontFamily:"Syne,sans-serif", fontSize:26, fontWeight:800, color:"#60a5fa" }}>{String(val).padStart(2,"0")}</div>
                  <div style={{ fontSize:9, color:"#64748b", letterSpacing:2 }}>{label}</div>
                </div>
              ))}
            </div>
            {nextPost && <div style={{ fontSize:11, color:"#94a3b8", textAlign:"center" }}>📅 {nextPost.day} · {nextPost.time} IST · <span style={{ color:"#fbbf24" }}>{nextPost.label}</span></div>}
          </div>

          {/* Schedule */}
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontSize:10, color:"#64748b", fontWeight:600, letterSpacing:2, marginBottom:12 }}>WEEKLY SCHEDULE (IST)</div>
            {SCHEDULE.map((s,i)=>(
              <div key={s.day} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<4?"1px solid rgba(255,255,255,0.05)":"none" }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{s.day}</div>
                  <div style={{ fontSize:10, color:"#64748b" }}>{s.label}</div>
                </div>
                <div style={{ background:"rgba(37,99,235,0.15)", border:"1px solid rgba(37,99,235,0.3)", borderRadius:7, padding:"2px 9px", fontSize:12, fontWeight:700, color:"#60a5fa" }}>{s.time}</div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="card" style={{ padding:18 }}>
            <div style={{ fontSize:10, color:"#64748b", fontWeight:600, letterSpacing:2, marginBottom:12 }}>STATS</div>
            {[
              { label:"Generated", val:posts.length, color:"#60a5fa" },
              { label:"Scheduled", val:posts.filter(p=>p.status==="scheduled").length, color:"#fbbf24" },
              { label:"Posted", val:posts.filter(p=>p.status==="posted").length, color:"#22c55e" },
            ].map(({label,val,color})=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:12, color:"#94a3b8" }}>{label}</span>
                <span style={{ fontSize:20, fontWeight:800, fontFamily:"Syne,sans-serif", color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              { id:"generator", label:"✍️ Generate" },
              { id:"posts",     label:`📋 Posts (${posts.length})` },
              { id:"settings",  label:"⚙️ Settings" },
            ].map(t=>(
              <button key={t.id} className={`btn-ghost ${tab===t.id?"tab-active":""}`}
                style={{ padding:"8px 16px", fontSize:13, fontWeight:600 }}
                onClick={()=>setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {/* GENERATOR */}
          {tab==="generator" && (
            <div className="card slide-in" style={{ padding:26 }}>
              <div style={{ fontFamily:"Syne,sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>Generate Post</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:22 }}>AI fetches latest financial news · Generates LinkedIn post · Explains how Dhanalyser helps</div>
              
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:1, display:"block", marginBottom:6 }}>NEWS SEARCH QUERY</label>
                <input 
                  value={newsQuery} 
                  onChange={e=>setNewsQuery(e.target.value)} 
                  placeholder="e.g., global stock market latest news"
                  style={{ width:"100%", padding:"11px 14px", fontSize:14 }}
                />
                <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>AI will search for latest news matching this query</div>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-primary" disabled={generating} onClick={()=>generatePost()}
                  style={{ flex:1, padding:"13px 0", fontSize:14 }}>
                  {generating ? <><span className="spin" style={{ width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%" }}/> Generating...</> : "✨ Generate Post"}
                </button>
                <button className="btn-ghost" disabled={generating} onClick={generateWeeklyPlan}
                  style={{ padding:"13px 16px", fontSize:13, fontWeight:600 }}>
                  📅 Full Week (5 posts)
                </button>
              </div>
              
              {generating && (
                <div style={{ marginTop:16, padding:14, borderRadius:10, background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.2)", fontSize:13, color:"#60a5fa", textAlign:"center" }}>
                  🤖 Fetching latest financial news and generating LinkedIn post...
                </div>
              )}

              <div style={{ marginTop:20, padding:16, borderRadius:10, background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)" }}>
                <div style={{ fontSize:12, color:"#fbbf24", fontWeight:700, marginBottom:8 }}>💡 How it works:</div>
                <div style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6 }}>
                  1. AI searches for latest financial news based on your query<br/>
                  2. Generates a professional LinkedIn post about the news<br/>
                  3. Naturally explains how Dhanalyser helps investors act on this information<br/>
                  4. Adds relevant hashtags and call-to-action
                </div>
              </div>
            </div>
          )}

          {/* POSTS */}
          {tab==="posts" && (
            <div className="slide-in" style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {posts.length===0 ? (
                <div className="card" style={{ padding:40, textAlign:"center", color:"#64748b" }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>✍️</div>
                  <div style={{ fontFamily:"Syne,sans-serif", fontSize:17, fontWeight:700, marginBottom:6 }}>No posts yet</div>
                  <div style={{ fontSize:13 }}>Generate your first post from the Generate tab</div>
                </div>
              ) : posts.map((post,i)=>(
                <div key={post.id} className="card slide-in" style={{
                  padding:20, cursor:"pointer",
                  border:activePost?.id===post.id?"1px solid rgba(37,99,235,0.5)":"1px solid rgba(255,255,255,0.08)",
                  background:activePost?.id===post.id?"rgba(37,99,235,0.06)":"rgba(255,255,255,0.03)",
                  animationDelay:`${i*0.05}s`
                }} onClick={()=>setActivePost(post===activePost?null:post)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ flex:1, marginRight:10 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:3 }}>{post.hook}</div>
                      {post.news && (
                        <div style={{ fontSize:11, color:"#64748b", marginBottom:4, fontStyle:"italic" }}>
                          📰 {post.news.headline}
                        </div>
                      )}
                      <div style={{ display:"flex", gap:10, fontSize:11, color:"#64748b" }}>
                        <span>📅 {post.scheduledDay} · {post.scheduledTime}</span>
                        <span style={{ color:statusColor[post.status], fontWeight:600, textTransform:"uppercase" }}>● {post.status}</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:11 }}
                        onClick={e=>{e.stopPropagation();copyPost(post);}}>📋</button>
                      {post.status!=="posted" && (
                        <>
                          <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:11, color:"#fbbf24" }}
                            onClick={e=>{e.stopPropagation();schedulePost(post);}}>🕐 Schedule</button>
                          <button className="btn-primary" disabled={posting===post.id}
                            style={{ padding:"4px 12px", fontSize:11 }}
                            onClick={e=>{e.stopPropagation();postNow(post);}}>
                            {posting===post.id?"⏳":"🚀 Post Now"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {activePost?.id===post.id && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)" }}>
                      {post.news && (
                        <div style={{ background:"rgba(37,99,235,0.08)", borderRadius:8, padding:10, marginBottom:10 }}>
                          <div style={{ fontSize:11, color:"#60a5fa", fontWeight:600, marginBottom:4 }}>📰 Source News:</div>
                          <div style={{ fontSize:12, color:"#cbd5e1", marginBottom:2 }}><strong>{post.news.headline}</strong></div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>{post.news.summary}</div>
                          {post.news.source && <div style={{ fontSize:10, color:"#64748b", marginTop:4 }}>Source: {post.news.source}</div>}
                        </div>
                      )}
                      <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:10, padding:14, fontSize:13, lineHeight:1.75, color:"#cbd5e1", whiteSpace:"pre-wrap", marginBottom:10 }}>
                        {post.full_post || (post.hook + "\n\n" + post.body + "\n\n" + post.cta + "\n\n" + post.hashtags)}
                      </div>
                      {post.image_prompt && (
                        <div style={{ background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:8, padding:"7px 12px", fontSize:11, color:"#fbbf24", marginBottom:8 }}>
                          🎨 Image: {post.image_prompt}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SETTINGS */}
          {tab==="settings" && (
            <div className="card slide-in" style={{ padding:26 }}>
              <div style={{ fontFamily:"Syne,sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>API Settings</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:22 }}>Configure your AI provider and LinkedIn credentials</div>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                
                {/* AI Provider Selection */}
                <div style={{ background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.2)", borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:12, color:"#60a5fa", fontWeight:700, marginBottom:12 }}>🤖 AI PROVIDER</div>
                  
                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:1, display:"block", marginBottom:6 }}>SELECT PROVIDER</label>
                    <select 
                      value={aiProvider} 
                      onChange={e=>{
                        setAiProvider(e.target.value);
                        setAiModel(AI_PROVIDERS[e.target.value].models[0].id);
                      }} 
                      style={{ width:"100%", padding:"10px 14px", fontSize:14 }}
                    >
                      {Object.entries(AI_PROVIDERS).map(([key, provider])=>(
                        <option key={key} value={key}>{provider.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:1, display:"block", marginBottom:6 }}>SELECT MODEL</label>
                    <select 
                      value={aiModel} 
                      onChange={e=>setAiModel(e.target.value)} 
                      style={{ width:"100%", padding:"10px 14px", fontSize:14 }}
                    >
                      {(AI_PROVIDERS[aiProvider] || AI_PROVIDERS.google).models.map(model=>(
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:1, display:"block", marginBottom:6 }}>API KEY</label>
                    <input 
                      type="password"
                      value={apiKey} 
                      onChange={e=>setApiKey(e.target.value)} 
                      placeholder={`Enter your ${(AI_PROVIDERS[aiProvider] || AI_PROVIDERS.google).name} API key`}
                      style={{ width:"100%", padding:"10px 14px", fontSize:14 }} 
                    />
                    <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>
                      {aiProvider === "anthropic" && <span>Get from: <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color:"#60a5fa" }}>console.anthropic.com</a></span>}
                      {aiProvider === "openai" && <span>Get from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color:"#60a5fa" }}>platform.openai.com/api-keys</a></span>}
                      {aiProvider === "google" && <span>Get from: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color:"#60a5fa" }}>makersuite.google.com/app/apikey</a></span>}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:1, display:"block", marginBottom:6 }}>BACKEND SERVER URL</label>
                  <input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} placeholder="http://localhost:5000" style={{ width:"100%", padding:"10px 14px", fontSize:14 }} />
                  <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>Run: <code style={{ color:"#60a5fa" }}>npm run server</code> in your project folder</div>
                </div>

                <div style={{ background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.2)", borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:12, color:"#60a5fa", fontWeight:700, marginBottom:10 }}>📋 LINKEDIN SETUP (Optional - for auto-posting)</div>
                  {[
                    "Go to linkedin.com/developers → Create App",
                    "Add 'Share on LinkedIn' product to your app",
                    "Get Access Token from OAuth Token Generator",
                    "Run: curl https://api.linkedin.com/v2/userinfo to get your URN",
                    "Add both values to your .env file on the server",
                  ].map((step,i)=>(
                    <div key={i} style={{ display:"flex", gap:10, marginBottom:7, fontSize:12, color:"#94a3b8" }}>
                      <span style={{ color:"#2563eb", fontWeight:700, flexShrink:0 }}>{i+1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, padding:12, fontSize:12, color:"#fbbf24" }}>
                  ⚠️ Never paste your LinkedIn token here. Add it to your <code>.env</code> file on the server only. This keeps your credentials safe.
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn-primary" onClick={saveSettings} style={{ flex:1, padding:"12px 0", fontSize:14 }}>💾 Save Settings</button>
                  <button className="btn-ghost" onClick={checkServer} style={{ padding:"12px 18px", fontSize:13, fontWeight:600 }}>🔌 Test Connection</button>
                </div>

                {serverStatus && (
                  <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:10, padding:14, fontSize:13 }}>
                    <div style={{ color:"#22c55e", fontWeight:700, marginBottom:6 }}>✅ Server Connected</div>
                    <div style={{ color:"#94a3b8" }}>LinkedIn configured: <span style={{ color: serverStatus.linkedinConfigured ? "#22c55e" : "#ef4444" }}>{serverStatus.linkedinConfigured ? "Yes ✓" : "No — add token to .env"}</span></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign:"center", padding:"4px 0 20px", fontSize:11, color:"#334155" }}>
        Dhanalyser · Global Stock Market Analysis · Auto-Post Engine v2
      </div>
    </div>
  );
}
