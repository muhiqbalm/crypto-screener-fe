'use client'

import * as React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTabFromHash, setTabHash, type TabId } from '@/lib/utils/hash-tab'
import { cn } from '@/lib/utils/cn'

interface TabNavigationProps {
  screenerContent: React.ReactNode
  webhookContent: React.ReactNode
}

export function TabNavigation({ screenerContent, webhookContent }: TabNavigationProps) {
  const activeTab = useTabFromHash()

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setTabHash(value as TabId)}
      className="w-full"
    >
      {/*
       * Radix TabsPrimitive.List renders role="tablist" automatically.
       * Each TabsTrigger renders role="tab" with aria-selected and aria-controls.
       * Each TabsContent renders role="tabpanel" with aria-labelledby.
       * Left/Right arrow key navigation between triggers is handled by Radix.
       *
       * Mobile (< sm): grid grid-cols-2 w-full — full-width equal-width triggers (Req 14.4)
       * sm+: inline-flex w-auto — natural shrink-wrap
       */}
      <TabsList
        className={cn(
          // Mobile-first: full-width 2-column grid
          'grid grid-cols-2 w-full',
          // sm and above: revert to inline-flex natural width
          'sm:inline-flex sm:w-auto'
        )}
      >
        <TabsTrigger
          value="screener"
          className="cursor-pointer transition-all duration-200"
        >
          Market Screener
        </TabsTrigger>
        <TabsTrigger
          value="webhook"
          className="cursor-pointer transition-all duration-200"
        >
          Webhook &amp; Automation
        </TabsTrigger>
      </TabsList>

      <TabsContent value="screener" className="mt-4">
        {screenerContent}
      </TabsContent>

      <TabsContent value="webhook" className="mt-4">
        {webhookContent}
      </TabsContent>
    </Tabs>
  )
}
