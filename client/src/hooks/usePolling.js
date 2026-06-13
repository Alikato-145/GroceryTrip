import { useEffect, useRef } from 'react'

// เรียก callback ทันทีครั้งแรก แล้ว poll ซ้ำทุก intervalMs ms
export function usePolling(callback, intervalMs = 3000, enabled = true) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return
    callbackRef.current()
    const id = setInterval(() => callbackRef.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
