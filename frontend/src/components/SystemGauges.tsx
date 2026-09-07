import { useState, useCallback } from 'react'
import { api } from '../api'
import { useInterval } from '../hooks/useInterval'
import type { SystemStats } from '../types'

interface GaugeProps {
  label: string
  pct: number | null
  color?: string
  sublabel?: string
}

function Gauge({ label, pct, color = 'bg-blue-500', sublabel }: GaugeProps) {
  const display = pct !== null ? `${pct.toFixed(0)}%` : 'N/A'
  const safePct = Math.min(100, Math.max(0, pct ?? 0))
  const barColor =
    (pct ?? 0) > 85 ? 'bg-red-500' :
    (pct ?? 0) > 65 ? 'bg-yellow-500' :
    color

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 whitespace-nowrap">{label}</span>
        <span className="text-xs font-mono text-zinc-300 ml-2">{display}</span>
      </div>
      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${safePct}%` }}
        />
      </div>
      {sublabel && (
        <span className="text-xs text-zinc-700">{sublabel}</span>
      )}
    </div>
  )
}

export function SystemGauges() {
  const [stats, setStats] = useState<SystemStats | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const s = await api.getSystemStats()
      setStats(s)
    } catch {
      // Silently ignore — system stats are non-critical
    }
  }, [])

  useInterval(fetchStats, 3000)

  if (!stats) return null

  return (
    <div className="flex flex-col gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/30 min-w-[150px]">
      <Gauge label="CPU" pct={stats.cpu_pct} color="bg-blue-500" />
      <Gauge
        label="RAM"
        pct={stats.ram_pct}
        color="bg-purple-500"
        sublabel={`${stats.ram_used_gb.toFixed(1)} / ${stats.ram_total_gb.toFixed(1)} GB`}
      />
      {stats.gpu && (
        <>
          <Gauge label={`GPU ${stats.gpu.vendor}`} pct={stats.gpu.util_pct} color="bg-orange-500" />
          <Gauge label="VRAM" pct={stats.gpu.mem_used_pct} color="bg-red-400" />
        </>
      )}
    </div>
  )
}
