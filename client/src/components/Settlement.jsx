// แสดงผลสรุปการหารเงิน
export default function Settlement({ data }) {
  if (!data) return null

  const { totalCost, perHead, balances, transactions } = data

  // สร้าง text สรุปสำหรับ copy ส่งกลุ่ม Line
  function buildSummaryText() {
    const lines = ['📋 สรุปค่าใช้จ่าย GroceryTrip', '']
    lines.push(`ยอดรวม: ฿${totalCost.toFixed(2)}`)
    lines.push(`ค่าต่อหัว: ฿${perHead.toFixed(2)}`)
    lines.push('')
    lines.push('รายละเอียดแต่ละคน:')
    balances.forEach(b => {
      const diff = b.balance >= 0
        ? `+฿${b.balance.toFixed(2)} (รับคืน)`
        : `-฿${Math.abs(b.balance).toFixed(2)} (ต้องจ่ายเพิ่ม)`
      lines.push(`  ${b.name}: จ่ายไป ฿${b.paid.toFixed(2)}  ${diff}`)
    })
    if (transactions.length > 0) {
      lines.push('')
      lines.push('💸 โอนเงิน:')
      transactions.forEach(t => {
        lines.push(`  ${t.from} โอนให้ ${t.to} → ฿${t.amount.toFixed(2)}`)
      })
    }
    return lines.join('\n')
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildSummaryText())
      .then(() => alert('คัดลอกสรุปแล้ว!'))
      .catch(() => alert('ไม่สามารถคัดลอกได้'))
  }

  return (
    <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-green-800">สรุปการหารเงิน</h3>
        <button
          onClick={handleCopy}
          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
        >
          Copy สรุป
        </button>
      </div>

      {/* ยอดรวม + ต่อหัว */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 text-center border border-green-100">
          <p className="text-xs text-gray-500">ยอดรวมทั้งหมด</p>
          <p className="text-xl font-bold text-gray-800">฿{totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-green-100">
          <p className="text-xs text-gray-500">ค่าต่อหัว</p>
          <p className="text-xl font-bold text-indigo-600">฿{perHead.toFixed(2)}</p>
        </div>
      </div>

      {/* ตาราง balance */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-b border-green-200">
              <th className="text-left pb-1">ชื่อ</th>
              <th className="text-right pb-1">จ่ายไป</th>
              <th className="text-right pb-1">ผลต่าง</th>
            </tr>
          </thead>
          <tbody>
            {balances.map(b => (
              <tr key={b.memberId} className="border-b border-green-100 last:border-0">
                <td className="py-1.5 text-gray-700 font-medium">{b.name}</td>
                <td className="py-1.5 text-right text-gray-600">฿{b.paid.toFixed(2)}</td>
                <td className={`py-1.5 text-right font-semibold ${
                  b.balance >= 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {b.balance >= 0 ? '+' : ''}฿{b.balance.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* รายการโอนเงิน */}
      {transactions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">โอนเงิน</p>
          {transactions.map((t, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-green-100"
            >
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-red-500">{t.from}</span>
                <span className="mx-2 text-gray-400">→</span>
                <span className="font-semibold text-green-600">{t.to}</span>
              </span>
              <span className="text-sm font-bold text-gray-800">฿{t.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {transactions.length === 0 && (
        <p className="text-sm text-center text-green-600 font-medium">🎉 ทุกคนจ่ายเท่ากันพอดี ไม่ต้องโอน</p>
      )}
    </div>
  )
}
