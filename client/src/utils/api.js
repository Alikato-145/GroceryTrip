import axios from "axios";
import { getHostToken, getMemberToken } from "./token";

// ใช้ VITE_API_URL ใน production, fallback เป็น localhost ตอน dev
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

// แนบ token ที่เหมาะสมก่อนทุก request
api.interceptors.request.use((config) => {
  const roomId = config.__roomId;
  if (roomId) {
    const hostToken = getHostToken(roomId);
    const memberToken = getMemberToken(roomId);
    if (hostToken) config.headers["X-Host-Token"] = hostToken;
    if (memberToken) config.headers["X-Member-Token"] = memberToken;
  }
  return config;
});

export default api;
