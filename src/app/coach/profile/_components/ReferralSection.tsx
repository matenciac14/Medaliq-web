'use client'

import { useState } from 'react'

type Props = {
  initialCode: string
  initialExpiresAt: string
  initialRedeemedCount: number
  initialPendingCount: number
}

export default function ReferralSection({
  initialCode,
  initialExpiresAt,
  initialRedeemedCount,
  initialPendingCount,
}: Props) {
  const [code, setCode] = useState(initialCode)
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt)
  const [redeemedCount, setRedeemedCount] = useState(initialRedeemedCount)
  const [pendingCount, setPendingCount] = useState(initialPendingCount)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    const res = await fetch('/api/coach/referral', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setCode(data.referral.code)
      setExpiresAt(data.referral.expiresAt)
      setRedeemedCount(data.referral.redeemedCount)
      setPendingCount(data.referral.pendingCount)
    }
    setLoading(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const hasCode = !!code

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Código de referido</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Comparte este código con otros coaches. Ambos reciben 30 días extra de prueba al activarlo.
        </p>
      </div>

      {hasCode ? (
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-lg font-bold tracking-widest text-[#1a2744] bg-gray-100 px-4 py-2 rounded-lg select-all">
            {code}
          </span>
          <button
            onClick={handleCopy}
            className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-4">Sin código activo.</p>
      )}

      <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
        <span>
          <span className="font-semibold text-gray-900">{redeemedCount}</span> canjeados
        </span>
        <span>
          <span className="font-semibold text-gray-900">{pendingCount}</span> pendientes
        </span>
        {hasCode && (
          <span className="text-gray-400">Vence {expiry}</span>
        )}
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="text-sm px-4 py-2 rounded-lg bg-[#f97316] text-white font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Generando...' : hasCode ? 'Generar nuevo código' : 'Generar código'}
      </button>
    </div>
  )
}
