import { useEffect } from 'react'

/**
 * Auto-dismissing toast. The trade confirmation used to be rendered inline and stayed on
 * screen indefinitely — it only disappeared when the next trade replaced it.
 */
export default function Toast({ msg, onDone, ms = 3500 }) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => onDone?.(), ms)
    return () => clearTimeout(t)
  }, [msg, ms, onDone])

  if (!msg) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`toast fixed inset-x-4 bottom-32 z-30 mx-auto max-w-sm rounded-xl border px-4 py-3 text-center text-sm font-medium backdrop-blur sm:bottom-8
        ${msg.ok
          ? 'border-gain/40 bg-gain/15 text-gain'
          : 'border-loss/40 bg-loss/15 text-loss'}`}>
      {msg.text}
    </div>
  )
}
