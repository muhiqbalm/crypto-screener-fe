'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // useEffect hanya berjalan di client-side, 
  // sehingga kita tahu komponen sudah aman dari SSR
  useEffect(() => {
    setMounted(true)
  }, [])

  function handleToggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      setTheme(next)
    } catch (err) {
      console.warn('ThemeToggle: localStorage write failed, applying theme visually only', err)
    }
  }

  // Jika belum mounted (masih di tahap SSR/awal hidrasi), 
  // render elemen kosong (skeleton) dengan ukuran yang sama untuk mencegah Layout Shift.
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="invisible">
        <span className="h-4 w-4" /> 
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="cursor-pointer transition-colors duration-200"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  )
}