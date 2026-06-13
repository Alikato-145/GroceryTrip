import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { setHostToken, setMemberToken, setMemberId } from "../utils/token";

export default function Home() {
  const navigate = useNavigate();

  // ฟอร์มสร้างห้อง
  const [createForm, setCreateForm] = useState({
    name: "",
    hostName: "",
    vatMode: "none",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // ฟอร์ม join ห้อง
  const [joinForm, setJoinForm] = useState({ code: "", memberName: "" });
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.name.trim()) return setCreateError("ใส่ชื่อห้องก่อนนะ");
    if (!createForm.hostName.trim())
      return setCreateError("ใส่ชื่อของคุณก่อนนะ");
    setCreateLoading(true);
    setCreateError(null);
    try {
      const { data } = await api.post("/api/rooms", {
        name: createForm.name.trim(),
        hostName: createForm.hostName.trim(),
        vatMode: createForm.vatMode,
      });
      // host ได้รับทั้ง hostToken และ memberToken (สำหรับ claim ของ)
      setHostToken(data.roomId, data.hostToken);
      setMemberToken(data.roomId, data.memberToken);
      setMemberId(data.roomId, data.memberId);
      navigate(`/room/${data.roomId}/host`);
    } catch (err) {
      setCreateError(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinForm.code.trim()) return setJoinError("ใส่รหัสห้องก่อนนะ");
    if (!joinForm.memberName.trim()) return setJoinError("ใส่ชื่อของคุณก่อนนะ");
    setJoinLoading(true);
    setJoinError(null);
    try {
      const { data } = await api.post(
        `/api/rooms/${joinForm.code.trim().toUpperCase()}/join`,
        {
          name: joinForm.memberName.trim(),
        },
      );
      setMemberToken(data.roomId, data.memberToken);
      setMemberId(data.roomId, data.memberId);
      navigate(`/room/${data.roomId}/member`);
    } catch (err) {
      setJoinError(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">🛒 GroceryTrip</h1>
          <p className="mt-1 text-sm text-gray-500">
            จัดการของซื้อและหารเงินสำหรับทริปกับเพื่อน
          </p>
        </div>

        {/* สร้างห้อง */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            สร้างห้องใหม่
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ชื่อห้อง
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="เช่น ทริปเขาใหญ่ ปี 68"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ชื่อของคุณ (เจ้าของห้อง)
              </label>
              <input
                type="text"
                value={createForm.hostName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, hostName: e.target.value }))
                }
                placeholder="เช่น ปอ"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                การคิด VAT
              </label>
              <select
                value={createForm.vatMode}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, vatMode: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white"
              >
                <option value="none">ไม่มี VAT</option>
                <option value="flat">VAT ทุกรายการ</option>
                <option value="per_item">ตั้งค่าแยกต่อรายการ</option>
              </select>
            </div>
            {createError && (
              <p className="text-sm text-red-500">{createError}</p>
            )}
            <button
              type="submit"
              disabled={createLoading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {createLoading ? "กำลังสร้าง..." : "สร้างห้อง"}
            </button>
          </form>
        </div>

        {/* เส้นคั่น */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-sm text-gray-400">หรือ</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Join ห้อง */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            เข้าร่วมห้อง
          </h2>
          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                รหัสห้อง (6 หลัก)
              </label>
              <input
                type="text"
                value={joinForm.code}
                onChange={(e) =>
                  setJoinForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="เช่น AB12CD"
                maxLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                ชื่อของคุณ
              </label>
              <input
                type="text"
                value={joinForm.memberName}
                onChange={(e) =>
                  setJoinForm((f) => ({ ...f, memberName: e.target.value }))
                }
                placeholder="เช่น แบงค์"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            {joinError && <p className="text-sm text-red-500">{joinError}</p>}
            <button
              type="submit"
              disabled={joinLoading}
              className="w-full bg-gray-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              {joinLoading ? "กำลังเข้าร่วม..." : "เข้าร่วมห้อง"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
