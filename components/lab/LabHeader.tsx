'use client'

import { FlaskConical } from 'lucide-react'
import { PageHeader } from '@/components/shell/page'
import { PageTabs } from '@/components/shell/PageTabs'
import { LAB_NAV } from '@/lib/nav'
import { RegimeBadge } from '@/components/lab/outlook/RegimeBadge'

/**
 * Header for every Strategy Lab page: eyebrow + title + the Lab tab strip.
 * Tabs come from LAB_NAV in lib/nav.ts — add new Lab pages there.
 * `active` is accepted for backwards compatibility; the active tab is now
 * derived from the URL.
 */
export function LabHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle: string
  /** @deprecated derived from the pathname */
  active?: string
  actions?: React.ReactNode
}) {
  return (
    <PageHeader
      eyebrow="Strategy Lab"
      eyebrowIcon={FlaskConical}
      tone="lab"
      title={title}
      description={subtitle}
      actions={
        <>
          <RegimeBadge />
          {actions}
        </>
      }
    >
      <PageTabs items={LAB_NAV} label="Navigasi Lab" />
    </PageHeader>
  )
}
