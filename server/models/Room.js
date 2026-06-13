const db = require("../db/db");
const { randomUUID } = require("crypto");

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateUniqueCode() {
  let code;
  do {
    code = generateCode();
  } while (db.prepare("SELECT id FROM rooms WHERE code = ?").get(code));
  return code;
}

const Room = {
  // สร้างห้องใหม่ พร้อม host_member_id ที่ได้จาก Member.create ก่อนเรียก
  create({ name, vatMode = "none", hostMemberId }) {
    const id = randomUUID();
    const code = generateUniqueCode();
    const hostToken = randomUUID();

    db.prepare(
      `
      INSERT INTO rooms (id, code, name, host_token, host_member_id, vat_mode)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, code, name, hostToken, hostMemberId || null, vatMode);

    return { roomId: id, code, hostToken };
  },

  findById(id) {
    return db.prepare("SELECT * FROM rooms WHERE id = ?").get(id);
  },

  findByCode(code) {
    return db.prepare("SELECT * FROM rooms WHERE code = ?").get(code);
  },

  getMemberCount(roomId) {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM members WHERE room_id = ?")
      .get(roomId);
    return row.count;
  },

  updateStatus(id, status) {
    db.prepare("UPDATE rooms SET status = ? WHERE id = ?").run(status, id);
  },

  // เซ็ต host_member_id หลังจากสร้างห้อง + member แล้ว
  setHostMemberId(roomId, memberId) {
    db.prepare("UPDATE rooms SET host_member_id = ? WHERE id = ?").run(
      memberId,
      roomId,
    );
  },

  // จบห้อง — ไม่ลบข้อมูล แค่เปลี่ยน status เป็น finished
  finish(id) {
    db.prepare("UPDATE rooms SET status = 'finished' WHERE id = ?").run(id);
  },

  updateVat(id, vatMode, vatRate) {
    db.prepare("UPDATE rooms SET vat_mode = ?, vat_rate = ? WHERE id = ?").run(
      vatMode,
      vatRate,
      id,
    );
    return db
      .prepare("SELECT vat_mode, vat_rate FROM rooms WHERE id = ?")
      .get(id);
  },

  delete(id) {
    db.prepare("DELETE FROM rooms WHERE id = ?").run(id);
  },
};

module.exports = Room;
