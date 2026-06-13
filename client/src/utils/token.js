// จัดการ token ใน localStorage
// host_token  → ใช้สำหรับ host ของห้อง (เก็บ per roomId)
// member_token → ใช้สำหรับ member ของห้อง (เก็บ per roomId)

export function getHostToken(roomId) {
  return localStorage.getItem(`host_token_${roomId}`)
}

export function setHostToken(roomId, token) {
  localStorage.setItem(`host_token_${roomId}`, token)
}

export function getMemberToken(roomId) {
  return localStorage.getItem(`member_token_${roomId}`)
}

export function setMemberToken(roomId, token) {
  localStorage.setItem(`member_token_${roomId}`, token)
}

export function getMemberId(roomId) {
  return localStorage.getItem(`member_id_${roomId}`)
}

export function setMemberId(roomId, memberId) {
  localStorage.setItem(`member_id_${roomId}`, memberId)
}

export function clearRoomTokens(roomId) {
  localStorage.removeItem(`host_token_${roomId}`)
  localStorage.removeItem(`member_token_${roomId}`)
  localStorage.removeItem(`member_id_${roomId}`)
}

// ตรวจสอบว่าเคยเข้าห้องนี้ในฐานะอะไร
export function getRoleInRoom(roomId) {
  if (getHostToken(roomId)) return 'host'
  if (getMemberToken(roomId)) return 'member'
  return null
}
