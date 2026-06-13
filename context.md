# GroceryTrip — AI Agent Context

> **คำสั่งสำหรับ AI (Claude ใน Zed หรือ AI อื่นๆ):**
> อ่านไฟล์นี้ทั้งหมดก่อนเริ่มสร้างโปรเจกต์ ไฟล์นี้คือ source of truth ของโปรเจกต์
> ห้าม assume หรือ improvise สิ่งที่ไม่ได้เขียนไว้ ถ้าไม่แน่ใจให้ถามก่อน

---

## 1. โปรเจกต์นี้คืออะไร

**GroceryTrip** คือเว็บแอปสำหรับกลุ่มเพื่อนที่ไปทริปด้วยกันแล้วต้องซื้อวัตถุดิบมาทำอาหารร่วมกัน

### ปัญหาที่แก้
- แยกกันไปซื้อของหลายที่แล้วซื้อซ้ำกันโดยไม่รู้
- หารเงินลำบาก ว่าใครออกไปเท่าไหร่ ใครต้องจ่ายคืนใคร
- บางร้านมี VAT 7% บางร้านไม่มี คำนวณยาก

### User Flow หลัก
```
Host สร้างห้อง
  → ได้ Room Code 6 หลัก
  → List รายการวัตถุดิบทั้งหมดที่ต้องซื้อ
  → ตั้งค่า VAT (ถ้ามี)

Member join ห้องด้วย Room Code
  → เห็นรายการทั้งหมด
  → ติ๊ก "ฉันจะซื้อ" ในรายการที่ตัวเองรับผิดชอบ
  → รายการถูก lock ทันที ป้องกันคนอื่นซื้อซ้ำ

หลังซื้อของเสร็จ
  → Member ใส่ราคาจริงที่จ่าย (รวม VAT แล้ว)
  → ระบบคำนวณสรุป: ใครต้องโอนเงินให้ใครเท่าไหร่
```

---

## 2. ข้อตกลงที่ตัดสินใจแล้ว (ห้ามเปลี่ยน)

| ประเด็น | การตัดสินใจ | เหตุผล |
|---|---|---|
| Authentication | ไม่มี login/account | ลดความซับซ้อน |
| Identity | Token-based (localStorage) | ออก token ตอนสร้าง/join ห้อง |
| Real-time | Polling ทุก 3 วินาที | ไม่ต้องการ WebSocket |
| Platform | Web browser เท่านั้น | ไม่ใช่ native app |
| Database | SQLite (dev) / PostgreSQL (prod) | เริ่ม SQLite ก่อน |
| ใครปิดห้อง | Host เท่านั้น | ระบบไม่ลบห้องอัตโนมัติ |
| ภาษา UI | ภาษาไทย | กลุ่มเป้าหมายเป็นคนไทย |
| ภาษาโค้ด | อังกฤษ | มาตรฐานสากล |

---

## 3. Tech Stack

```
Frontend : React 18 + Vite
Backend  : Node.js + Express 4
Database : better-sqlite3 (dev) → pg (prod)
Styling  : Tailwind CSS v3
Router   : React Router v6
HTTP     : axios (client) / express (server)
```

### โครงสร้างโฟลเดอร์ที่ต้องสร้าง

```
grocerytrip/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── pages/
│       │   ├── Home.jsx          # หน้าแรก: สร้าง / join ห้อง
│       │   ├── RoomHost.jsx      # หน้า Host
│       │   └── RoomMember.jsx    # หน้า Member
│       ├── components/
│       │   ├── ItemList.jsx      # ตารางรายการวัตถุดิบ
│       │   ├── ItemRow.jsx       # แถวเดียวของรายการ
│       │   ├── MemberList.jsx    # รายชื่อสมาชิกในห้อง
│       │   ├── Settlement.jsx    # สรุปการหารเงิน
│       │   └── VatBadge.jsx      # badge แสดงสถานะ VAT
│       ├── hooks/
│       │   ├── usePolling.js     # polling setInterval wrapper
│       │   └── useRoom.js        # room state + token management
│       └── utils/
│           ├── api.js            # axios instance + interceptors
│           ├── settlement.js     # greedy minimize-transactions algorithm
│           └── token.js          # localStorage get/set/clear helpers
│
├── server/
│   ├── package.json
│   ├── app.js                    # Express entry point
│   ├── db/
│   │   ├── schema.sql            # CREATE TABLE statements
│   │   └── db.js                 # SQLite/Postgres connection
│   ├── models/
│   │   ├── Room.js
│   │   ├── Member.js
│   │   └── Item.js
│   ├── controllers/
│   │   ├── roomController.js
│   │   ├── memberController.js
│   │   └── itemController.js
│   ├── routes/
│   │   ├── roomRoutes.js
│   │   ├── memberRoutes.js
│   │   └── itemRoutes.js
│   └── middleware/
│       └── auth.js               # verifyHostToken / verifyMemberToken
│
├── README.md
└── context.md                    # ไฟล์นี้
```

