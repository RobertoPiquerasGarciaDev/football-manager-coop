"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Moon, Palette, Shield, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

type ClubAssets = {
  badgeDataUrl: string | null
  homeKitName: string | null
  awayKitName: string | null
  primary: string
  secondary: string
  soundEnabled: boolean
}

const ASSET_KEY = "pitch-perfect-club-assets"
const defaultAssets: ClubAssets = {
  badgeDataUrl: null,
  homeKitName: null,
  awayKitName: null,
  primary: "#F2B42D",
  secondary: "#111827",
  soundEnabled: true,
}

export function SettingsSection() {
  const [assets, setAssets] = useState<ClubAssets>(defaultAssets)
  const [licensePreview, setLicensePreview] = useState<string[]>([])
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const badgeRef = useRef<HTMLInputElement>(null)
  const kitRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    const stored = window.localStorage.getItem(ASSET_KEY)
    if (stored) setAssets({ ...defaultAssets, ...JSON.parse(stored) as Partial<ClubAssets> })
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark")
  }, [])

  function persist(next: ClubAssets) {
    setAssets(next)
    window.localStorage.setItem(ASSET_KEY, JSON.stringify(next))
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    document.documentElement.classList.toggle("light", next === "light")
    document.documentElement.classList.toggle("dark", next === "dark")
    setTheme(next)
  }

  function handleBadge(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      persist({ ...assets, badgeDataUrl: String(reader.result) })
      toast({ title: "Badge imported", description: "Stored locally on this device." })
    }
    reader.readAsDataURL(file)
  }

  function handleKits(files: FileList | null) {
    if (!files?.length) return
    persist({ ...assets, homeKitName: files[0]?.name ?? null, awayKitName: files[1]?.name ?? assets.awayKitName })
  }

  function downloadStructure() {
    const blob = new Blob(["clubs/\n  badges/\n  kits/home/\n  kits/away/\nplayers/\n  portraits/\nREADME.md\n"], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "pitch-perfect-license-pack-structure.txt"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-foreground">Mi Club</h2>
            <p className="text-[11px] text-muted-foreground">Assets are stored in localStorage, never on the server.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={toggleTheme}>
            <Moon className="h-4 w-4" />
            {theme}
          </Button>
        </div>
        <div
          className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-secondary/30 p-4 text-center"
          onClick={() => badgeRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            handleBadge(event.dataTransfer.files[0])
          }}
        >
          {assets.badgeDataUrl ? <img src={assets.badgeDataUrl} alt="Club badge preview" className="h-16 w-16 rounded-xl object-contain" /> : <Upload className="h-8 w-8 text-[var(--amber)]" />}
          <p className="mt-2 text-xs font-bold text-foreground">Drag & drop badge PNG/SVG</p>
        </div>
        <input ref={badgeRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={(event) => handleBadge(event.target.files?.[0])} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            Primary
            <Input type="color" value={assets.primary} onChange={(event) => persist({ ...assets, primary: event.target.value })} className="mt-2 h-10" />
          </label>
          <label className="rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
            Secondary
            <Input type="color" value={assets.secondary} onChange={(event) => persist({ ...assets, secondary: event.target.value })} className="mt-2 h-10" />
          </label>
        </div>
        <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => kitRef.current?.click()}>
          Upload home/away kits
        </Button>
        <input ref={kitRef} type="file" accept="image/png,image/svg+xml" multiple className="hidden" onChange={(event) => handleKits(event.target.files)} />
        <p className="mt-2 text-[11px] text-muted-foreground">Home: {assets.homeKitName ?? "not uploaded"} · Away: {assets.awayKitName ?? "not uploaded"}</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--stats-blue)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pack de Licencias</h3>
        </div>
        <div
          className="rounded-2xl border border-dashed border-border/80 bg-secondary/30 p-4 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            setLicensePreview(Array.from(event.dataTransfer.files).slice(0, 8).map((file) => file.webkitRelativePath || file.name))
            toast({ title: "License pack preview loaded", description: "Assets stay local until you confirm imports." })
          }}
        >
          <Palette className="mx-auto h-8 w-8 text-[var(--amber)]" />
          <p className="mt-2 text-xs font-bold text-foreground">Drop a full folder here</p>
          <p className="text-[11px] text-muted-foreground">Expected: clubs/badges, clubs/kits, players/portraits</p>
        </div>
        {licensePreview.length > 0 && (
          <div className="mt-3 rounded-xl bg-secondary/40 p-3">
            {licensePreview.map((item) => <p key={item} className="text-[11px] text-muted-foreground">{item}</p>)}
          </div>
        )}
        <Button type="button" variant="secondary" className="mt-3 w-full" onClick={downloadStructure}>
          <Download className="h-4 w-4" />
          Descargar estructura vacia
        </Button>
      </div>

      <Button type="button" variant="secondary" onClick={() => persist({ ...assets, soundEnabled: !assets.soundEnabled })}>
        Sounds: {assets.soundEnabled ? "enabled" : "disabled"}
      </Button>
    </div>
  )
}
