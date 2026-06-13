const Member = require('../models/Member')

// GET /api/rooms/:id/members  (verifyMemberToken ผ่านแล้ว)
function getMembers(req, res) {
  const members = Member.findAllByRoom(req.params.id)
  return res.json(members)
}

// DELETE /api/rooms/:id/members/:memberId  (verifyHostToken ผ่านแล้ว)
function removeMember(req, res) {
  const { memberId } = req.params
  const member = Member.findById(memberId)
  if (!member || member.room_id !== req.params.id) {
    return res.status(404).json({ error: 'MEMBER_NOT_FOUND', message: 'ไม่พบสมาชิก' })
  }
  Member.remove(memberId)
  return res.json({ removed: true })
}

module.exports = { getMembers, removeMember }
