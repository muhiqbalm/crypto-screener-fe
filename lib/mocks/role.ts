/** Mock-mode QA switch: env NEXT_PUBLIC_MOCK_ROLE=member, or localStorage "bmtm:mock-role" = "member". */
export function mockRoleIsMember(): boolean {
  if (process.env.NEXT_PUBLIC_MOCK_ROLE === 'member') return true
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('bmtm:mock-role') === 'member'
  } catch {
    return false
  }
}
