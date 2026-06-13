const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "../../data/grocerytrip.db");

// สร้าง directory ถ้าไม่มี
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// รัน schema (CREATE TABLE IF NOT EXISTS — ปลอดภัยรัน ซ้ำได้)
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// Migration: เพิ่ม host_member_id ถ้า column ยังไม่มี (รองรับ DB เก่า)
try {
  db.exec("ALTER TABLE rooms ADD COLUMN host_member_id TEXT");
} catch (_) {
  // column มีอยู่แล้ว — ข้ามได้เลย
}

module.exports = db;
