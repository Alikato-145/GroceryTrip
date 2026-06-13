# GroceryTrip — README

> **ภาษาหลักของโปรเจกต์นี้คือภาษาไทย** เนื่องจากกลุ่มเป้าหมายเป็นผู้ใช้ภาษาไทย
> โค้ดและ API ใช้ภาษาอังกฤษตามมาตรฐาน แต่ comment, README และ UI ใช้ภาษาไทย

---

## ภาพรวมโปรเจกต์

**GroceryTrip** คือเว็บแอปสำหรับจัดการรายการซื้อของและหารค่าใช้จ่ายแบบ real-time สำหรับกลุ่มเพื่อนที่ไปทริปด้วยกัน

### ปัญหาที่แก้

เวลาไปทริปกับเพื่อนหลายคนแล้วต้องซื้อวัตถุดิบมาทำอาหารร่วมกัน มักเกิดปัญหาเหล่านี้:

- แยกกันไปซื้อหลายที่ (ตลาดสด, ซุปเปอร์มาร์เก็ต) แล้ว **ซื้อของซ้ำกัน** โดยไม่รู้
- หลังกลับมาแล้ว **หารเงินลำบาก** ว่าใครออกไปเท่าไหร่ ใครต้องจ่ายคืนใคร
- สินค้าบางร้านมี **VAT 7%** บางร้านไม่มี ทำให้คำนวณยากขึ้น

### วิธีที่แอปแก้ปัญหา

1. Host สร้างห้องและ list รายการวัตถุดิบที่ต้องซื้อทั้งหมดไว้ล่วงหน้า
2. สมาชิก join ห้องด้วย Room Code 6 หลัก แล้วแต่ละคน **"ติ๊ก"** รายการที่ตัวเองจะซื้อ
3. ระบบ **lock รายการทันที** เมื่อมีคนรับไปแล้ว — ป้องกันซื้อซ้ำ
4. หลังซื้อเสร็จ สมาชิกกลับมา **ใส่ราคาจริง** ที่จ่ายไป
5. ระบบ **คำนวณและสรุปอัตโนมัติ** ว่าใครต้องโอนเงินให้ใครเท่าไหร่ โดยคิด VAT ตามที่ตั้งค่าไว้

### User Roles

| Role | ได้รับเมื่อ | สิทธิ์ |
|---|---|---|
| **Host** | สร้างห้อง | จัดการรายการ, ตั้งค่า VAT, lock/ปิดห้อง |
| **Member** | join ด้วย Room Code | ติ๊กรับของ, ใส่ราคา, ดูสรุป |

### ขอบเขตของระบบ (Scope)

- ไม่มี user account / login — ใช้ token-based แทน (เก็บใน localStorage)
- ออกแบบสำหรับ **web browser เท่านั้น** ไม่ใช่ native mobile app
- ห้องมีอายุชั่วคราว — Host เป็นคนปิดห้องเอง ระบบไม่ลบอัตโนมัติ
- Real-time ทำด้วย **polling** (refresh ทุก 3 วินาที) ไม่ใช่ WebSocket

---

## Tech Stack (แนะนำ)

| Layer | ตัวเลือก | หมายเหตุ |
|---|---|---|
| Frontend | React + Vite | SPA, mobile-friendly |
| Backend | Node.js + Express | REST API |
| Database | **SQLite** (dev) / **PostgreSQL** (prod) | เริ่มด้วย SQLite ก่อนได้ ย้าย schema เดิมไป Postgres ง่ายมาก |
| Real-time | Polling (setInterval) | ตามที่ตกลง — ไม่ต้อง WebSocket |
| Hosting | Railway / Render / Fly.io | free tier รองรับ SQLite หรือ Postgres |

> **Database recommendation:** ใช้ **SQLite** ก่อนเลย — ไม่ต้อง setup อะไรเพิ่ม, file เดียว, deploy ง่าย
> ถ้าวันหลังอยากขยาย scale ค่อย migrate ไป PostgreSQL ได้ schema เดิมใช้ได้เลย

---

## Project Structure (MVC)

