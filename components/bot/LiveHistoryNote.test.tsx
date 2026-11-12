import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveHistoryNote } from './LiveHistoryNote'

describe('LiveHistoryNote (audit 2026-11-13 P2)', () => {
  it('says plainly where the live history starts and where the older orders are', () => {
    render(<LiveHistoryNote />)
    const note = screen.getByRole('note')
    expect(note.textContent).toContain('Riwayat bot live mulai 6 Nov 2026')
    expect(note.textContent).toContain('Cek bot live')
    expect(note.textContent).toContain('tanpa harga fill')
  })
})
