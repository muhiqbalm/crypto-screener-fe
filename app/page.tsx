import { redirect } from 'next/navigation'

// `/` → Beranda (307). Not logged in? The (app) AuthGuard sends the user to
// /login?next=/beranda.
export default function RootPage() {
  redirect('/beranda')
}