---

## 4. Database Schema (SQLite syntax)

```sql
-- ไฟล์: server/db/schema.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,      -- 6 ตัวอักษร A-Z0-9
  name        TEXT NOT NULL,
  host_token  TEXT NOT NULL,             -- UUID ที่ออกให้ host
  vat_mode    TEXT NOT NULL DEFAULT 'none',
  -- 'none'     = ไม่มี VAT เลย
  -- 'flat'     = VAT 7% ทุกรายการ
  -- 'per_item' = แต่ละรายการตั้งค่าแยก
  vat_rate    REAL NOT NULL DEFAULT 0.07,
  status      TEXT NOT NULL DEFAULT 'open',
  -- 'open'   = เปิดอยู่ join ได้
  -- 'locked' = ไม่รับ member ใหม่ แต่ใช้งานได้
  -- 'closed' = ปิดแล้ว อ่านอย่างเดียว
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,      -- UUID ที่ออกให้ member
  joined_at   TEXT NOT NULL DEFAULT (datetime('now'))
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
```

---

## 5. API Endpoints

### Headers ที่ใช้ใน request

```
X-Host-Token   : token ที่ได้ตอนสร้างห้อง  (สำหรับ operation ที่ต้องการสิทธิ์ Host)
X-Member-Token : token ที่ได้ตอน join       (สำหรับ operation ทั่วไป)
```

### Room Routes

```
POST   /api/rooms
  body: { name: string, vatMode: 'none'|'flat'|'per_item' }
  res:  { roomId, code, hostToken }

POST   /api/rooms/:code/join
  body: { name: string }
  res:  { roomId, memberId, memberToken }

GET    /api/rooms/:id
  header: X-Member-Token
  res:  { id, code, name, vatMode, vatRate, status, memberCount }

PATCH  /api/rooms/:id/lock
  header: X-Host-Token
  res:  { status: 'locked' }

DELETE /api/rooms/:id
  header: X-Host-Token
  res:  { deleted: true }

PATCH  /api/rooms/:id/vat
  header: X-Host-Token
  body: { vatMode, vatRate }
  res:  { vatMode, vatRate }

GET    /api/rooms/:id/settlement
  header: X-Member-Token
  res:  { totalCost, perHead, balances: [...], transactions: [...] }
```

### Member Routes

```
GET    /api/rooms/:id/members
  header: X-Member-Token
  res:  [{ id, name, joinedAt }]

DELETE /api/rooms/:id/members/:memberId
  header: X-Host-Token
  res:  { removed: true }
```

### Item Routes

```
GET    /api/rooms/:id/items
  header: X-Member-Token
  res:  [{ id, name, note, vatApply, claimedBy, claimedByName, price, receiptUrl, sortOrder }]

POST   /api/rooms/:id/items
  header: X-Host-Token
  body: { name, note?, vatApply? }
  res:  { id, name, note, vatApply, sortOrder }

PATCH  /api/rooms/:id/items/:itemId
  header: X-Host-Token
  body: { name?, note?, vatApply? }
  res:  { updated: true }

DELETE /api/rooms/:id/items/:itemId
  header: X-Host-Token
  หมายเหตุ: ลบได้เฉพาะ item ที่ยังไม่ถูก claim
  res:  { deleted: true }

POST   /api/rooms/:id/items/:itemId/claim
  header: X-Member-Token
  หมายเหตุ: return 409 ถ้ามีคน claim แล้ว
  res:  { claimedBy: memberId }

DELETE /api/rooms/:id/items/:itemId/claim
  header: X-Member-Token
  หมายเหตุ: unclaim ได้เฉพาะของตัวเอง
  res:  { unclaimed: true }

PATCH  /api/rooms/:id/items/:itemId/price
  header: X-Member-Token
  body: { price: number }
  หมายเหตุ: แก้ได้เฉพาะ item ที่ตัวเอง claim
  res:  { updated: true }

POST   /api/rooms/:id/items/:itemId/receipt
  header: X-Member-Token
  body: { receiptUrl: string }
  res:  { updated: true }
```

