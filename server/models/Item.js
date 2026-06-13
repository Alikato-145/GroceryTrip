const db = require("../db/db");
const { randomUUID } = require("crypto");

const Item = {
  create({ roomId, name, note = null, vatApply = 1 }) {
    const id = randomUUID();

    // sort_order = max + 1 ในห้องนั้น
    const row = db
      .prepare("SELECT MAX(sort_order) as max FROM items WHERE room_id = ?")
      .get(roomId);
    const sortOrder = (row.max ?? -1) + 1;

    db.prepare(
      `
      INSERT INTO items (id, room_id, name, note, vat_apply, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(id, roomId, name, note, vatApply, sortOrder);

    return db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  },

  findById(id) {
    return db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  },

  findAllByRoom(roomId) {
    return db
      .prepare(
        `
      SELECT
        i.id,
        i.name,
        i.note,
        i.vat_apply    AS vatApply,
        i.claimed_by   AS claimedBy,
        m.name         AS claimedByName,
        i.price,
        i.receipt_url  AS receiptUrl,
        i.sort_order   AS sortOrder
      FROM items i
      LEFT JOIN members m ON i.claimed_by = m.id
      WHERE i.room_id = ?
      ORDER BY i.sort_order ASC
    `,
      )
      .all(roomId);
  },

  update(id, { name, note, vatApply }) {
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if (note !== undefined) {
      fields.push("note = ?");
      values.push(note);
    }
    if (vatApply !== undefined) {
      fields.push("vat_apply = ?");
      values.push(vatApply);
    }

    if (fields.length === 0) return;

    values.push(id);
    db.prepare(`UPDATE items SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  },

  delete(id) {
    db.prepare("DELETE FROM items WHERE id = ?").run(id);
  },

  // atomic claim — ป้องกัน race condition ด้วย WHERE claimed_by IS NULL
  claim(itemId, memberId) {
    const result = db
      .prepare(
        `
      UPDATE items SET claimed_by = ?
      WHERE id = ? AND claimed_by IS NULL
    `,
      )
      .run(memberId, itemId);

    return result.changes; // 1 = success, 0 = already claimed
  },

  unclaim(itemId, memberId) {
    const result = db
      .prepare(
        `
      UPDATE items SET claimed_by = NULL
      WHERE id = ? AND claimed_by = ?
    `,
      )
      .run(itemId, memberId);

    return result.changes; // 1 = success, 0 = not owner
  },

  // อัพเดตทั้ง price และ vat_apply พร้อมกัน (vatApply อาจเป็น undefined ถ้าไม่ต้องเปลี่ยน)
  setPrice(itemId, memberId, price, vatApply) {
    const fields = ["price = ?"];
    const values = [price];
    if (vatApply !== undefined) {
      fields.push("vat_apply = ?");
      values.push(Number(vatApply));
    }
    values.push(itemId, memberId);
    const result = db
      .prepare(
        `UPDATE items SET ${fields.join(", ")} WHERE id = ? AND claimed_by = ?`,
      )
      .run(...values);
    return result.changes; // 1 = success, 0 = not owner
  },

  setReceipt(itemId, memberId, receiptUrl) {
    const result = db
      .prepare(
        `
      UPDATE items SET receipt_url = ?
      WHERE id = ? AND claimed_by = ?
    `,
      )
      .run(receiptUrl, itemId, memberId);

    return result.changes; // 1 = success, 0 = not owner
  },
};

module.exports = Item;
