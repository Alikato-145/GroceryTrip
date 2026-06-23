-- ไฟล์: server/db/schema.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rooms (
  id              TEXT PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,      -- 6 ตัวอักษร A-Z0-9
  name            TEXT NOT NULL,
  host_token      TEXT NOT NULL,             -- UUID ที่ออกให้ host
  host_member_id  TEXT,                      -- member ID ของ host (สร้างอัตโนมัติตอน create)
  vat_mode        TEXT NOT NULL DEFAULT 'none',
  -- 'none'     = ไม่มี VAT เลย
  -- 'flat'     = VAT 7% ทุกรายการ
  -- 'per_item' = แต่ละรายการตั้งค่าแยก
  vat_rate        REAL NOT NULL DEFAULT 0.07,
  status          TEXT NOT NULL DEFAULT 'open',
  -- 'open'     = เปิดอยู่ join ได้
  -- 'locked'   = ไม่รับ member ใหม่ แต่ใช้งานได้
  -- 'finished' = จบแล้ว แสดง settlement ไม่รับการแก้ไข
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,      -- UUID ที่ออกให้ member
  joined_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS groupInroom (
  id           TEXT PRIMARY KEY,
  room_id      TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS groupsInroomMembers (
  id           TEXT PRIMARY KEY,
  group_id     TEXT NOT NULL REFERENCES groupsInroom(id) ON DELETE CASCADE,
  member_id    TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  joined_at   TEXT NOT NULL DEFAULT (datetime('now')),
);

CREATE TABLE IF NOT EXISTS items (
  id           TEXT PRIMARY KEY,
  room_id      TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  note         TEXT,                     -- เช่น "500g", "2 ถุง"
  vat_apply    INTEGER NOT NULL DEFAULT 1, -- 1 = บวก VAT, 0 = ไม่บวก
  claimed_by   TEXT REFERENCES members(id) ON DELETE SET NULL,
  price        REAL,                     -- ราคาจริงที่จ่าย (รวม VAT แล้ว)
  receipt_url  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- trigger อัพเดต updated_at อัตโนมัติ
CREATE TRIGGER IF NOT EXISTS items_updated_at
  AFTER UPDATE ON items
  BEGIN
    UPDATE items SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
