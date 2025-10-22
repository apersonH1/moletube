import express from "express";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.static("."));

const LOG_FILE = "logs.json";
const YT_API_KEY = process.env.YT_API_KEY;

// Read logs safely
function readLogs() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE));
  } catch {
    return [];
  }
}

// Save logs
function saveLogs(logs) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

// Extract YouTube video ID from any valid link
function extractYouTubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
    const match = parsed.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

// POST /api/log — convert + log (no duplicates)
app.post("/api/log", async (req, res) => {
  const { url } = req.body;
  const id = extractYouTubeId(url);
  if (!id) return res.status(400).json({ error: "Invalid YouTube URL" });

  const noCookieUrl = `https://www.youtube-nocookie.com/embed/${id}`;

  const logs = readLogs();

  // If already logged, return existing entry silently
  const existing = logs.find(entry => entry.url === noCookieUrl);
  if (existing) {
    return res.status(200).json({ ...existing, duplicate: true });
  }

  // Fetch metadata from YouTube API
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${id}&part=snippet&key=${YT_API_KEY}`;
  const apiRes = await fetch(apiUrl);
  const data = await apiRes.json();

  let title = "Unknown Title";
  let channel = "Unknown Channel";

  if (data.items && data.items.length > 0) {
    const snippet = data.items[0].snippet;
    title = snippet.title;
    channel = snippet.channelTitle;
  }

  const newEntry = {
    url: noCookieUrl,
    title,
    channel,
    loggedAt: new Date().toISOString()
  };

  logs.push(newEntry);
  saveLogs(logs);

  res.json({ ...newEntry, duplicate: false });
});

// GET /api/list — return all logs
app.get("/api/list", (req, res) => {
  res.json(readLogs());
});

app.listen(3000, () =>
  console.log("✅ Server running at http://localhost:3000")
);
