// app.js
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const LOG_FILE = path.join(__dirname, "logs.json");

// Ensure logs file exists
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "[]");

function readLogs() {
  return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
}
function writeLogs(data) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
}

app.post("/api/log", (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  const logs = readLogs();
  const entry = { url, time: new Date().toISOString() };
  logs.push(entry);
  writeLogs(logs);

  console.log("Logged:", url);
  res.json({ success: true });
});

app.get("/api/list", (req, res) => {
  res.json(readLogs());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));
