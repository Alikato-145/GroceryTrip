const db = require("../db/db");
const { randomUUID } = require("crypto");

const GroupInroom = {
  create: async ({ name, roomId }) => {
    const id = randomUUID();
    db.prepare(
      "INSERT INTO groupInroom (id, name, room_id) VALUES (?, ?, ?)",
    ).run(id, name, roomId);
    return db.prepare("SELECT * FROM groupInroom WHERE id = ?").get(id);
  },
  findByroomId: async (roomId) => {
    return db.prepare("SELECT * FROM groupInroom WHERE room_id = ?").all(roomId);
  },
  findById: async (id) => {
    return db.prepare("SELECT * FROM groupInroom WHERE id = ?").get(id);
  },
  update: async (id, { name }) => {
    db.prepare("UPDATE groupInroom SET name = ? WHERE id = ?").run(name, id);
    return db.prepare("SELECT * FROM groupInroom WHERE id = ?").get(id);
  },
  delete: async (id) => {
    db.prepare("DELETE FROM groupInroom WHERE id = ?").run(id);
  },
  addMember: async (groupId, memberId) => {
    const id = randomUUID();
    db.prepare("INSERT INTO groupsInroomMembers (id, group_id, member_id) VALUES (?, ?, ?)").run(id, groupId, memberId);
    return db.prepare("SELECT * FROM groupsInroomMembers WHERE id = ?").get(id);
  },
  findMembersByGroupId: async (groupId) => {
    return db.prepare("SELECT * FROM groupsInroomMembers WHERE group_id = ?").all(groupId);
  },
  removeMember: async (memberId) => {
    db.prepare("DELETE FROM groupsInroomMembers WHERE member_id = ?").run(memberId);
  },
};

module.exports = GroupInroom;
