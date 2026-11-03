'use client'

import { useEffect, useState } from 'react'

type Proposal = {
  id: string
  name: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote: string | null
  createdAt: string
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  APPROVED: { label: 'Aprobado',  bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  REJECTED: { label: 'Rechazado', bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200' },
} as const

export default function MyFoodProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/athlete/nutrition/foods/my-proposals')
      .then(r => r.ok ? r.json() : { proposals: [] })
      .then(d => setProposals(d.proposals ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading || proposals.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Mis propuestas de alimentos</h3>
      <div className="space-y-2">
        {proposals.map(p => {
          const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.PENDING
          return (
            <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${cfg.border} ${cfg.bg}`}>
              <div>
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                {p.reviewNote && <p className="text-xs text-gray-500 mt-0.5">{p.reviewNote}</p>}
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.text} ${cfg.bg}`}>
                {cfg.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
