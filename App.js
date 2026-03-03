import { useState, useEffect, useRef } from "react";

const TOPICS = [
  "How war is disrupting global financial systems",
  "Fintech solutions for economic uncertainty",
  "Digital payments in conflict zones",
  "Crypto as a financial lifeline in crisis",
  "Building resilient fintech infrastructure",
  "Currency volatility and cross-border payments",
  "Financial inclusion in a fractured world",
  "Stablecoins and geopolitical risk",
  "The future of banking in unstable economies",
  "How Dhanalyer is solving financial fragility",
];

const SCHEDULE = [
  { day: "Monday",    time: "11:30", label: "Mid-morning Power" },
  { day: "Tuesday",   time: "09:30", label: "Peak Day ⭐" },
  { day: "Wednesday", time: "12:30", label: "Afternoon Surge" },
  { day: "Thursday",  time: "14:30", label: "Deep Dive" },
  { day: "Friday",    time: "09:30", label: "Weekend Lead" },
];

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

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
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [activePost, setActivePost] = useState(null);
  const [posting, setPosting] = useState(null);
  const [postedIds, setPostedIds] = useState([]);
  const [tab, setTab] = useState("generator");
  // LinkedIn API settings
  const [accessToken, setAccessToken] = useState(localStorage.getItem("li_token") || "");
  const [personUrn, setPersonUrn]     = useState(localStorage.getItem("li_urn") || "");
  const [serverUrl, setServerUrl]     = useState(localStorage.getItem("server_url") || "http://localhost:5000");
  const [serverStatus, setServerStatus] = useState(null);
  const [toast, setToast] = useState(null);

  const nextPost  = getNextPostInfo();
  const countdown = useCountdown(nextPost?.target);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem("li_token", accessToken);
    localStorage.setItem("li_urn", personUrn);
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

  async function generatePost(topicOverride) {
    setGenerating(true);
    const topic = topicOverride || selectedTopic;
    const daySchedule = SCHEDULE[TOPICS.indexOf(topic) % SCHEDULE.length];
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a LinkedIn content strategist for Dhanalyer, a fintech startup building resilient financial infrastructure for an uncertain world.

Write a high-engagement LinkedIn post about: "${topic}"

Rules:
- Bold hook opener (not starting with "I")
- 3-5 emojis used strategically
- Include data/stats bullet points
- End with a thought-provoking question
- 5 relevant hashtags
- Mention Dhanalyer naturally
- Under 280 words
- Founder-authentic tone

Return JSON ONLY (no markdown backticks):
{"hook":"...","body":"full post text","hashtags":["tag1","tag2","tag3","tag4","tag5"],"engagement_tip":"one tip"}`
          }]
        })
      });
      const data = await response.json();
      const text = data.content.map(i => i.text || "").join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const newPost = {
        id: Date.now(),
        topic,
        ...parsed,
        scheduledDay: daySchedule.day,
        scheduledTime: daySchedule.time,
        createdAt: new Date().toLocaleString(),
        status: "draft",
      };
      setPosts(prev => [newPost, ...prev]);
      setActivePost(newPost);
      return newPost;
    } catch (e) {
      showToast("Generation failed: " + e.message, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function generateWeeklyPlan() {
    setGenerating(true);
    for (let i = 0; i < 5; i++) {
      await generatePost(TOPICS[i]);
      await new Promise(r => setTimeout(r, 600));
    }
    setTab("posts");
    setGenerating(false);
    showToast("Full week generated! 🎉");
  }

  // Post directly via server (real LinkedIn)
  async function postNow(post) {
    setPosting(post.id);
    const fullContent = post.body + "\n\n" + post.hashtags.map(h => "#" + h).join(" ");
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
    const fullContent = post.body + "\n\n" + post.hashtags.map(h => "#" + h).join(" ");
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
        showToast(`Scheduled for ${post.scheduledDay} ${post.scheduledTime} IST ✅`);
      }
    } catch {
      showToast("Could not reach server. Check Settings.", "error");
    }
  }

  function copyPost(post) {
    const text = post.body + "\n\n" + post.hashtags.map(h => "#" + h).join(" ");
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
            <div style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:800, color:"#fff" }}>Dhanalyer</div>
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
              { id:"topics",    label:"🌍 Topics" },
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
              <div style={{ fontSize:13, color:"#64748b", marginBottom:22 }}>AI writes · You approve · Server posts automatically</div>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:1, display:"block", marginBottom:6 }}>SELECT TOPIC</label>
                <select value={selectedTopic} onChange={e=>setSelectedTopic(e.target.value)} style={{ width:"100%", padding:"11px 14px", fontSize:14 }}>
                  {TOPICS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn-primary" disabled={generating} onClick={()=>generatePost()}
                  style={{ flex:1, padding:"13px 0", fontSize:14 }}>
                  {generating ? <><span className="spin" style={{ width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%" }}/> Generating...</> : "✨ Generate Post"}
                </button>
                <button className="btn-ghost" disabled={generating} onClick={generateWeeklyPlan}
                  style={{ padding:"13px 16px", fontSize:13, fontWeight:600 }}>
                  📅 Full Week
                </button>
              </div>
              {generating && (
                <div style={{ marginTop:16, padding:14, borderRadius:10, background:"rgba(37,99,235,0.08)", border:"1px solid rgba(37,99,235,0.2)", fontSize:13, color:"#60a5fa", textAlign:"center" }}>
                  🤖 Writing your Dhanalyer post about war & fintech...
                </div>
              )}
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
                      <div style={{ display:"flex", gap:10, fontSize:11, color:"#64748b" }}>
                        <span>📅 {post.scheduledDay} · {post.scheduledTime} IST</span>
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
                      <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:10, padding:14, fontSize:13, lineHeight:1.75, color:"#cbd5e1", whiteSpace:"pre-wrap", marginBottom:10 }}>{post.body}</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                        {post.hashtags?.map(h=>(
                          <span key={h} style={{ background:"rgba(37,99,235,0.15)", border:"1px solid rgba(37,99,235,0.25)", borderRadius:6, padding:"2px 9px", fontSize:11, color:"#60a5fa", fontWeight:600 }}>#{h}</span>
                        ))}
                      </div>
                      <div style={{ background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:8, padding:"7px 12px", fontSize:12, color:"#fbbf24" }}>💡 {post.engagement_tip}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TOPICS */}
          {tab==="topics" && (
            <div className="card slide-in" style={{ padding:22 }}>
              <div style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:800, marginBottom:4 }}>Content Themes</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:18 }}>War × Fintech × Dhanalyer — click to generate</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {TOPICS.map((topic,i)=>(
                  <div key={topic} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, cursor:"pointer", transition:"all 0.2s" }}
                    onClick={()=>{setSelectedTopic(topic);setTab("generator");}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(37,99,235,0.4)"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"}>
                    <div style={{ width:26, height:26, borderRadius:7, flexShrink:0, background:`linear-gradient(135deg,hsl(${i*36},70%,40%),hsl(${i*36+60},70%,55%))`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"white" }}>{i+1}</div>
                    <span style={{ fontSize:13, color:"#cbd5e1" }}>{topic}</span>
                    <span style={{ marginLeft:"auto", fontSize:12, color:"#64748b" }}>→</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab==="settings" && (
            <div className="card slide-in" style={{ padding:26 }}>
              <div style={{ fontFamily:"Syne,sans-serif", fontSize:22, fontWeight:800, marginBottom:4 }}>LinkedIn API Settings</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:22 }}>Connect your server & LinkedIn credentials to enable real posting</div>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div>
                  <label style={{ fontSize:11, color:"#94a3b8", fontWeight:600, letterSpacing:1, display:"block", marginBottom:6 }}>BACKEND SERVER URL</label>
                  <input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} placeholder="http://localhost:5000" style={{ width:"100%", padding:"10px 14px", fontSize:14 }} />
                  <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>Run: <code style={{ color:"#60a5fa" }}>node server/index.js</code> in your project folder</div>
                </div>

                <div style={{ background:"rgba(37,99,235,0.06)", border:"1px solid rgba(37,99,235,0.2)", borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:12, color:"#60a5fa", fontWeight:700, marginBottom:10 }}>📋 SETUP STEPS</div>
                  {[
                    "Go to linkedin.com/developers → Create App",
                    "Add 'Share on LinkedIn' product to your app",
                    "Get Access Token from OAuth Token Generator",
                    "Run: curl https://api.linkedin.com/v2/userinfo to get your URN",
                    "Copy both values into your .env file",
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
        Dhanalyer · Fintech for a Resilient World · Auto-Post Engine v2
      </div>
    </div>
  );
}
