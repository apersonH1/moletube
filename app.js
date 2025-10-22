import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("."));

// Config (you can hardcode these for JSBin testing)
const YT_API_KEY = process.env.YT_API_KEY || "YOUR_YOUTUBE_API_KEY";
const BIN_ID = process.env.BIN_ID || "YOUR_JSONBIN_ID";
const JSONBIN_KEY = process.env.JSONBIN_KEY || "YOUR_JSONBIN_MASTER_KEY";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

//  Helper: extract YouTube ID
function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const match = u.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

// Read logs
async function readLogs() {
  try {
    const res = await fetch(BASE_URL, { headers: { "X-Master-Key": JSONBIN_KEY } });
    const data = await res.json();
    return Array.isArray(data.record)
      ? data.record
      : data.record.data || [];
  } catch {
    return [];
  }
}

// 🧩 Save logs
async function saveLogs(logs) {
  await fetch(BASE_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_KEY,
    },
    body: JSON.stringify({ data: logs }),
  });
}

// /api/log — convert & log once
app.post("/api/log", async (req, res) => {
  const { url } = req.body;
  const id = extractYouTubeId(url);
  if (!id) return res.status(400).json({ error: "Invalid YouTube URL" });

  const noCookieUrl = `https://www.youtube-nocookie.com/embed/${id}`;
  const logs = await readLogs();

  if (logs.find((v) => v.url === noCookieUrl))
    return res.status(200).json({ url: noCookieUrl, duplicate: true });

  const infoUrl = `https://www.googleapis.com/youtube/v3/videos?id=${id}&part=snippet&key=${YT_API_KEY}`;
  const infoRes = await fetch(infoUrl);
  const info = await infoRes.json();
  const snippet = info.items?.[0]?.snippet || {};

  const entry = {
    url: noCookieUrl,
    title: snippet.title || "Unknown Title",
    channel: snippet.channelTitle || "Unknown Channel",
    loggedAt: new Date().toISOString(),
  };
  logs.push(entry);
  await saveLogs(logs);
  res.json(entry);
});

// /api/shorts — random nocookie Shorts feed
app.get("/api/shorts", async (req, res) => {
  const randomWords = ["funny", "music", "tech", "animals", "sports", "games"];
  const query = randomWords[Math.floor(Math.random() * randomWords.length)];
  const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=5&q=${query}&key=${YT_API_KEY}`;
  const ytRes = await fetch(ytUrl);
  const data = await ytRes.json();

  const logs = await readLogs();
  const newShorts = [];

  for (const item of data.items || []) {
    const id = item.id.videoId;
    const noCookieUrl = `https://www.youtube-nocookie.com/embed/${id}`;
    if (logs.find((v) => v.url === noCookieUrl)) continue;

    const entry = {
      url: noCookieUrl,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      loggedAt: new Date().toISOString(),
    };
    newShorts.push(entry);
    logs.push(entry);
  }

  if (newShorts.length) await saveLogs(logs);
  res.json(newShorts);
});

// Start server
app.listen(3000, () => console.log("✅ Moletube server running on port 3000"));
