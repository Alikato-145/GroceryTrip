import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getMemberToken, getMemberId } from "../utils/token";
import { usePolling } from "../hooks/usePolling";
import MemberList from "../components/MemberList";
import ItemRow from "../components/ItemRow";
import Settlement from "../components/Settlement";

export default function RoomMember() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [error, setError] = useState(null);

  const [newItem, setNewItem] = useState({ name: "", note: "" });
  const [addError, setAddError] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const currentMemberId = getMemberId(roomId);
  const cfg = () => ({ __roomId: roomId });

  const fetchAll = useCallback(async () => {
    try {
      const [rRes, mRes, iRes] = await Promise.all([
        api.get(`/api/rooms/${roomId}`, cfg()),
        api.get(`/api/rooms/${roomId}/members`, cfg()),
        api.get(`/api/rooms/${roomId}/items`, cfg()),
      ]);
      setRoom(rRes.data);
      setMembers(mRes.data);
      setItems(iRes.data);

      // แสดง settlement เมื่อห้อง finished
      if (rRes.data.status === "finished") {
        const sRes = await api.get(`/api/rooms/${roomId}/settlement`, cfg());
        setSettlement(sRes.data);
      } else {
        setSettlement(null);
      }
    } catch (err) {
      if (err.response?.status === 401) navigate("/");
    }
  }, [roomId]);

  if (!getMemberToken(roomId)) {
    navigate("/");
    return null;
  }

  usePolling(fetchAll, 3000);

  const isFinished = room?.status === "finished";
  const pendingCount = items.filter((i) => i.price == null).length;

  async function handleAddItem(e) {
    e.preventDefault();
    if (!newItem.name.trim()) return setAddError("ใส่ชื่อสินค้าก่อนนะ");
    setAddLoading(true);
    setAddError(null);
    try {
      await api.post(
        `/api/rooms/${roomId}/items`,
        {
          name: newItem.name.trim(),
          note: newItem.note.trim() || undefined,
        },
        cfg(),
      );
      setNewItem({ name: "", note: "" });
      setShowAddForm(false);
      await fetchAll();
    } catch (err) {
      setAddError(err.response?.data?.message || "เพิ่มรายการไม่ได้");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleClaim(itemId, vatApply) {
    setError(null);
    try {
      await api.post(
        `/api/rooms/${roomId}/items/${itemId}/claim`,
        { vatApply: vatApply ? 1 : 0 },
        cfg(),
      );
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "รับรายการไม่ได้");
    }
  }

  async function handleUnclaim(itemId) {
    setError(null);
    try {
      await api.delete(`/api/rooms/${roomId}/items/${itemId}/claim`, cfg());
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "คืนรายการไม่ได้");
    }
  }

  async function handleSetPrice(itemId, price, vatApply) {
    setError(null);
    try {
      await api.patch(
        `/api/rooms/${roomId}/items/${itemId}/price`,
        { price, vatApply: vatApply ? 1 : 0 },
        cfg(),
      );
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "ใส่ราคาไม่ได้");
    }
  }

  if (!room)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        กำลังโหลด...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{room.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">คุณคือสมาชิก</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">รหัสห้อง</p>
          <p className="text-xl font-bold font-mono text-indigo-600 tracking-widest">
            {room.code}
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            room.status === "open"
              ? "bg-green-100 text-green-700"
              : room.status === "locked"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-purple-100 text-purple-700"
          }`}
        >
          {room.status === "open"
            ? "เปิดอยู่"
            : room.status === "locked"
              ? "ล็อกแล้ว (ไม่รับสมาชิกใหม่)"
              : "✅ จบแล้ว — ดูสรุปด้านล่าง"}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400">
            ✕
          </button>
        </div>
      )}

      {/* รายชื่อสมาชิก */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          สมาชิก ({members.length} คน)
        </h2>
        <MemberList
          members={members}
          currentMemberId={currentMemberId}
          isHost={false}
        />
      </section>

      {/* รายการวัตถุดิบ */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            รายการวัตถุดิบ ({items.length} รายการ)
          </h2>
          {/* ปุ่มเพิ่มรายการ — ซ่อนเมื่อ finished */}
          {!isFinished && (
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {showAddForm ? "ยกเลิก" : "+ เพิ่มรายการ"}
            </button>
          )}
        </div>

        {/* ฟอร์มเพิ่มรายการ (toggle) */}
        {showAddForm && !isFinished && (
          <form
            onSubmit={handleAddItem}
            className="flex gap-2 flex-wrap bg-indigo-50 p-3 rounded-xl"
          >
            <input
              type="text"
              value={newItem.name}
              onChange={(e) =>
                setNewItem((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="ชื่อสินค้า"
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
            <input
              type="text"
              value={newItem.note}
              onChange={(e) =>
                setNewItem((f) => ({ ...f, note: e.target.value }))
              }
              placeholder="หมายเหตุ (เช่น 500g)"
              className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={addLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              เพิ่ม
            </button>
            {addError && (
              <p className="w-full text-xs text-red-500">{addError}</p>
            )}
          </form>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            Host ยังไม่ได้เพิ่มรายการ — รอสักครู่
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                role="member"
                currentMemberId={currentMemberId}
                isFinished={isFinished}
                vatMode={room.vatMode}
                onClaim={handleClaim}
                onUnclaim={handleUnclaim}
                onSetPrice={handleSetPrice}
              />
            ))}
          </ul>
        )}

        {!isFinished && items.length > 0 && pendingCount > 0 && (
          <p className="text-xs text-amber-500 text-center">
            ⏳ รอ {pendingCount} รายการที่ยังไม่มีราคา
          </p>
        )}
      </section>

      {/* Settlement — แสดงเมื่อ finished */}
      {settlement && <Settlement data={settlement} />}
    </div>
  );
}
