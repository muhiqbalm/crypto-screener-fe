'use client'
import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from 'next-themes'

/** Single app-wide toaster; Sonner switches to a full-width bottom stack on mobile. */
export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <SonnerToaster
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      richColors
      closeButton
      position="bottom-right"
      visibleToasts={4}
    />
  )
}
