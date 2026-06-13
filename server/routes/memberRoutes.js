const router = require("express").Router();
const {
  verifyHostToken,
  verifyMemberToken,
  verifyAnyToken,
} = require("../middleware/auth");
const { getMembers, removeMember } = require("../controllers/memberController");

router.get("/:id/members", verifyAnyToken, getMembers);
router.delete("/:id/members/:memberId", verifyHostToken, removeMember);

module.exports = router;
