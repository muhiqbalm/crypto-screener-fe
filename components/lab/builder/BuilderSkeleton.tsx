import { Skeleton } from '@/components/ui/skeleton'

export function BuilderSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]" aria-busy="true" aria-label="Memuat builder">
      <div className="space-y-3 rounded-xl border border-border p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-3 rounded-xl border border-border p-5">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