---

## 6. Business Logic สำคัญ

### 6.1 Settlement Algorithm

```javascript
// ไฟล์: client/src/utils/settlement.js

/**
 * คำนวณว่าใครต้องโอนเงินให้ใคร
 * input: items[] ที่มี price แล้ว, members[]
 * output: transactions[] = [{ from, to, amount }]
 */
function calculateSettlement(items, members) {
  // 1. รวมยอดที่แต่ละคนออกไป
  const paid = {}
  members.forEach(m => paid[m.id] = 0)

  items
    .filter(i => i.price != null && i.claimedBy != null)
    .forEach(i => { paid[i.claimedBy] = (paid[i.claimedBy] || 0) + i.price })

  // 2. คำนวณ per head
  const total = Object.values(paid).reduce((a, b) => a + b, 0)
  const perHead = total / members.length

  // 3. คำนวณ balance ของแต่ละคน
  const balances = members.map(m => ({
    memberId: m.id,
    name: m.name,
    paid: paid[m.id] || 0,
    balance: (paid[m.id] || 0) - perHead  // บวก = คนอื่นค้าง, ลบ = ต้องจ่ายเพิ่ม
  }))

  // 4. Greedy minimize transactions
  const creditors = balances.filter(b => b.balance > 0.01).sort((a,b) => b.balance - a.balance)
  const debtors   = balances.filter(b => b.balance < -0.01).sort((a,b) => a.balance - b.balance)
  const transactions = []

  let ci = 0, di = 0
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci].balance
    const debt   = Math.abs(debtors[di].balance)
    const amount = Math.min(credit, debt)

    transactions.push({
      from:   debtors[di].name,
      fromId: debtors[di].memberId,
      to:     creditors[ci].name,
      toId:   creditors[ci].memberId,
      amount: Math.round(amount * 100) / 100
    })

    creditors[ci].balance -= amount
    debtors[di].balance   += amount

    if (Math.abs(creditors[ci].balance) < 0.01) ci++
    if (Math.abs(debtors[di].balance)   < 0.01) di++
  }

  return { total, perHead, balances, transactions }
}
```

### 6.2 Token Generation

```javascript
// ใช้ crypto.randomUUID() ทั้งหมด — ทั้ง host_token, member token, id
// Room code ใช้: Math.random().toString(36).substring(2,8).toUpperCase()
```

### 6.3 Claim Lock Logic

```javascript
// server/controllers/itemController.js — claimItem
// ก่อน claim ต้อง check ว่า claimed_by IS NULL
// ถ้าไม่ NULL → return 409 Conflict { error: 'ALREADY_CLAIMED', claimedBy: name }
// ถ้า NULL → UPDATE SET claimed_by = memberId
// ต้องทำ atomic ใน single SQL statement เพื่อป้องกัน race condition:
// UPDATE items SET claimed_by = ? WHERE id = ? AND claimed_by IS NULL
// แล้วเช็ค changes === 1 ถ้าไม่ใช่ → 409
```

### 6.4 VAT Logic

```
vat_mode = 'none'     → ทุก item ไม่บวก VAT ไม่ว่า vat_apply จะเป็นอะไร
vat_mode = 'flat'     → ทุก item บวก VAT 7% ทั้งหมด
vat_mode = 'per_item' → แต่ละ item ดู vat_apply flag เอง

หมายเหตุ: ราคาที่ member ใส่ = ราคาที่จ่ายจริงแล้ว (รวม VAT แล้ว)
ระบบไม่ต้องบวก VAT ซ้ำ — VAT flag ใช้เพื่อ display เท่านั้น
เพื่อให้ user รู้ว่ารายการนี้มี VAT รวมอยู่ในราคาที่ใส่
```

---

## 7. Frontend — หน้าและ Component

### 7.1 `pages/Home.jsx` — หน้าแรก

```
แสดง:
  - ช่องสร้างห้อง (ชื่อห้อง + ตั้งค่า VAT)
  - ช่อง join ด้วย Room Code
  - ถ้ามี token ใน localStorage → redirect ไปห้องที่เคยเข้าไว้

State:
  - createForm: { name, vatMode }
  - joinForm: { code, memberName }
  - error: string | null
```

### 7.2 `pages/RoomHost.jsx` — หน้า Host

