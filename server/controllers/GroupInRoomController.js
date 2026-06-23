const Room = require("../models/Room");
const GroupInRoom = require("../models/GroupInRoom");
const { getRoomOrFail } = require("../controllers/RoomController");
const Member = require("../models/Member");
// POST /:id/groups => create group in Room
async function createGroupInRoom(req, res) {
  const room = await getRoomOrFail(req.params.id, res);
  if (!room) return;
  const { name } = req.body;
  if (!name || !name.trim())
    return res
      .status(400)
      .json({ error: "MISSING_FIELD", message: "ต้องใส่ชื่อกลุ่ม" });
  const group = await GroupInRoom.create({ name, roomId: req.params.id });
  return res.status(201).json(group);
}

// GET /:id/groups => get all groups in Room
async function getGroupsInRoom(req, res) {
  const room = await getRoomOrFail(req.params.id, res);
  if (!room) return;
  const groups = await GroupInRoom.findAll({
    where: { roomId: req.params.id },
  });
  return res.status(200).json(groups);
}

// PATCH /:id/groups/:groupId => update group in Room
async function updateGroupInRoom(req, res) {
  const room = await getRoomOrFail(req.params.id, res);
  if (!room) return;

  const group = await GroupInRoom.findById(req.params.groupId);
  if (!group)
    return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบกลุ่ม" });

  const { name } = req.body;
  if (!name || !name.trim())
    return res
      .status(400)
      .json({ error: "MISSING_FIELD", message: "ต้องใส่ชื่อกลุ่ม" });

  const updated = await GroupInRoom.update(req.params.groupId, { name });
  return res.status(200).json(updated);
}

// DELETE /:id/groups/:groupId => delete group in Room
async function deleteGroupInRoom(req, res) {
  const room = await getRoomOrFail(req.params.id, res);
  if (!room) return;

  await GroupInRoom.delete(req.params.groupId);
  return res.status(204).json();
}

// POST /:id/groups/:groupId/members => add member to group in Room
async function addMemberToGroup(req, res) {
  const group = await GroupInRoom.findById(req.params.groupId);
  if (!group)
    return res.status(404).json({ error: "NOT_FOUND", message: "ไม่พบกลุ่ม" });

  const userId = req.user.userId; 
  const member = await Member.findById(userId);
  if (!member || member.room_id !== req.params.id)
    return res.status(403).json({ error: "FORBIDDEN", message: "member ไม่อยู่ใน room นี้" });

  const updated = await GroupInRoom.addMember(req.params.groupId, userId);
  return res.status(200).json(updated);
}

// GET /:id/groups/:groupId/members => get members of group in Room
async function getMembersOfGroup(req, res) {
  const room = await getRoomOrFail(req.params.id, res);
  if (!room) return;
  const members = await GroupInRoom.findMembersByGroupId(req.params.groupId);
  return res.status(200).json(members);
}
// DELETE /:id/groups/:groupId/members/:memberId => remove member from group in Room
async function removeMemberFromGroup(req, res) {
  const room = await getRoomOrFail(req.params.id, res);
  if (!room) return;
  await GroupInRoom.removeMember(req.params.groupId,req.params.memberId);
  return res.status(204).json();
}
module.exports = {
  createGroupInRoom,
  getGroupsInRoom,
  updateGroupInRoom,
  deleteGroupInRoom,
  addMemberToGroup,
  getMembersOfGroup,
  removeMemberFromGroup,
};
