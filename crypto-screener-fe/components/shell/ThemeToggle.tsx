'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  function handleToggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      setTheme(next)
    } catch (err) {
      console.warn('ThemeToggle: localStorage write failed, applying theme visually only', err)
      // next-themes applies the class even if storage fails
    }
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
