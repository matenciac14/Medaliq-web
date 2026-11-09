import type { EnergyBalanceResult } from '@/domain/dashboard/energy_balance.use_case'

type Props = {
  data: EnergyBalanceResult
}

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string
  current: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-0.5">
        <span className="text-[10px] font-semibold text-gray-500">{label}</span>
        <span className="text-[10px] text-gray-400">
          {Math.round(current)}
          <span className="text-gray-300">/{Math.round(target)}g</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function EnergyBalanceCard({ data }: Props) {
  const { tdeeBase, exerciseCalories, totalBudget, consumed, balance, macros } = data
  const isPositive = balance >= 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
      {/* Title */}
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
        🔥 Balance Energetico
      </p>

      {/* Top numbers: Budget | Consumido | Balance */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Presupuesto</p>
          <span className="text-base font-black text-[#1e3a5f] leading-none">
            {totalBudget.toLocaleString('es')}
          </span>
          {exerciseCalories > 0 && (
            <p className="text-[9px] text-gray-400 mt-0.5">
              {tdeeBase.toLocaleString('es')} + {exerciseCalories.toLocaleString('es')} ej.
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Consumido</p>
          <span className="text-base font-black text-[#1e3a5f] leading-none">
            {consumed.toLocaleString('es')}
          </span>
          <p className="text-[9px] text-gray-400 mt-0.5">kcal hoy</p>
        </div>

        <div>
          <p className="text-[10px] text-gray-400 mb-0.5">Balance</p>
          <span
            className={`text-base font-black leading-none ${
              isPositive ? 'text-green-600' : 'text-[#ea580c]'
            }`}
          >
            {isPositive ? '+' : ''}{balance.toLocaleString('es')}
          </span>
          <p className="text-[9px] text-gray-400 mt-0.5">kcal</p>
        </div>
      </div>

      {/* Macro bars */}
      {(macros.protein.target > 0 || macros.carbs.target > 0 || macros.fat.target > 0) && (
        <div className="flex gap-3">
          <MacroBar
            label="Proteina"
            current={macros.protein.current}
            target={macros.protein.target}
            color="bg-blue-500"
          />
          <MacroBar
            label="Carbs"
            current={macros.carbs.current}
            target={macros.carbs.target}
            color="bg-amber-400"
          />
          <MacroBar
            label="Grasa"
            current={macros.fat.current}
            target={macros.fat.target}
            color="bg-purple-400"
          />
        </div>
      )}
    </div>
  )
}
