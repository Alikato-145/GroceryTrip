const Item = require("../models/Item");
const Room = require("../models/Room");

// คำนวณราคาสุทธิหลังบวก VAT ตาม mode ของห้อง
// ราคาที่ user ใส่ = ราคาก่อน VAT (base price)
function calcEffectivePrice(item, room) {
  if (item.price == null) return null;
  const rate = room.vat_rate || 0.07;
  if (room.vat_mode === "flat") {
    return Math.round(item.price * (1 + rate) * 100) / 100;
  }
  if (room.vat_mode === "per_item" && item.vatApply) {
    return Math.round(item.price * (1 + rate) * 100) / 100;
  }
  return item.price; // none หรือ per_item ที่ vatApply = false
}

// helper ดึง room และตรวจ finished
function getRoomOrFail(roomId, res) {
  const room = Room.findById(roomId);
  if (!room) {
    res.status(404).json({ error: "ROOM_NOT_FOUND", message: "ไม่พบห้อง" });
    return null;
  }
  if (room.status === "finished") {
    res.status(403).json({
      error: "ROOM_FINISHED",
      message: "ห้องจบแล้ว ไม่สามารถแก้ไขได้",
    });
    return null;
  }
  return room;
}

// GET /api/rooms/:id/items
function getItems(req, res) {
  const roomId = req.params.id;
  // ดึง room เพื่อรู้ vatMode/vatRate — ใช้ req.room ถ้า middleware เซ็ตไว้แล้ว
  const room = req.room || Room.findById(roomId);
  const items = Item.findAllByRoom(roomId);

  // แนบ effectivePrice (ราคารวม VAT) ไปกับแต่ละ item
  const result = items.map((item) => ({
    ...item,
    effectivePrice: calcEffectivePrice(item, room),
  }));

  return res.json(result);
}

// POST /api/rooms/:id/items  — ทั้ง host และ member เพิ่มได้
function createItem(req, res) {
  const room = getRoomOrFail(req.params.id, res);
  if (!room) return;

  const { name, note, vatApply } = req.body;
  if (!name || !name.trim()) {
    return res
      .status(400)
      .json({ error: "MISSING_FIELD", message: "ต้องใส่ชื่อรายการ" });
  }
  const item = Item.create({
    roomId: req.params.id,
    name: name.trim(),
    note: note || null,
    vatApply: vatApply !== undefined ? Number(vatApply) : 0, // default ไม่มี VAT
  });
  return res.status(201).json({
    id: item.id,
    name: item.name,
    note: item.note,
    vatApply: item.vat_apply,
    sortOrder: item.sort_order,
  });
}

// PATCH /api/rooms/:id/items/:itemId  (verifyHostToken — host เท่านั้น)
function updateItem(req, res) {
  const room = getRoomOrFail(req.params.id, res);
  if (!room) return;

  const { itemId } = req.params;
  const item = Item.findById(itemId);
  if (!item || item.room_id !== req.params.id) {
    return res
      .status(404)
      .json({ error: "ITEM_NOT_FOUND", message: "ไม่พบรายการ" });
  }
  const { name, note, vatApply } = req.body;
  Item.update(itemId, {
    name: name !== undefined ? name.trim() : undefined,
    note: note !== undefined ? note : undefined,
    vatApply: vatApply !== undefined ? Number(vatApply) : undefined,
  });
  return res.json({ updated: true });
}

// DELETE /api/rooms/:id/items/:itemId
// ลบได้เฉพาะ item ที่ตัวเองเพิ่ม (ยังไม่ถูก claim) หรือ host ลบได้ทุกรายการที่ไม่ถูก claim
function deleteItem(req, res) {
  const room = getRoomOrFail(req.params.id, res);
  if (!room) return;

  const { itemId } = req.params;
  const item = Item.findById(itemId);
  if (!item || item.room_id !== req.params.id) {
    return res
      .status(404)
      .json({ error: "ITEM_NOT_FOUND", message: "ไม่พบรายการ" });
  }
  if (item.claimed_by) {
    return res.status(403).json({
      error: "ITEM_CLAIMED",
      message: "ลบไม่ได้เพราะมีคนรับผิดชอบแล้ว",
    });
  }
  Item.delete(itemId);
  return res.json({ deleted: true });
}