```
grocerytrip/
├── client/                  # Frontend (React)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx         # หน้าแรก — สร้าง/join ห้อง
│   │   │   ├── RoomHost.jsx     # หน้า Host จัดการห้อง
│   │   │   └── RoomMember.jsx   # หน้า Member ติ๊กของ
│   │   ├── components/
│   │   │   ├── ItemList.jsx     # ตารางรายการวัตถุดิบ
│   │   │   ├── MemberList.jsx   # รายชื่อคนในห้อง
│   │   │   └── Settlement.jsx   # หน้าสรุปหารเงิน
│   │   └── hooks/
│   │       └── usePolling.js    # polling helper (setInterval)
│
├── server/                  # Backend (Express)
│   ├── models/              # M — Database layer
│   │   ├── Room.js
│   │   ├── Member.js
│   │   └── Item.js
│   ├── controllers/         # C — Business logic
│   │   ├── roomController.js
│   │   ├── memberController.js
│   │   └── itemController.js
│   ├── routes/              # V (API layer) — Route definitions
│   │   ├── roomRoutes.js
│   │   ├── memberRoutes.js
│   │   └── itemRoutes.js
│   ├── db/
│   │   ├── schema.sql       # DDL สร้าง tables
│   │   └── db.js            # connection helper
│   └── app.js               # Express entry point
│
└── README.md
```

---

## Database Schema

```sql
-- ห้อง
CREATE TABLE rooms (
  id          TEXT PRIMARY KEY,       -- UUID
  code        TEXT UNIQUE NOT NULL,   -- 6-digit join code
  name        TEXT NOT NULL,
  host_token  TEXT NOT NULL,          -- token ของ host (ใช้แทน auth)
  vat_mode    TEXT DEFAULT 'none',    -- 'none' | 'flat' | 'per_item'
  vat_rate    REAL DEFAULT 0.07,
  status      TEXT DEFAULT 'open',   -- 'open' | 'locked' | 'closed'
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- สมาชิก
CREATE TABLE members (
  id          TEXT PRIMARY KEY,       -- UUID
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  name        TEXT NOT NULL,
  token       TEXT NOT NULL,          -- ใช้แทน session/auth
  joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- รายการวัตถุดิบ
CREATE TABLE items (
  id           TEXT PRIMARY KEY,      -- UUID
  room_id      TEXT NOT NULL REFERENCES rooms(id),
  name         TEXT NOT NULL,
  note         TEXT,                  -- รายละเอียดเพิ่มเติม เช่น "500g"
  vat_apply    BOOLEAN DEFAULT TRUE,  -- ใช้ VAT กับรายการนี้หรือเปล่า
  claimed_by   TEXT REFERENCES members(id),   -- NULL = ยังไม่มีคนซื้อ
  price        REAL,                  -- ราคาจริงที่จ่าย (ใส่หลังซื้อแล้ว)
  receipt_url  TEXT,                  -- optional รูปใบเสร็จ
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## MVC — Functions ทั้งหมด

### Model Layer (`server/models/`)

#### `Room.js`
| Function | Description |
|---|---|
| `Room.create(name, vatMode)` | สร้างห้องใหม่ generate UUID + 6-digit code + host_token |
| `Room.findByCode(code)` | หาห้องจาก join code |
| `Room.findById(id)` | หาห้องจาก ID |
| `Room.setStatus(id, status)` | เปลี่ยน status → locked / closed |
| `Room.updateVat(id, vatMode, vatRate)` | แก้ไขการตั้งค่า VAT |
| `Room.delete(id)` | ลบห้อง (cascade ลบ members + items ด้วย) |

#### `Member.js`
| Function | Description |
|---|---|
| `Member.create(roomId, name)` | เพิ่มสมาชิกใหม่ generate token |
| `Member.findByToken(token)` | verify token หา member |
| `Member.listByRoom(roomId)` | ดึงรายชื่อทุกคนในห้อง |
| `Member.remove(memberId)` | ลบสมาชิก (host kick ได้) |

#### `Item.js`
| Function | Description |
|---|---|
| `Item.create(roomId, name, note, vatApply)` | Host เพิ่มรายการวัตถุดิบ |
| `Item.listByRoom(roomId)` | ดึงรายการทั้งหมดในห้อง (join member name) |
| `Item.update(itemId, fields)` | Host แก้ชื่อ/หมายเหตุ/vatApply |
| `Item.delete(itemId)` | Host ลบรายการ (เฉพาะที่ยังไม่ถูก claim) |
| `Item.claim(itemId, memberId)` | Member ติ๊กว่าจะซื้อ (lock ถ้า claimed แล้ว) |
| `Item.unclaim(itemId, memberId)` | Member ยกเลิก (เฉพาะของตัวเอง) |
| `Item.setPrice(itemId, memberId, price)` | Member ใส่ราคาจริงหลังซื้อ |
| `Item.setReceipt(itemId, memberId, url)` | Member แนบรูปใบเสร็จ |

---

### Controller Layer (`server/controllers/`)

#### `roomController.js`
| Function | HTTP | Path | Permission |
|---|---|---|---|
| `createRoom` | POST | `/api/rooms` | ทุกคน |
| `joinRoom` | POST | `/api/rooms/:code/join` | ทุกคน |
| `getRoom` | GET | `/api/rooms/:id` | member ในห้อง |
| `lockRoom` | PATCH | `/api/rooms/:id/lock` | host เท่านั้น |
| `closeRoom` | DELETE | `/api/rooms/:id` | host เท่านั้น |
| `updateVat` | PATCH | `/api/rooms/:id/vat` | host เท่านั้น |
| `getSettlement` | GET | `/api/rooms/:id/settlement` | member ในห้อง |

#### `memberController.js`
| Function | HTTP | Path | Permission |
|---|---|---|---|
| `listMembers` | GET | `/api/rooms/:id/members` | member ในห้อง |
| `kickMember` | DELETE | `/api/rooms/:id/members/:memberId` | host เท่านั้น |

#### `itemController.js`
| Function | HTTP | Path | Permission |
|---|---|---|---|
| `listItems` | GET | `/api/rooms/:id/items` | member ในห้อง |
| `addItem` | POST | `/api/rooms/:id/items` | host เท่านั้น |
| `updateItem` | PATCH | `/api/rooms/:id/items/:itemId` | host เท่านั้น |
| `deleteItem` | DELETE | `/api/rooms/:id/items/:itemId` | host เท่านั้น |
| `claimItem` | POST | `/api/rooms/:id/items/:itemId/claim` | member (unclaimed เท่านั้น) |
| `unclaimItem` | DELETE | `/api/rooms/:id/items/:itemId/claim` | member ที่ claim ไว้ |
| `setPriceItem` | PATCH | `/api/rooms/:id/items/:itemId/price` | member ที่ claim ไว้ |
| `uploadReceipt` | POST | `/api/rooms/:id/items/:itemId/receipt` | member ที่ claim ไว้ |

---

### Settlement Logic (ใน `roomController.getSettlement`)

```
1. ดึง items ทั้งหมดในห้อง ที่มี price แล้ว
2. คิด effective_price ของแต่ละรายการ:
   - ถ้า vat_apply = true  → effective_price = price (ราคาที่จ่ายจริงรวม VAT แล้ว)
   - ถ้า vat_apply = false → effective_price = price
   (ราคาที่ member ใส่ = ราคาจ่ายจริง ไม่ต้องบวก/ลบอีก)
