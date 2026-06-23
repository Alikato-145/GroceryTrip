const router = require("express").Router();
const { verifyToken, verifyHostToken } = require("../middleware/authMiddleware");
const {
  createGroupInRoom,
  getGroupInRoom,
  updateGroupInRoom,
  deleteGroupInRoom,
  addMemberToGroup,
  getMembersOfGroup,
  removeMemberFromGroup,
} = require("../controllers/GroupInRoomController");


router.post("/:id/groups", verifyToken, verifyHostToken, createGroupInRoom); //create
router.get("/:id/groups", verifyToken, getGroupInRoom); //get group
router.patch("/:id/groups/:groupId", verifyToken,verifyHostToken, updateGroupInRoom); //update group
router.delete("/:id/groups/:groupId", verifyToken, verifyHostToken, deleteGroupInRoom); //delete group

router.post("/:id/groups/:groupId/members", verifyToken, addMemberToGroup); //addMemberToGroup
router.get("/:id/groups/:groupId/members", verifyToken, getMembersOfGroup); //getMembersOfGroup
router.delete("/:id/groups/:groupId/members/:memberId", verifyToken, removeMemberFromGroup); //removeMemberFromGroup  

module.exports = router;