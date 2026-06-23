const router = require("express").Router();
const { verifyToken, verifyHostToken } = require("../middleware/authMiddleware");



router.post("/:id/groups", verifyToken, verifyHostToken, createGroup); //create
router.get("/:id/groups", verifyToken, getGroups); //get group
router.patch("/:id/groups/:groupId", verifyToken, updateGroup); //update group
router.delete("/:id/groups/:groupId", verifyToken, verifyHostToken, deleteGroup); //delete group

router.post("/:id/groups/:groupId/add", verifyToken, addMemberToGroup); //addMemberToGroup
router.get("/:id/groups/:groupId", verifyToken, getMembersOfGroup); //getMembersOfGroup
router.delete("/:id/groups/:groupId/:memberId", verifyToken, removeMemberFromGroup); //removeMemberFromGroup  

module.exports = router;