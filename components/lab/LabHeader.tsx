'use client'

import { usePathname } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import { PageHeader, type PageHelpContent } from '@/components/shell/page'
import { HubTabs } from '@/components/shell/HubTabs'
import { hubForPath, type HubId } from '@/lib/nav'

const HUB_LABEL: Record<HubId, string> = {
  uji: 'Sub-menu Uji strategi',
  hasil: 'Sub-menu Hasil uji',
  paper: 'Sub-menu Paper berjalan',
  koin: 'Tampilan Peluang koin',
}

/**
 * Header for Strategi (Lab) pages. The old 11-tab strip and the regime badge
 * are gone (regime lives in the market ribbon). Pages that belong to a hub
 * (Uji strategi, Hasil uji, Paper berjalan) get that hub's sub-tabs (max 3)
 * automatically; pass `hub={null}` to hide them.
 */
export function LabHeader({
  title,
  subtitle,
  actions,
  status,
  help,
  hub,
}: {
  title: string
  subtitle: string
  /** @deprecated derived from the pathname; ignored */
  active?: string
  actions?: React.ReactNode
  /** Pills next to the title, e.g. <StatusPill kind="paper" />. */
  status?: React.ReactNode
  /** "Apa ini? · Cara pakai" fold. */
  help?: PageHelpContent
  /** Force a hub's sub-tabs, or null for none. Default: derived from the URL. */
  hub?: HubId | null
}) {
  const pathname = usePathname()
  const tabs = hub === undefined ? hubForPath(pathname) : hub
  return (
    <PageHeader
      eyebrow="Strategi"
      eyebrowIcon={FlaskConical}
      tone="lab"
      title={title}
      description={subtitle}
      status={status}
      help={help}
      actions={actions}
    >
      {tabs && <HubTabs hub={tabs} label={HUB_LABEL[tabs]} />}
    </PageHeader>
  )
}
