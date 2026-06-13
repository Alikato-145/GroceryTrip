const Room = require("../models/Room");
const Member = require("../models/Member");
const Item = require("../models/Item");

// POST /api/rooms
function createRoom(req, res) {
  const { name, vatMode, hostName } = req.body;
  if (!name || !name.trim()) {
    return res
      .status(400)
      .json({ error: "MISSING_FIELD", message: "ต้องใส่ชื่อห้อง" });
  }
  if (!hostName || !hostName.trim()) {
    return res.status(400).json({
      error: "MISSING_FIELD",
      message: "ต้องใส่ชื่อของคุณ (เจ้าของห้อง)",
    });
  }
  const validModes = ["none", "flat", "per_item"];
  if (vatMode && !validModes.includes(vatMode)) {
    return res
      .status(400)
      .json({ error: "INVALID_VAT_MODE", message: "vatMode ไม่ถูกต้อง" });
  }

  // สร้างห้องก่อนเพื่อได้ roomId
  const roomResult = Room.create({
    name: name.trim(),
    vatMode: vatMode || "none",
  });

  // สร้าง member record ให้ host อัตโนมัติ เพื่อให้ host claim ของได้
  const memberResult = Member.create({
    roomId: roomResult.roomId,
    name: hostName.trim(),
  });

  // อัพเดต host_member_id กลับเข้าไปในห้อง
  Room.setHostMemberId(roomResult.roomId, memberResult.memberId);

  return res.status(201).json({
    roomId: roomResult.roomId,
    code: roomResult.code,
    hostToken: roomResult.hostToken,
    memberId: memberResult.memberId,
    memberToken: memberResult.memberToken,
  });
}

// POST /api/rooms/:code/join
function joinRoom(req, res) {
  const { code } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res
      .status(400)
      .json({ error: "MISSING_FIELD", message: "ต้องใส่ชื่อ" });
  }
  const room = Room.findByCode(code.toUpperCase());
  if (!room) {
    return res
      .status(404)
      .json({ error: "ROOM_NOT_FOUND", message: "ไม่พบห้อง" });
  }
  if (room.status === "finished") {
    return res.status(403).json({
      error: "ROOM_FINISHED",
      message: "ห้องนี้จบแล้ว ไม่รับสมาชิกใหม่",
    });
  }
  if (room.status === "locked") {
    return res.status(403).json({
      error: "ROOM_LOCKED",
      message: "ห้องนี้ล็อกแล้ว ไม่รับสมาชิกใหม่",
    });
  }
  const result = Member.create({ roomId: room.id, name: name.trim() });
  return res.status(201).json({ roomId: room.id, ...result });
}

// GET /api/rooms/:id
function getRoom(req, res) {
  const room = req.room || Room.findById(req.params.id);
  if (!room) {
    return res
      .status(404)
      .json({ error: "ROOM_NOT_FOUND", message: "ไม่พบห้อง" });
  }
  const memberCount = Room.getMemberCount(room.id);
  return res.json({
    id: room.id,
    code: room.code,
    name: room.name,
    vatMode: room.vat_mode,
    vatRate: room.vat_rate,
    status: room.status,
    memberCount,
  });
}

// PATCH /api/rooms/:id/lock  (verifyHostToken ผ่านแล้ว)
function lockRoom(req, res) {
  if (req.room.status === "finished") {
    return res
      .status(403)
      .json({ error: "ROOM_FINISHED", message: "ห้องจบแล้ว" });
  }
  Room.updateStatus(req.params.id, "locked");
  return res.json({ status: "locked" });
}

// PATCH /api/rooms/:id/finish  (verifyHostToken ผ่านแล้ว)
// จบห้อง — ไม่ลบข้อมูล เปลี่ยนเป็น finished แล้วแสดง settlement
function finishRoom(req, res) {
  Room.finish(req.params.id);
  return res.json({ status: "finished" });
}

