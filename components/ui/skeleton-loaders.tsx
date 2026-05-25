"use client"

/**
 * Reusable skeleton loaders for the main app screens (V-3, V-9).
 * Use them as placeholders while async data is being fetched.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-secondary/60 ${className}`} />
}

export function SquadSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 pt-4">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-3">
            <Bar className="h-2 w-12" />
            <Bar className="mt-2 h-6 w-10" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3">
          <Bar className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <Bar className="h-3 w-32" />
            <Bar className="mt-2 h-2 w-20" />
          </div>
          <Bar className="h-2 w-12" />
        </div>
      ))}
    </div>
  )
}

export function MarketSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 px-4 pt-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/40 bg-card p-3">
          <div className="flex items-center gap-2">
            <Bar className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Bar className="h-3 w-28" />
              <Bar className="mt-2 h-2 w-16" />
            </div>
            <Bar className="h-7 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-4 pt-4">
      <div className="rounded-2xl border border-border/40 bg-card p-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-[20px_1fr_30px_30px_30px_40px] items-center gap-2 border-b border-border/30 py-2 last:border-b-0">
            <Bar className="h-3 w-3" />
            <Bar className="h-3 w-24" />
            <Bar className="h-3 w-4" />
            <Bar className="h-3 w-4" />
            <Bar className="h-3 w-4" />
            <Bar className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function FinanceSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 pt-4">
      <div className="rounded-2xl border border-border/40 bg-card p-4">
        <Bar className="h-3 w-24" />
        <Bar className="mt-2 h-10 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-card p-3">
            <Bar className="h-2 w-16" />
            <Bar className="mt-2 h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/40 bg-card p-3">
        <Bar className="h-3 w-32" />
        <Bar className="mt-3 h-2 w-full" />
        <Bar className="mt-2 h-2 w-3/4" />
        <Bar className="mt-2 h-2 w-1/2" />
      </div>
    </div>
  )
}

export function ClubGridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/40 bg-card/60 p-3 animate-pulse">
          <Bar className="h-3 w-20" />
          <Bar className="mt-2 h-2 w-12" />
        </div>
      ))}
    </div>
  )
}
