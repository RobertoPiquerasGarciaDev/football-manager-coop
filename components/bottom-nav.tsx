"use client"

import type { TabId } from "@/components/dashboard"

interface NavItem {
  id: TabId
  label: string
  icon: (active: boolean) => React.ReactNode
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "squad",
    label: "Squad",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
        <path d="M22 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: "tactics",
    label: "Tactics",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
        <path d="M12 3v14" strokeDasharray="2 2" />
        <circle cx="7" cy="10" r="1.5" fill={active ? "var(--amber)" : "currentColor"} />
        <circle cx="17" cy="10" r="1.5" fill={active ? "var(--amber)" : "currentColor"} />
        <circle cx="12" cy="7" r="1.5" fill={active ? "var(--amber)" : "currentColor"} />
      </svg>
    ),
  },
  {
    id: "market",
    label: "Market",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l3-9 6 18 3-9h4" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.1 : 0} />
        <path d="M2 12h4l3-9 6 18 3-9h4" />
      </svg>
    ),
  },
  {
    id: "league",
    label: "League",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 1.1-.9 2.76-2 3.34M14 14.66V17c0 1.1.9 2.76 2 3.34" />
        <path d="M18 2H6v7a6 6 0 1012 0V2z" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
      </svg>
    ),
  },
  {
    id: "academy",
    label: "Academy",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
        <path d="M9 12l2 2 4-5" />
      </svg>
    ),
  },
  {
    id: "finance",
    label: "Finance",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M4 10h16" />
        <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
        <path d="M12 3l8 5H4l8-5z" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
      </svg>
    ),
  },
  {
    id: "staff",
    label: "Staff",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l8 4v6c0 4-3 7-8 8-5-1-8-4-8-8V7l8-4z" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
        <path d="M9 12h6M12 9v6" />
      </svg>
    ),
  },
  {
    id: "coop",
    label: "Co-op",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="3" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
        <circle cx="16" cy="8" r="3" />
        <path d="M3 21v-2a5 5 0 015-5M21 21v-2a5 5 0 00-5-5" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--amber)" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15.5A3.5 3.5 0 1112 8a3.5 3.5 0 010 7.5z" fill={active ? "var(--amber)" : "none"} fillOpacity={active ? 0.2 : 0} />
        <path d="M19.4 15a1.8 1.8 0 00.36 1.98l.05.05a2 2 0 01-2.83 2.83l-.05-.05A1.8 1.8 0 0015 19.4a1.8 1.8 0 00-1 .6 1.8 1.8 0 00-.4 1.1V21a2 2 0 01-4 0v-.08A1.8 1.8 0 008.6 19.4a1.8 1.8 0 00-1.98.36l-.05.05a2 2 0 01-2.83-2.83l.05-.05A1.8 1.8 0 004.6 15a1.8 1.8 0 00-.6-1 1.8 1.8 0 00-1.1-.4H3a2 2 0 010-4h.08A1.8 1.8 0 004.6 8.6a1.8 1.8 0 00-.36-1.98l-.05-.05a2 2 0 012.83-2.83l.05.05A1.8 1.8 0 009 4.6a1.8 1.8 0 001-.6 1.8 1.8 0 00.4-1.1V3a2 2 0 014 0v.08A1.8 1.8 0 0015.4 4.6a1.8 1.8 0 001.98-.36l.05-.05a2 2 0 012.83 2.83l-.05.05A1.8 1.8 0 0019.4 9c0 .4.22.76.6 1 .32.2.7.32 1.1.32H21a2 2 0 010 4h-.08A1.8 1.8 0 0019.4 15z" />
      </svg>
    ),
  },
]

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border/50" aria-label="Main navigation">
      <div className="max-w-md mx-auto flex items-center gap-1 overflow-x-auto px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex min-w-[64px] flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                isActive ? "text-[var(--amber)]" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-[var(--amber)] shadow-[0_0_12px_var(--amber-glow)]" />
              )}
              {item.icon(isActive)}
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? "text-[var(--amber)]" : ""}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