// DELETE /api/rooms/:id  (verifyHostToken ผ่านแล้ว)
// ลบห้องจริงๆ (ใช้เมื่อต้องการลบถาวร)
function deleteRoom(req, res) {
  Room.delete(req.params.id);
  return res.json({ deleted: true });
}

// PATCH /api/rooms/:id/vat  (verifyHostToken ผ่านแล้ว)
function updateVat(req, res) {
  if (req.room.status === "finished") {
    return res.status(403).json({
      error: "ROOM_FINISHED",
      message: "ห้องจบแล้ว ไม่สามารถแก้ไขได้",
    });
  }
  const { vatMode, vatRate } = req.body;
  const validModes = ["none", "flat", "per_item"];
  if (!validModes.includes(vatMode)) {
    return res
      .status(400)
      .json({ error: "INVALID_VAT_MODE", message: "vatMode ไม่ถูกต้อง" });
  }
  const rate = vatRate !== undefined ? Number(vatRate) : 0.07;
  if (isNaN(rate) || rate < 0 || rate > 1) {
    return res.status(400).json({
      error: "INVALID_VAT_RATE",
      message: "vatRate ต้องอยู่ระหว่าง 0-1",
    });
  }
  const updated = Room.updateVat(req.params.id, vatMode, rate);
  return res.json({ vatMode: updated.vat_mode, vatRate: updated.vat_rate });
}

// GET /api/rooms/:id/settlement
function getSettlement(req, res) {
  const roomId = req.params.id;
  const room = req.room || Room.findById(roomId);
  const members = Member.findAllByRoom(roomId);
  const items = Item.findAllByRoom(roomId);

  if (members.length === 0) {
    return res.json({
      totalCost: 0,
      perHead: 0,
      balances: [],
      transactions: [],
    });
  }

  // คำนวณ effectivePrice (รวม VAT) ของแต่ละ item
  function effectivePrice(item) {
    if (item.price == null) return 0;
    const rate = room.vat_rate || 0.07;
    if (room.vat_mode === "flat") return item.price * (1 + rate);
    if (room.vat_mode === "per_item" && item.vatApply)
      return item.price * (1 + rate);
    return item.price;
  }

  // รวมยอดที่แต่ละคนออกไป (ใช้ effectivePrice เพื่อรวม VAT)
  const paid = {};
  members.forEach((m) => {
    paid[m.id] = 0;
  });
  items
    .filter((i) => i.price != null && i.claimedBy != null)
    .forEach((i) => {
      paid[i.claimedBy] = (paid[i.claimedBy] || 0) + effectivePrice(i);
    });

  const totalCost = Object.values(paid).reduce((a, b) => a + b, 0);
  const perHead = totalCost / members.length;

  const balances = members.map((m) => ({
    memberId: m.id,
    name: m.name,
    paid: paid[m.id] || 0,
    balance: (paid[m.id] || 0) - perHead,
  }));

  // Greedy minimize transactions — ทำงานบน deep copy เพื่อไม่ให้ balances เดิมถูก mutate
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balance - b.balance);
  const transactions = [];

  let ci = 0,
    di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci].balance;
    const debt = Math.abs(debtors[di].balance);
    const amount = Math.min(credit, debt);

    transactions.push({
      from: debtors[di].name,
      fromId: debtors[di].memberId,
      to: creditors[ci].name,
      toId: creditors[ci].memberId,
      amount: Math.round(amount * 100) / 100,
    });

    creditors[ci].balance -= amount;
    debtors[di].balance += amount;

    if (Math.abs(creditors[ci].balance) < 0.01) ci++;
    if (Math.abs(debtors[di].balance) < 0.01) di++;
  }

  // รายการที่ยังไม่มีราคา
  const pendingItems = items.filter((i) => i.price == null).length;

  return res.json({ totalCost, perHead, balances, transactions, pendingItems });
}

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  lockRoom,
  finishRoom,
  deleteRoom,
  updateVat,
  getSettlement,
};
