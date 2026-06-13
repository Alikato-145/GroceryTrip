import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getHostToken, getMemberId, clearRoomTokens } from "../utils/token";
import { usePolling } from "../hooks/usePolling";
import MemberList from "../components/MemberList";
import ItemRow from "../components/ItemRow";
import Settlement from "../components/Settlement";

export default function RoomHost() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [settlement, setSettlement] = useState(null);

  const [newItem, setNewItem] = useState({ name: "", note: "" });
  const [addError, setAddError] = useState(null);
  const [addLoading, setAddLoading] = useState(false);

  const [vatForm, setVatForm] = useState(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState(null);

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

  if (!getHostToken(roomId)) {
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
      await fetchAll();
    } catch (err) {
      setAddError(err.response?.data?.message || "เพิ่มรายการไม่ได้");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDeleteItem(itemId) {
    try {
      await api.delete(`/api/rooms/${roomId}/items/${itemId}`, cfg());
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "ลบไม่ได้");
    }
  }

  async function handleClaim(itemId, vatApply) {
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
    try {
      await api.delete(`/api/rooms/${roomId}/items/${itemId}/claim`, cfg());
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "คืนรายการไม่ได้");
    }
  }

  async function handleSetPrice(itemId, price, vatApply) {
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

  async function handleKickMember(memberId) {
    try {
      await api.delete(`/api/rooms/${roomId}/members/${memberId}`, cfg());
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "นำออกไม่ได้");
    }
  }

  async function handleLock() {
    try {
      await api.patch(`/api/rooms/${roomId}/lock`, {}, cfg());
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "ล็อกห้องไม่ได้");
    }
  }

  async function handleFinishRoom() {
    try {
      await api.patch(`/api/rooms/${roomId}/finish`, {}, cfg());
      setConfirmFinish(false);
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "จบห้องไม่ได้");
    }
  }

  async function handleUpdateVat(e) {
    e.preventDefault();
    try {
      await api.patch(`/api/rooms/${roomId}/vat`, vatForm, cfg());
      setVatForm(null);
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "อัพเดต VAT ไม่ได้");
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
          <p className="text-xs text-gray-400 mt-0.5">คุณคือ Host</p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(room.code);
            alert("คัดลอกรหัสห้องแล้ว!");
          }}
          className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-center hover:bg-indigo-100 transition-colors"
        >
          <p className="text-xs text-indigo-400">รหัสห้อง (แตะเพื่อ copy)</p>
          <p className="text-2xl font-bold font-mono text-indigo-600 tracking-widest">
            {room.code}
          </p>
        </button>
      </div>

      {/* Status + action buttons */}
      <div className="flex flex-wrap gap-2 items-center">
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
              ? "ล็อกแล้ว"
              : "✅ จบแล้ว"}
        </span>

        {!isFinished && room.status === "open" && (
          <button
            onClick={handleLock}
            className="text-xs bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors"
          >
            ล็อกห้อง
          </button>
        )}

        {!isFinished && (
          <>
            <button
              onClick={() =>
                setVatForm({ vatMode: room.vatMode, vatRate: room.vatRate })
              }
              className="text-xs bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ตั้งค่า VAT
            </button>
            <button
              onClick={() => setConfirmFinish(true)}
              className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors ml-auto"
            >
              🏁 จบห้อง
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400">
            ✕
          </button>
        </div>
      )}

      {/* VAT panel */}
      {vatForm && (
        <form
          onSubmit={handleUpdateVat}
          className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-gray-700">ตั้งค่า VAT</h3>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">โหมด</label>
            <select
              value={vatForm.vatMode}
              onChange={(e) =>
                setVatForm((f) => ({ ...f, vatMode: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-indigo-400"
            >
              <option value="none">ไม่มี VAT</option>
              <option value="flat">VAT ทุกรายการ</option>
              <option value="per_item">ตั้งค่าแยกต่อรายการ</option>
            </select>
          </div>
          {vatForm.vatMode !== "none" && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                อัตรา VAT (0–1)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={vatForm.vatRate}
                onChange={(e) =>
                  setVatForm((f) => ({ ...f, vatRate: Number(e.target.value) }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white text-sm py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={() => setVatForm(null)}
              className="flex-1 bg-gray-100 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* ยืนยันจบห้อง */}
      {confirmFinish && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-purple-800 font-medium">
            🏁 ยืนยันจบห้อง?
          </p>
          <p className="text-xs text-purple-600">
            ข้อมูลทั้งหมดจะถูกเก็บไว้ และระบบจะคำนวณสรุปเงินให้ทันที
          </p>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600">
              ⚠️ ยังมี {pendingCount} รายการที่ไม่มีราคา จะไม่นำมาคิดในการสรุป
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleFinishRoom}
              className="flex-1 bg-purple-600 text-white text-sm py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              ยืนยัน จบห้อง
            </button>
            <button
              onClick={() => setConfirmFinish(false)}
              className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
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
          isHost={true}
          onKick={!isFinished ? handleKickMember : null}
        />
      </section>

      {/* รายการวัตถุดิบ */}
      <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          รายการวัตถุดิบ ({items.length} รายการ)
        </h2>

        {/* ฟอร์มเพิ่มรายการ (ซ่อนเมื่อ finished) */}
        {!isFinished && (
          <>
            <form onSubmit={handleAddItem} className="flex gap-2 flex-wrap">
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
                + เพิ่ม
              </button>
            </form>
            {addError && <p className="text-xs text-red-500">{addError}</p>}
          </>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            ยังไม่มีรายการ — เพิ่มด้านบนได้เลย
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                role="host"
                currentMemberId={currentMemberId}
                isFinished={isFinished}
                vatMode={room.vatMode}
                onClaim={handleClaim}
                onUnclaim={handleUnclaim}
                onSetPrice={handleSetPrice}
                onDelete={handleDeleteItem}
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
