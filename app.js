import express from "express";
import fs from "fs"; // optional if you ever want local backup

const app = express();
app.use(express.json());
app.use(express.static("."));

// YouTube API key (set as environment variable in Render)
const YT_API_KEY = process.env.YT_API_KEY;

// JSONBin info (set these in Render → Environment Variables)
const BIN_ID = process.env.BIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Extract YouTube video ID
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

// Read logs from JSONBin
async function readLogs() {
  try {
    const res = await fetch(BASE_URL, {
      headers: { "X-Master-Key": JSONBIN_KEY }
    });
    const data = await res.json();
    // Support both [] and { data: [] } bin formats
    return Array.isArray(data.record)
      ? data.record
      : data.record.data || [];
  } catch (err) {
    console.error("❌ Failed to load logs:", err);
    return [];
  }
}

// Save logs back to JSONBin
async function saveLogs(logs) {
  try {
    await fetch(BASE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_KEY
      },
      // Save using object wrapper for compatibility
      body: JSON.stringify({ data: logs })
    });
  } catch (err) {
    console.error("❌ Failed to save logs:", err);
  }
}

// POST /api/log — convert & log (no duplicates)
app.post("/api/log", async (req, res) => {
  const { url } = req.body;
  const id = extractYouTubeId(url);
  if (!id) return res.status(400).json({ error: "Invalid YouTube URL" });

  const noCookieUrl = `https://www.youtube-nocookie.com/embed/${id}`;
  const logs = await readLogs();

  const existing = logs.find(entry => entry.url === noCookieUrl);
  if (existing) return res.status(200).json({ ...existing, duplicate: true });

  // Fetch metadata from YouTube
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
  await saveLogs(logs);

  res.json({ ...newEntry, duplicate: false });
});

// GET /api/list — show all logs
app.get("/api/list", async (req, res) => {
  const logs = await readLogs();
  res.json(logs);
});

app.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);
