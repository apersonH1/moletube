import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(express.static("."));

// ===== Config =====
const YT_API_KEY = process.env.YT_API_KEY || "AIzaSyDbsZ26DZGrXukzrZGHUEsOUQ_dr_sIuAY";
const BIN_ID = process.env.BIN_ID || "68f851a4ae596e708f23119e";
const JSONBIN_KEY = process.env.JSONBIN_KEY || "$2a$10$ivvZBRxRHoqZjHMO5OM2oeCpbPhOrq7bzmxdzR.9eB9OoRcPi9UZi";
const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ===== Helper functions =====
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

async function readLogs() {
  try {
    const res = await fetch(BASE_URL, { headers: { "X-Master-Key": JSONBIN_KEY } });
    const data = await res.json();
    return Array.isArray(data.record) ? data.record : data.record.data || [];
  } catch {
    return [];
  }
}

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

// ===== Log endpoint =====
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

// ===== Random Shorts feed =====
app.get("/api/shorts", async (req, res) => {
  let logs = await readLogs();
  const nocookieShorts = logs.filter(v => v.url.includes("youtube-nocookie.com"));

  if (nocookieShorts.length < 5) {
    const randomWords = ["funny", "music", "tech", "animals", "sports", "games"];
    const query = randomWords[Math.floor(Math.random() * randomWords.length)];
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=5&q=${query}&key=${YT_API_KEY}`;
    const ytRes = await fetch(ytUrl);
    const data = await ytRes.json();

    for (const item of data.items || []) {
      const id = item.id.videoId;
      const noCookieUrl = `https://www.youtube-nocookie.com/embed/${id}`;
      if (logs.find(v => v.url === noCookieUrl)) continue;

      const entry = {
        url: noCookieUrl,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        loggedAt: new Date().toISOString(),
      };
      logs.push(entry);
    }

    await saveLogs(logs);
  }

  const updated = await readLogs();
  const readyShorts = updated
    .filter(v => v.url.includes("youtube-nocookie.com"))
    .sort(() => 0.5 - Math.random())
    .slice(0, 1);

  res.json(readyShorts);
});

// ===== Random unique homepage fetch =====
app.get("/api/fetch-random", async (req, res) => {
  let logs = await readLogs();

  const randomWords = ["funny", "music", "tech", "nature", "animals", "sports", "gaming"];
  const query = randomWords[Math.floor(Math.random() * randomWords.length)];
  const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${query}&key=${YT_API_KEY}`;
  const ytRes = await fetch(ytUrl);
  const data = await ytRes.json();

  if (!data.items) return res.json({ added: 0 });

  let added = 0;
  for (const item of data.items) {
    const id = item.id.videoId;
    const noCookieUrl = `https://www.youtube-nocookie.com/embed/${id}`;
    if (logs.find(v => v.url === noCookieUrl)) continue;

    const entry = {
      url: noCookieUrl,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      loggedAt: new Date().toISOString(),
    };
    logs.push(entry);
    added++;
  }

  await saveLogs(logs);
  res.json({ added });
});

// ===== Search API =====
app.get("/api/search", async (req, res) => {
  const q = req.query.q || "popular";
  const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(q)}&key=${YT_API_KEY}`;
  const ytRes = await fetch(ytUrl);
  const data = await ytRes.json();
  res.json(data);
});

app.listen(3000, () => console.log("✅ Moletube running on port 3000"));
