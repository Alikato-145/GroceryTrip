import { useState } from "react";

// แสดงรายการวัตถุดิบ 1 แถว พร้อม action ตาม role และ state ของรายการ
export default function ItemRow({
  item,
  role,
  currentMemberId,
  isFinished,
  vatMode,
  onClaim,
  onUnclaim,
  onSetPrice,
  onDelete,
}) {
  const [priceInput, setPriceInput] = useState("");
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceVatApply, setPriceVatApply] = useState(false); // VAT ตอนใส่ราคา
  const [claimVatApply, setClaimVatApply] = useState(false); // VAT ตอนกดรับ

  const isMine = item.claimedBy === currentMemberId;
  const isClaimed = item.claimedBy != null;
  const hasPrice = item.price != null;

  // เมื่อเปิดฟอร์มราคา ให้ sync checkbox กับ vatApply ปัจจุบันของ item
  function handleStartEditPrice() {
    setPriceVatApply(item.vatApply === 1);
    setEditingPrice(true);
  }

  function handlePriceSubmit(e) {
    e.preventDefault();
    const val = parseFloat(priceInput);
    if (isNaN(val) || val < 0) return;
    onSetPrice(item.id, val, priceVatApply);
    setEditingPrice(false);
    setPriceInput("");
  }

  // checkbox VAT แสดงเฉพาะ per_item mode เท่านั้น
  const showVatCheckbox = vatMode === "per_item";

  return (
    <li className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      {/* ชื่อสินค้า + หมายเหตุ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className={`font-medium text-gray-800 truncate ${isClaimed && !isMine ? "opacity-50" : ""}`}
          >
            {item.name}
          </p>
          {/* badge VAT บน item — แสดงเฉพาะ per_item และ item นั้นมี vatApply */}
          {showVatCheckbox && item.vatApply === 1 && (
            <span className="shrink-0 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
              VAT
            </span>
          )}
        </div>
        {item.note && (
          <p className="text-xs text-gray-400 truncate">{item.note}</p>
        )}
      </div>

      {/* แสดงราคาสุทธิ (รวม VAT ถ้ามี) */}
      {hasPrice && (
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-green-600">
              ฿{Number(item.effectivePrice ?? item.price).toFixed(2)}
            </span>
            {item.effectivePrice != null &&
              item.effectivePrice !== item.price && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                  +VAT
                </span>
              )}
          </div>
          {item.effectivePrice != null &&
            item.effectivePrice !== item.price && (
              <span className="text-xs text-gray-400">
                ก่อน VAT ฿{Number(item.price).toFixed(2)}
              </span>
            )}
        </div>
      )}

      {/* badge ชื่อคนที่รับ (แสดงก่อนใส่ราคา) */}
      {isClaimed && !hasPrice && (
        <span
          className={`text-xs px-2 py-1 rounded-full shrink-0 ${
            isMine
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {isMine ? "คุณรับแล้ว" : item.claimedByName || "มีคนรับแล้ว"}
        </span>
      )}

      {/* Action zone — ซ่อนทั้งหมดเมื่อห้อง finished */}
      <div className="flex items-center gap-2 shrink-0">
        {/* ========== MEMBER actions ========== */}
        {!isFinished && role === "member" && (
          <>
            {/* ยังไม่มีคนรับ → ปุ่มรับ + checkbox VAT (per_item) */}
            {!isClaimed && (
              <div className="flex items-center gap-2">
                {showVatCheckbox && (
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={claimVatApply}
                      onChange={(e) => setClaimVatApply(e.target.checked)}
                      className="w-3.5 h-3.5 accent-yellow-500"
                    />
                    มี VAT
                  </label>
                )}
                <button
                  onClick={() => onClaim(item.id, claimVatApply)}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  รับ
                </button>
              </div>
            )}

            {/* ฉันรับแล้ว + ยังไม่มีราคา → ฟอร์มราคา + checkbox VAT */}
            {isMine && !hasPrice && (
              <>
                {editingPrice ? (
                  <form
                    onSubmit={handlePriceSubmit}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="ราคา"
                      className="w-24 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                      autoFocus
                    />
                    {showVatCheckbox && (
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={priceVatApply}
                          onChange={(e) => setPriceVatApply(e.target.checked)}
                          className="w-3.5 h-3.5 accent-yellow-500"
                        />
                        มี VAT
                      </label>
                    )}
                    <button
                      type="submit"
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPrice(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ยกเลิก
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={handleStartEditPrice}
                    className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ใส่ราคา
                  </button>
                )}
                <button
                  onClick={() => onUnclaim(item.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  คืน
                </button>
              </>
            )}

            {isMine && hasPrice && (
              <span className="text-xs text-green-600 font-medium">
                ซื้อแล้ว ✓
              </span>
            )}
          </>
        )}

        {/* ========== HOST actions ========== */}
        {!isFinished && role === "host" && (
          <>
            {/* ยังไม่มีคนรับ → รับ + VAT checkbox + ลบ */}
            {!isClaimed && (
              <div className="flex items-center gap-2">
                {showVatCheckbox && (
                  <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={claimVatApply}
                      onChange={(e) => setClaimVatApply(e.target.checked)}
                      className="w-3.5 h-3.5 accent-yellow-500"
                    />
                    มี VAT
                  </label>
                )}
                <button
                  onClick={() => onClaim(item.id, claimVatApply)}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  รับ
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors"
                  title="ลบรายการ"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* host รับแล้ว + ยังไม่มีราคา → ฟอร์มราคา + VAT checkbox */}
            {isMine && !hasPrice && (
              <>
                {editingPrice ? (
                  <form
                    onSubmit={handlePriceSubmit}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      placeholder="ราคา"
                      className="w-24 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                      autoFocus
                    />
                    {showVatCheckbox && (
                      <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={priceVatApply}
                          onChange={(e) => setPriceVatApply(e.target.checked)}
                          className="w-3.5 h-3.5 accent-yellow-500"
                        />
                        มี VAT
                      </label>
                    )}
                    <button
                      type="submit"
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 transition-colors"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPrice(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ยกเลิก
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={handleStartEditPrice}
                    className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ใส่ราคา
                  </button>
                )}
                <button
                  onClick={() => onUnclaim(item.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  คืน
                </button>
              </>
            )}

            {isMine && hasPrice && (
              <span className="text-xs text-green-600 font-medium">
                ซื้อแล้ว ✓
              </span>
            )}

            {/* คนอื่นรับแล้ว → แสดงชื่อ */}
            {isClaimed && !isMine && (
              <span className="text-xs text-gray-400">
                {item.claimedByName || "มีคนรับแล้ว"}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  );
}
