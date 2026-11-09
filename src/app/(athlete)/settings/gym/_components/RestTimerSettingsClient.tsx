'use client'

import { useState } from 'react'

type Defaults = {
  autoStart: boolean
  soundEnabled: boolean
  vibrationEnabled: boolean
  defaultCompoundSeconds: number
  defaultIsolationSeconds: number
}

type Props = {
  defaults: Defaults
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-orange-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function SecondsStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (val: number) => void
}) {
  const step = 5
  const min = 15
  const max = 600

  function decrement() {
    onChange(Math.max(min, value - step))
  }
  function increment() {
    onChange(Math.min(max, value + step))
  }
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    if (isNaN(raw)) return
    const clamped = Math.min(max, Math.max(min, raw))
    // round to nearest step
    const rounded = Math.round(clamped / step) * step
    onChange(rounded)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={handleInput}
        min={min}
        max={max}
        step={step}
        className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <span className="text-xs text-gray-500">seg</span>
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

export default function RestTimerSettingsClient({ defaults }: Props) {
  const [form, setForm] = useState<Defaults>({ ...defaults })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/athlete/gym/rest-defaults', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast((data as { error?: string }).error ?? 'Error al guardar.', 'error')
        return
      }
      showToast('Configuracion guardada.', 'success')
    } catch {
      showToast('Error de red. Intenta de nuevo.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold" style={{ color: '#1e3a5f' }}>
        Configuracion del Timer
      </h1>

      {/* Toggles */}
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Auto-inicio</p>
              <p className="text-xs text-gray-500">El timer arranca automaticamente al terminar una serie</p>
            </div>
            <Toggle
              enabled={form.autoStart}
              onChange={(val) => setForm((f) => ({ ...f, autoStart: val }))}
            />
          </div>

          <div className="border-t border-gray-50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Sonido</p>
              <p className="text-xs text-gray-500">Alerta sonora al terminar el descanso</p>
            </div>
            <Toggle
              enabled={form.soundEnabled}
              onChange={(val) => setForm((f) => ({ ...f, soundEnabled: val }))}
            />
          </div>

          <div className="border-t border-gray-50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Vibracion</p>
              <p className="text-xs text-gray-500">Vibracion al terminar el descanso</p>
            </div>
            <Toggle
              enabled={form.vibrationEnabled}
              onChange={(val) => setForm((f) => ({ ...f, vibrationEnabled: val }))}
            />
          </div>
        </div>
      </div>

      {/* Seconds */}
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Descanso compuestos</p>
              <p className="text-xs text-gray-500">Sentadilla, press, deadlift, etc.</p>
            </div>
            <SecondsStepper
              value={form.defaultCompoundSeconds}
              onChange={(val) => setForm((f) => ({ ...f, defaultCompoundSeconds: val }))}
            />
          </div>

          <div className="border-t border-gray-50" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Descanso aislamiento</p>
              <p className="text-xs text-gray-500">Curl, extension, etc.</p>
            </div>
            <SecondsStepper
              value={form.defaultIsolationSeconds}
              onChange={(val) => setForm((f) => ({ ...f, defaultIsolationSeconds: val }))}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-2xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: '#ea580c' }}
      >
        {saving ? 'Guardando...' : 'Guardar configuracion'}
      </button>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
