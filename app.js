const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

const logs = [];

app.post("/api/log", (req, res) => {
  const { url } = req.body;
  if (
    !url ||
    !/^https?:\/\/(www\.)?youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+/.test(url)
  ) {
    return res.status(400).json({ error: "Invalid URL" });
  }
  logs.push({ url, createdAt: new Date().toISOString() });
  console.log("Logged:", url);
  res.json({ ok: true });
});

app.get("/api/list", (req, res) => res.json(logs));

app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
