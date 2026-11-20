import type { ReactNode } from 'react'

export function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={wide ? 'sheet wide' : 'sheet'} role="dialog" aria-modal>
        {children}
      </div>
    </div>
  )
}
