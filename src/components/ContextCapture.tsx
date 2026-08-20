import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MealMoment,
  HungerLevel,
  EnergyLevel,
  CookingTimeLimit,
  CookingMotivation,
  UserPriority,
} from '../types/domain';
import {
  Clock,
  Zap,
  Flame,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const MOMENT_LABELS: Record<MealMoment, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
};

const HUNGER_LABELS: Record<HungerLevel, { label: string; tag: string }> = {
  poca: { label: 'Poco Hambre', tag: 'Poco' },
  normal: { label: 'Hambre Normal', tag: 'Normal' },
  mucha: { label: 'Mucho Hambre', tag: 'Mucho' },
};

const ENERGY_LABELS: Record<EnergyLevel, { label: string; tag: string }> = {
  baja: { label: 'Baja Energía', tag: 'Baja' },
  normal: { label: 'Energía Normal', tag: 'Normal' },
  alta: { label: 'Alta Energía', tag: 'Alta' },
};

const TIME_LABELS: Record<CookingTimeLimit, string> = {
  '15min': '15 Minutos',
  '30min': '30 Minutos',
  tengo_tiempo: 'Con Tiempo',
};

const MOTIVATION_LABELS: Record<CookingMotivation, string> = {
  minimas: 'Ganas Mínimas',
  normales: 'Ganas Normales',
  tengo_ganas: 'Muchas Ganas',
};

const PRIORITY_OPTIONS: { id: UserPriority; label: string; desc: string }[] = [
  { id: 'automatico', label: 'Automático', desc: 'Balance contextual' },
  { id: 'rapido', label: 'Rápido', desc: 'Menor tiempo posible' },
  { id: 'aprovechar_primero', label: 'Aprovechar primero', desc: 'Priorizar ingredientes pronto' },
  { id: 'usar_lo_que_tengo', label: 'Usar lo que tengo', desc: 'Solo ingredientes en stock' },
  { id: 'algo_rico', label: 'Algo rico', desc: 'Sabor y confort' },
  { id: 'mas_saludable', label: 'Más saludable', desc: 'Vegetales y liviano' },
  { id: 'economico', label: 'Económico', desc: 'Costo accesible' },
];

export const ContextCapture: React.FC = () => {
  const { context, updateContext } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="context-capture-container" className="bg-white border border-[#E5E5E3] rounded-3xl p-5 shadow-xs space-y-4">
      {/* Header & Adjust button */}
      <div className="flex justify-between items-center pb-3 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#A1A1A1]">Tu Contexto</h2>
        </div>
        <button
          id="toggle-context-expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] font-semibold text-[#FF6321] hover:text-[#E05216] underline underline-offset-4 cursor-pointer flex items-center gap-1 transition-colors"
          title="Ajustar detalles de contexto"
        >
          <span>{isExpanded ? 'Menos filtros' : 'Ajustar'}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Momento Switcher Pill Bar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider font-bold text-[#8C8C8C]">Momento:</span>
        <div className="flex gap-1 bg-[#F0F0F0] p-1 rounded-full border border-[#E5E5E3]">
          {(['desayuno', 'almuerzo', 'merienda', 'cena'] as MealMoment[]).map((m) => (
            <button
              key={m}
              id={`moment-btn-${m}`}
              onClick={() => updateContext({ moment: m })}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                context.moment === m
                  ? 'bg-[#1A1A1A] text-white shadow-xs'
                  : 'text-[#666666] hover:text-[#1A1A1A]'
              }`}
            >
              {MOMENT_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Context Pill Groups (Geometric Pill Layout) */}
      <div className="space-y-3">
        {/* Quick Context Summary Chips */}
        <div className="flex flex-wrap gap-2">
          {/* Hambre Chip Active Group */}
          {(['poca', 'normal', 'mucha'] as HungerLevel[]).map((h) => (
            <button
              key={h}
              id={`hunger-btn-${h}`}
              onClick={() => updateContext({ hunger: h })}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer border ${
                context.hunger === h
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                  : 'bg-[#F0F0F0] text-[#444444] border-transparent hover:border-[#D0D0D0]'
              }`}
            >
              {HUNGER_LABELS[h].label}
            </button>
          ))}

          {/* Energia Chip Active Group */}
          {(['baja', 'normal', 'alta'] as EnergyLevel[]).map((e) => (
            <button
              key={e}
              id={`energy-btn-${e}`}
              onClick={() => updateContext({ energy: e })}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer border ${
                context.energy === e
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                  : 'bg-[#F0F0F0] text-[#444444] border-transparent hover:border-[#D0D0D0]'
              }`}
            >
              {ENERGY_LABELS[e].label}
            </button>
          ))}

          {/* Time Limit Group */}
          {(['15min', '30min', 'tengo_tiempo'] as CookingTimeLimit[]).map((t) => (
            <button
              key={t}
              id={`time-btn-${t}`}
              onClick={() => updateContext({ timeLimit: t })}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer border ${
                context.timeLimit === t
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                  : 'bg-[#F0F0F0] text-[#444444] border-transparent hover:border-[#D0D0D0]'
              }`}
            >
              {TIME_LABELS[t]}
            </button>
          ))}

          {/* Active Priority Tag */}
          <div className="px-3.5 py-1.5 bg-[#FF6321] text-white rounded-full text-[12px] font-semibold flex items-center gap-1 shadow-xs">
            <span>Prioridad: {PRIORITY_OPTIONS.find((p) => p.id === context.priority)?.label}</span>
          </div>
        </div>
      </div>

      {/* Progressive Disclosure: Detailed Ganas de Cocinar & Priority Select */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#F0F0F0] space-y-4">
          {/* Ganas de cocinar */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1] mb-2">
              Ganas de cocinar ahora:
            </span>
            <div className="flex flex-wrap gap-2">
              {(['minimas', 'normales', 'tengo_ganas'] as CookingMotivation[]).map((m) => (
                <button
                  key={m}
                  id={`motivation-btn-${m}`}
                  onClick={() => updateContext({ motivation: m })}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    context.motivation === m
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                      : 'bg-[#F9F9F8] text-[#666666] border-[#E5E5E3] hover:border-[#1A1A1A]'
                  }`}
                >
                  {MOTIVATION_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Chips Grid */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1] mb-2">
              Enfoque / Prioridad del ranking:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  id={`priority-chip-${opt.id}`}
                  onClick={() => updateContext({ priority: opt.id })}
                  className={`text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    context.priority === opt.id
                      ? 'bg-[#FF6321] text-white border-[#FF6321] font-bold shadow-xs'
                      : 'bg-[#F9F9F8] text-[#555555] border-[#E5E5E3] hover:border-[#1A1A1A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