```
แสดง:
  - Room Code (ใหญ่ copy ได้)
  - MemberList component
  - ItemList component (Host mode — มีปุ่ม add/edit/delete)
  - ปุ่มตั้งค่า VAT
  - ปุ่ม Lock ห้อง
  - ปุ่ม ปิดห้อง (ต้อง confirm ก่อน)
  - Settlement component (ถ้า items ทุกตัวมี price แล้ว)

Polling:
  - usePolling เรียก GET /items และ GET /members ทุก 3 วินาที
```

### 7.3 `pages/RoomMember.jsx` — หน้า Member

```
แสดง:
  - ชื่อห้องและ status
  - MemberList component (read only)
  - ItemList component (Member mode — มีแค่ปุ่ม claim/unclaim/ใส่ราคา)
  - Settlement component (ถ้า items ทุกตัวมี price แล้ว)

Polling:
  - usePolling เรียก GET /items และ GET /members ทุก 3 วินาที
```

### 7.4 `components/ItemRow.jsx` — แถวรายการ

```
Props: item, role ('host'|'member'), currentMemberId, onClaim, onUnclaim, onSetPrice, onDelete

แสดง state ของรายการ:
  - ยังไม่มีคนรับ    → ปุ่ม "รับ" (member) / ปุ่ม trash (host)
  - ฉันรับแล้ว       → badge ชื่อตัวเอง + ช่องใส่ราคา + ปุ่ม unclaim
  - คนอื่นรับแล้ว   → badge ชื่อคนนั้น (greyed out, ไม่มีปุ่ม)
  - มีราคาแล้ว      → แสดงราคา + VatBadge
```

### 7.5 `components/Settlement.jsx` — สรุปหารเงิน

```
แสดง:
  - ยอดรวมทั้งหมด
  - ค่าต่อหัว
  - ตาราง balance ของแต่ละคน (จ่ายไป / ควรจ่าย / ผลต่าง)
  - รายการโอนเงิน "A โอน B — 120.00 บาท"
  - ปุ่ม Copy สรุปเป็น text (สำหรับส่งกลุ่ม Line)

เงื่อนไขแสดง:
  - แสดงเมื่อ items ทุกรายการมี price แล้ว
  - ถ้ายังมี unclaimed หรือ no-price item → แสดง "รอ X รายการที่ยังไม่มีราคา"
```

---

## 8. Error Handling

### HTTP Status ที่ใช้

```
200 OK           — สำเร็จ
201 Created      — สร้างสำเร็จ
400 Bad Request  — ข้อมูลไม่ครบหรือผิดรูปแบบ
401 Unauthorized — token ไม่ถูกต้องหรือไม่ใช่ host
403 Forbidden    — token ถูกต้องแต่ไม่มีสิทธิ์ (เช่น unclaim ของคนอื่น)
404 Not Found    — ห้องหรือ item ไม่มีอยู่
409 Conflict     — claim ซ้ำ
```

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "คำอธิบายภาษาไทยสำหรับแสดงใน UI"
}
```

---

## 9. คำสั่งสร้างโปรเจกต์ทีละขั้น

> **ให้ AI ทำตามลำดับนี้เท่านั้น อย่าข้ามขั้น**

### ขั้นที่ 1 — Bootstrap โปรเจกต์

```bash
mkdir grocerytrip && cd grocerytrip

# Backend
mkdir server && cd server
npm init -y
npm install express better-sqlite3 cors uuid dotenv
npm install -D nodemon
cd ..

# Frontend
npm create vite@latest client -- --template react
cd client
npm install
npm install axios react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
cd ..
```

### ขั้นที่ 2 — สร้าง Database

สร้างไฟล์ `server/db/schema.sql` ตาม schema ใน section 4
สร้างไฟล์ `server/db/db.js`:

```javascript
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/grocerytrip.db')

// สร้าง directory ถ้าไม่มี
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// รัน schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

module.exports = db
```

### ขั้นที่ 3 — สร้าง Models

สร้าง `server/models/Room.js`, `Member.js`, `Item.js`
ตาม function list ใน README.md section MVC

### ขั้นที่ 4 — สร้าง Middleware

สร้าง `server/middleware/auth.js`:

```javascript
const Member = require('../models/Member')
const Room   = require('../models/Room')

// ตรวจสอบว่า X-Host-Token ถูกต้องและเป็น host ของห้องนี้
async function verifyHostToken(req, res, next) {
  const token  = req.headers['x-host-token']
  const roomId = req.params.id
  if (!token) return res.status(401).json({ error: 'NO_TOKEN', message: 'ต้องใส่ host token' })
  const room = Room.findById(roomId)
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'ไม่พบห้อง' })
  if (room.host_token !== token) return res.status(401).json({ error: 'INVALID_TOKEN', message: 'token ไม่ถูกต้อง' })
  req.room = room
  next()
}

