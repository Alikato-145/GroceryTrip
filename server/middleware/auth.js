const Member = require("../models/Member");
const Room = require("../models/Room");

// ตรวจสอบว่า X-Host-Token ถูกต้องและเป็น host ของห้องนี้
function verifyHostToken(req, res, next) {
  const token = req.headers["x-host-token"];
  const roomId = req.params.id;
  if (!token)
    return res
      .status(401)
      .json({ error: "NO_TOKEN", message: "ต้องใส่ host token" });
  const room = Room.findById(roomId);
  if (!room)
    return res
      .status(404)
      .json({ error: "ROOM_NOT_FOUND", message: "ไม่พบห้อง" });
  if (room.host_token !== token)
    return res
      .status(401)
      .json({ error: "INVALID_TOKEN", message: "token ไม่ถูกต้อง" });
  req.room = room;
  // ให้ req.member ชี้ไปที่ member record ของ host ด้วย เพื่อให้ใช้ req.member.id ได้เสมอ
  if (room.host_member_id) {
    req.member = Member.findById(room.host_member_id);
  }
  next();
}

// ตรวจสอบว่า X-Member-Token เป็น member ของห้องนี้
function verifyMemberToken(req, res, next) {
  const token = req.headers["x-member-token"];
  const roomId = req.params.id;
  if (!token)
    return res
      .status(401)
      .json({ error: "NO_TOKEN", message: "ต้องใส่ member token" });
  const member = Member.findByToken(token);
  if (!member || member.room_id !== roomId)
    return res
      .status(401)
      .json({ error: "INVALID_TOKEN", message: "token ไม่ถูกต้อง" });
  req.member = member;
  next();
}

// รับทั้ง host token และ member token
// ใช้กับ endpoint ที่ทั้งสองฝ่ายต้องเข้าถึงได้ (GET, claim, addItem ฯลฯ)
function verifyAnyToken(req, res, next) {
  const hostToken = req.headers["x-host-token"];
  const memberToken = req.headers["x-member-token"];
  const roomId = req.params.id;

  if (hostToken) {
    const room = Room.findById(roomId);
    if (!room)
      return res
        .status(404)
        .json({ error: "ROOM_NOT_FOUND", message: "ไม่พบห้อง" });
    if (room.host_token !== hostToken)
      return res
        .status(401)
        .json({ error: "INVALID_TOKEN", message: "token ไม่ถูกต้อง" });
    req.room = room;
    // แนบ member record ของ host เพื่อให้ controller ใช้ req.member.id ได้
    if (room.host_member_id) {
      req.member = Member.findById(room.host_member_id);
    }
    return next();
  }

  if (memberToken) {
    const member = Member.findByToken(memberToken);
    if (!member || member.room_id !== roomId)
      return res
        .status(401)
        .json({ error: "INVALID_TOKEN", message: "token ไม่ถูกต้อง" });
    req.member = member;
    return next();
  }

  return res.status(401).json({ error: "NO_TOKEN", message: "ต้องใส่ token" });
}

module.exports = { verifyHostToken, verifyMemberToken, verifyAnyToken };
