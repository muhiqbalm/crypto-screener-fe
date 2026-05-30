'use client'
import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <>
      {/* Mobile: top-center (< sm) */}
      <div className="sm:hidden">
        <SonnerToaster richColors closeButton position="top-center" visibleToasts={4} />
      </div>
      {/* Desktop: bottom-right (sm+) */}
      <div className="hidden sm:block">
        <SonnerToaster richColors closeButton position="bottom-right" visibleToasts={4} />
      </div>
    </>
  )
}
