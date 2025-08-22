const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Discord webhook URL
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1406939888166768640/xO3plSnu8JXBBwNF7KD8c2CZaIo87xA49nZB8Jkxpr7mLb45yZVNDzbKYUQcU0RhB7aH"; // replace with your webhook

app.use(bodyParser.json());
app.use(cors());
app.use(express.static("../frontend")); // serve frontend

// SQLite DB
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error(err.message);
  else console.log("✅ Connected to SQLite database");
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    userid TEXT,
    reason TEXT,
    duration TEXT,
    proof TEXT,
    reporter TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Submit report
app.post("/api/report", (req, res) => {
  const { username, userid, reason, duration, proof, reporter } = req.body;

  if (!username || !userid || !reason || !duration || !proof || !reporter) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const stmt = db.prepare(`
    INSERT INTO reports (username, userid, reason, duration, proof, reporter)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(username, userid, reason, duration, proof, reporter, function(err) {
    if (err) return res.status(500).json({ message: err.message });

    const caseId = this.lastID;

    // Send Discord webhook
    axios.post(DISCORD_WEBHOOK, {
      content: `@everyone 🚨 **New Suspension Report** 🚨\nCase #${caseId} | User: ${username} | Reason: ${reason} | Duration: ${duration} | Reporter: ${reporter}\nProof: ${proof}`
    }).catch(console.error);

    res.json({ message: "Report submitted!", caseId });
  });

  stmt.finalize();
});

// Get all reports
app.get("/api/reports", (req, res) => {
  db.all("SELECT * FROM reports ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
