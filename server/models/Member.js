const db = require('../db/db')
const { randomUUID } = require('crypto')

const Member = {
  create({ roomId, name }) {
    const id = randomUUID()
    const token = randomUUID()

    db.prepare(`
      INSERT INTO members (id, room_id, name, token)
      VALUES (?, ?, ?, ?)
    `).run(id, roomId, name, token)

    return { memberId: id, memberToken: token }
  },

  findById(id) {
    return db.prepare('SELECT * FROM members WHERE id = ?').get(id)
  },

  findByToken(token) {
    return db.prepare('SELECT * FROM members WHERE token = ?').get(token)
  },

  findAllByRoom(roomId) {
    return db.prepare(`
      SELECT id, name, joined_at as joinedAt
      FROM members
      WHERE room_id = ?
      ORDER BY joined_at ASC
    `).all(roomId)
  },

  remove(id) {
    db.prepare('DELETE FROM members WHERE id = ?').run(id)
  },
}

module.exports = Member
