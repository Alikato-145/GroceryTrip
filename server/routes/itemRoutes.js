const router = require("express").Router();
const { verifyHostToken, verifyAnyToken } = require("../middleware/auth");
const {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  claimItem,
  unclaimItem,
  setPrice,
  setReceipt,
} = require("../controllers/itemController");

router.get("/:id/items", verifyAnyToken, getItems);
router.post("/:id/items", verifyAnyToken, createItem); // ทั้ง host และ member เพิ่มได้
router.patch("/:id/items/:itemId", verifyHostToken, updateItem); // แก้ชื่อ/note — host เท่านั้น
router.delete("/:id/items/:itemId", verifyAnyToken, deleteItem); // ลบ — เจ้าของ item เท่านั้น
router.post("/:id/items/:itemId/claim", verifyAnyToken, claimItem); // claim — ทุกคน
router.delete("/:id/items/:itemId/claim", verifyAnyToken, unclaimItem); // unclaim — เจ้าของ
router.patch("/:id/items/:itemId/price", verifyAnyToken, setPrice); // ใส่ราคา — เจ้าของ
router.post("/:id/items/:itemId/receipt", verifyAnyToken, setReceipt); // แนบใบเสร็จ — เจ้าของ

module.exports = router;