// POST /api/rooms/:id/items/:itemId/claim  — ทุกคน claim ได้
function claimItem(req, res) {
  const room = getRoomOrFail(req.params.id, res);
  if (!room) return;

  if (!req.member) {
    return res
      .status(401)
      .json({ error: "NO_MEMBER", message: "ไม่สามารถระบุตัวตนได้" });
  }

  const { itemId } = req.params;
  const item = Item.findById(itemId);
  if (!item || item.room_id !== req.params.id) {
    return res
      .status(404)
      .json({ error: "ITEM_NOT_FOUND", message: "ไม่พบรายการ" });
  }

  const changes = Item.claim(itemId, req.member.id);
  if (changes === 0) {
    const latest = Item.findById(itemId);
    const Member = require("../models/Member");
    const claimer = Member.findById(latest.claimed_by);
    return res.status(409).json({
      error: "ALREADY_CLAIMED",
      message: "มีคนรับผิดชอบรายการนี้แล้ว",
      claimedBy: claimer ? claimer.name : null,
    });
  }
  // ถ้า vatApply ส่งมาด้วย ให้อัพเดตตอนเดียวกันเลย
  const { vatApply } = req.body;
  if (vatApply !== undefined) {
    Item.update(itemId, { vatApply: Number(vatApply) });
  }
  return res.json({ claimedBy: req.member.id });
}

// DELETE /api/rooms/:id/items/:itemId/claim  — เจ้าของ unclaim ได้
function unclaimItem(req, res) {
  const room = getRoomOrFail(req.params.id, res);
  if (!room) return;

  if (!req.member) {
    return res
      .status(401)
      .json({ error: "NO_MEMBER", message: "ไม่สามารถระบุตัวตนได้" });
  }

  const { itemId } = req.params;
  const item = Item.findById(itemId);
  if (!item || item.room_id !== req.params.id) {
    return res
      .status(404)
      .json({ error: "ITEM_NOT_FOUND", message: "ไม่พบรายการ" });
  }
  const changes = Item.unclaim(itemId, req.member.id);
  if (changes === 0) {
    return res.status(403).json({
      error: "NOT_OWNER",
      message: "ยกเลิกได้เฉพาะรายการของตัวเองเท่านั้น",
    });
  }
  return res.json({ unclaimed: true });
}

// PATCH /api/rooms/:id/items/:itemId/price  — เจ้าของใส่ราคาได้
function setPrice(req, res) {
  const room = getRoomOrFail(req.params.id, res);
  if (!room) return;

  if (!req.member) {
    return res
      .status(401)
      .json({ error: "NO_MEMBER", message: "ไม่สามารถระบุตัวตนได้" });
  }

  const { itemId } = req.params;
  const { price } = req.body;
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return res.status(400).json({
      error: "INVALID_PRICE",
      message: "ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0",
    });
  }
  const item = Item.findById(itemId);
  if (!item || item.room_id !== req.params.id) {
    return res
      .status(404)
      .json({ error: "ITEM_NOT_FOUND", message: "ไม่พบรายการ" });
  }
  // ส่ง vatApply ไปด้วยถ้าต้องการเปลี่ยนพร้อมกัน
  const vatApply = req.body.vatApply;
  const changes = Item.setPrice(
    itemId,
    req.member.id,
    Number(price),
    vatApply !== undefined ? Number(vatApply) : undefined,
  );
  if (changes === 0) {
    return res.status(403).json({
      error: "NOT_OWNER",
      message: "แก้ไขราคาได้เฉพาะรายการของตัวเองเท่านั้น",
    });
  }
  return res.json({ updated: true });
}

// POST /api/rooms/:id/items/:itemId/receipt  — เจ้าของแนบใบเสร็จได้
function setReceipt(req, res) {
  const room = getRoomOrFail(req.params.id, res);
  if (!room) return;

  if (!req.member) {
    return res
      .status(401)
      .json({ error: "NO_MEMBER", message: "ไม่สามารถระบุตัวตนได้" });
  }

  const { itemId } = req.params;
  const { receiptUrl } = req.body;
  if (!receiptUrl || !receiptUrl.trim()) {
    return res
      .status(400)
      .json({ error: "MISSING_FIELD", message: "ต้องใส่ URL ใบเสร็จ" });
  }
  const item = Item.findById(itemId);
  if (!item || item.room_id !== req.params.id) {
    return res
      .status(404)
      .json({ error: "ITEM_NOT_FOUND", message: "ไม่พบรายการ" });
  }
  const changes = Item.setReceipt(itemId, req.member.id, receiptUrl.trim());
  if (changes === 0) {
    return res.status(403).json({
      error: "NOT_OWNER",
      message: "อัพโหลดใบเสร็จได้เฉพาะรายการของตัวเองเท่านั้น",
    });
  }
  return res.json({ updated: true });
}

module.exports = {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  claimItem,
  unclaimItem,
  setPrice,
  setReceipt,
};