3. รวม total_cost = SUM(effective_price)
4. per_head = total_cost / จำนวน member
5. สำหรับแต่ละ member คำนวณ balance:
   balance = SUM(ราคาที่ member นี้ซื้อ) - per_head
   → บวก = คนอื่นค้างเงินเขา
   → ลบ = เขาต้องจ่ายเพิ่ม
6. Minimize transactions:
   เรียง creditors (balance > 0) และ debtors (balance < 0)
   จับคู่ greedy จนหมด → ได้ list "X โอน Y เป็นเงิน Z บาท"
```

---

### Frontend Polling (`client/hooks/usePolling.js`)

```javascript
// polling ทุก N วินาที ดึง items + members ใหม่
usePolling(roomId, intervalMs = 3000)
```

หน้า RoomHost และ RoomMember จะ poll `/api/rooms/:id/items` และ `/api/rooms/:id/members`
ทุก 3 วินาที แล้ว setState → UI อัพเดตอัตโนมัติ

---

## Permission Model

ระบบใช้ **token-based** แทน auth จริง:

- ตอนสร้างห้อง → server ออก `host_token` คืนมา → เก็บใน localStorage
- ตอน join → server ออก `member_token` คืนมา → เก็บใน localStorage
- ทุก request ส่ง token ผ่าน header `X-Member-Token` หรือ `X-Host-Token`
- Server verify token ก่อนทุก operation

---

## Constraints & Rules

- รายการที่ถูก `claim` แล้ว → ล็อก ห้าม claim ซ้ำจนกว่า owner จะ unclaim เอง
- Host ลบรายการได้เฉพาะที่ยังไม่ถูก claim (ป้องกัน data inconsistency)
- ห้อง `closed` → ลบข้อมูลออกจาก DB (หรือ soft delete เก็บ 24h แล้วลบ)
- ห้อง `locked` → join ไม่ได้แล้ว แต่ member เดิมยังใช้งานได้

---

## Getting Started

```bash
# Install
npm install

# Dev (SQLite, ไม่ต้อง setup อะไร)
npm run dev

# Production (set env DATABASE_URL สำหรับ PostgreSQL)
DATABASE_URL=postgres://... npm start
```
