const router = require("express").Router();
const { verifyHostToken, verifyAnyToken } = require("../middleware/auth");
const {
  createRoom,
  joinRoom,
  getRoom,
  lockRoom,
  finishRoom,
  deleteRoom,
  updateVat,
  getSettlement,
} = require("../controllers/roomController");

router.post("/", createRoom);
router.post("/:code/join", joinRoom);
router.get("/:id", verifyAnyToken, getRoom);
router.patch("/:id/lock", verifyHostToken, lockRoom);
router.patch("/:id/finish", verifyHostToken, finishRoom);
router.delete("/:id", verifyHostToken, deleteRoom);
router.patch("/:id/vat", verifyHostToken, updateVat);
router.get("/:id/settlement", verifyAnyToken, getSettlement);

module.exports = router;
