'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Clock, Dumbbell, Zap, Flame, Trophy } from 'lucide-react'

type PR = {
  exerciseName: string
  type: 'weight'
  value: number
  unit: 'kg'
}

type MuscleWorked = {
  name: string
  sets: number
}

type SummaryData = {
  sessionId: string
  durationMin: number
  totalVolume: number
  totalSets: number
  totalExercises: number
  newPRs: PR[]
  musclesWorked: MuscleWorked[]
  caloriesBurned: number | null
  caloriesEstimated: boolean
  workoutName: string | null
  planContext: string | null
}

interface SessionSummaryModalProps {
  sessionId: string
  onClose: () => void
}

export default function SessionSummaryModal({ sessionId, onClose }: SessionSummaryModalProps) {
  const router = useRouter()
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/athlete/gym/session/${sessionId}/summary`)
      .then(res => {
        if (!res.ok) throw new Error('Error')
        return res.json()
      })
      .then((json: SummaryData) => setData(json))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [sessionId])

  function handleClose() {
    router.replace('/gym')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold text-[#ea580c] uppercase tracking-widest mb-0.5">Sesion completada</p>
            <h2 className="text-lg font-black text-[#1e3a5f] leading-tight">
              {data?.workoutName ?? 'Resumen de sesion'}
            </h2>
            {data?.planContext && (
              <p className="text-xs text-gray-400 mt-0.5">{data.planContext}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No se pudo cargar el resumen</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Clock size={18} className="text-[#ea580c] shrink-0" />
                  <div>
                    <p className="text-xl font-black text-[#1e3a5f]">{data.durationMin}</p>
                    <p className="text-[11px] text-gray-400 leading-none">minutos</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Dumbbell size={18} className="text-[#ea580c] shrink-0" />
                  <div>
                    <p className="text-xl font-black text-[#1e3a5f]">{Math.round(data.totalVolume).toLocaleString('es-CO')}</p>
                    <p className="text-[11px] text-gray-400 leading-none">kg volumen</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Zap size={18} className="text-[#ea580c] shrink-0" />
                  <div>
                    <p className="text-xl font-black text-[#1e3a5f]">{data.totalSets}</p>
                    <p className="text-[11px] text-gray-400 leading-none">{data.totalSets === 1 ? 'serie' : 'series'} · {data.totalExercises} ej.</p>
                  </div>
                </div>
                {data.caloriesBurned != null && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Flame size={18} className="text-[#ea580c] shrink-0" />
                    <div>
                      <p className="text-xl font-black text-[#1e3a5f]">{data.caloriesBurned}</p>
                      <p className="text-[11px] text-gray-400 leading-none">kcal{data.caloriesEstimated ? ' (est.)' : ''}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* PRs */}
              {data.newPRs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Trophy size={15} className="text-[#ea580c]" />
                    <p className="text-sm font-bold text-[#1e3a5f]">Records personales</p>
                  </div>
                  <div className="space-y-2">
                    {data.newPRs.map((pr, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-3.5 py-2.5"
                      >
                        <p className="text-sm font-semibold text-orange-900">{pr.exerciseName}</p>
                        <span className="text-sm font-black text-[#ea580c]">{pr.value} {pr.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Muscles worked */}
              {data.musclesWorked.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-[#1e3a5f] mb-2.5">Musculos trabajados</p>
                  <div className="flex flex-wrap gap-2">
                    {data.musclesWorked.slice(0, 5).map((m) => (
                      <span
                        key={m.name}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-[#1e3a5f]/8 text-[#1e3a5f] px-2.5 py-1 rounded-full"
                      >
                        {m.name}
                        <span className="text-[10px] text-[#1e3a5f]/60">{m.sets}s</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 flex items-center gap-3">
          <Link
            href="/gym/history"
            onClick={handleClose}
            className="flex-1 text-center text-sm font-semibold text-[#1e3a5f] border border-gray-200 rounded-xl py-2.5 hover:bg-gray-50 transition-colors"
          >
            Ver historial
          </Link>
          <button
            onClick={handleClose}
            className="flex-1 text-sm font-semibold text-white rounded-xl py-2.5 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#ea580c' }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
