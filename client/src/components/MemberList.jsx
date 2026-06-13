// แสดงรายชื่อสมาชิกในห้อง
export default function MemberList({ members, currentMemberId, isHost, onKick }) {
  if (!members || members.length === 0) {
    return <p className="text-sm text-gray-400">ยังไม่มีสมาชิก</p>
  }

  return (
    <ul className="space-y-1">
      {members.map(m => (
        <li
          key={m.id}
          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200"
        >
          <span className="text-sm font-medium text-gray-700">
            {m.name}
            {m.id === currentMemberId && (
              <span className="ml-2 text-xs text-indigo-500">(คุณ)</span>
            )}
          </span>

          {/* Host สามารถ kick สมาชิกได้ (ยกเว้น host เอง) */}
          {isHost && m.id !== currentMemberId && (
            <button
              onClick={() => onKick(m.id)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              นำออก
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