// ตรวจสอบว่า X-Member-Token เป็น member ของห้องนี้
async function verifyMemberToken(req, res, next) {
  const token  = req.headers['x-member-token']
  const roomId = req.params.id
  if (!token) return res.status(401).json({ error: 'NO_TOKEN', message: 'ต้องใส่ member token' })
  const member = Member.findByToken(token)
  if (!member || member.room_id !== roomId) return res.status(401).json({ error: 'INVALID_TOKEN', message: 'token ไม่ถูกต้อง' })
  req.member = member
  next()
}

module.exports = { verifyHostToken, verifyMemberToken }
```

### ขั้นที่ 5 — สร้าง Controllers และ Routes

ทำตาม API Endpoints ใน section 5 ครบทุก endpoint

### ขั้นที่ 6 — สร้าง Express App

สร้าง `server/app.js`:

```javascript
const express = require('express')
const cors    = require('cors')
const app     = express()

app.use(cors())
app.use(express.json())

app.use('/api/rooms', require('./routes/roomRoutes'))
app.use('/api/rooms', require('./routes/memberRoutes'))
app.use('/api/rooms', require('./routes/itemRoutes'))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'เกิดข้อผิดพลาด' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server running on :${PORT}`))
```

### ขั้นที่ 7 — สร้าง Frontend Utils

สร้าง `client/src/utils/api.js`:

```javascript
import axios from 'axios'
import { getHostToken, getMemberToken } from './token'

const api = axios.create({ baseURL: 'http://localhost:3001' })

api.interceptors.request.use(config => {
  const hostToken   = getHostToken()
  const memberToken = getMemberToken()
  if (hostToken)   config.headers['X-Host-Token']   = hostToken
  if (memberToken) config.headers['X-Member-Token'] = memberToken
  return config
})

export default api
```

สร้าง `client/src/utils/token.js` — helper get/set/clear token จาก localStorage
สร้าง `client/src/utils/settlement.js` — algorithm จาก section 6.1

### ขั้นที่ 8 — สร้าง Hooks

สร้าง `client/src/hooks/usePolling.js`:

```javascript
import { useEffect, useRef } from 'react'

export function usePolling(callback, intervalMs = 3000, enabled = true) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return
    callbackRef.current() // เรียกทันทีครั้งแรก
    const id = setInterval(() => callbackRef.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
```

### ขั้นที่ 9 — สร้าง Components และ Pages

ทำตาม spec ใน section 7 ครบทุก component

### ขั้นที่ 10 — ทดสอบ

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

ทดสอบ flow:
1. สร้างห้อง → ได้ code
2. เปิด tab ใหม่ join ด้วย code
3. Host เพิ่มรายการ → Member เห็น (รอ poll)
4. Member claim → Host เห็นชื่อ member
5. Member ใส่ราคา → ดู settlement

---

## 10. สิ่งที่ AI ต้องไม่ทำ

- ❌ อย่าเพิ่ม feature ที่ไม่ได้อยู่ใน spec นี้โดยไม่ถาม
- ❌ อย่าใช้ WebSocket — ใช้ polling เท่านั้น
- ❌ อย่าสร้าง login/register page
- ❌ อย่าใช้ Redux หรือ state management library ที่ซับซ้อน — useState/useContext พอ
- ❌ อย่าเพิ่ม TypeScript — ใช้ JavaScript ธรรมดา
- ❌ อย่าใช้ ORM เช่น Prisma หรือ Sequelize — ใช้ raw SQL กับ better-sqlite3
- ❌ อย่าทำ pagination — รายการในห้องไม่เยอะพอที่จะต้องการ
- ❌ อย่า deploy หรือแตะ production config จนกว่าจะได้รับคำสั่ง

## 11. สิ่งที่ AI ต้องทำเสมอ

- ✅ Comment โค้ดเป็นภาษาไทย สำหรับส่วน business logic สำคัญ
- ✅ UI และ error message แสดงเป็นภาษาไทย
- ✅ ทุก API endpoint ต้อง verify token ก่อนเสมอ
- ✅ Claim item ต้องใช้ atomic SQL (WHERE claimed_by IS NULL) ป้องกัน race condition
- ✅ Handle error gracefully ทั้ง server และ client
- ✅ ถ้าไม่แน่ใจ spec ให้ถามก่อนเสมอ — อย่า assume
