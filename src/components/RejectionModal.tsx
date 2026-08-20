import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RejectionFeedback } from '../types/domain';
import { X, ThumbsDown, Clock, Frown, ShoppingBag, Sparkles } from 'lucide-react';

const REJECTION_REASONS: {
  id: RejectionFeedback['reason'];
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'mucho_tiempo',
    label: 'Demasiado tiempo',
    desc: 'Necesito algo más rápido para hoy',
    icon: Clock,
  },
  {
    id: 'no_tengo_ganas',
    label: 'No tengo ganas de cocinar esto',
    desc: 'Busco algo con menos esfuerzo',
    icon: Frown,
  },
  {
    id: 'falta_ingrediente',
    label: 'Me falta un ingrediente clave',
    desc: 'No tengo todo lo necesario',
    icon: ShoppingBag,
  },
  {
    id: 'no_me_apetece',
    label: 'No se me antoja ahora',
    desc: 'Prefiero otro tipo de sabor o textura',
    icon: Sparkles,
  },
  {
    id: 'otro',
    label: 'Otro motivo',
    desc: 'Simplemente no encaja en este momento',
    icon: ThumbsDown,
  },
];

export const RejectionModal: React.FC = () => {
  const { rejectionTargetRecommendation, closeRejectionModal, confirmRejection } = useApp();
  const [selectedReason, setSelectedReason] = useState<RejectionFeedback['reason']>('no_me_apetece');
  const [notes, setNotes] = useState('');

  if (!rejectionTargetRecommendation) return null;

  const { recipe } = rejectionTargetRecommendation;

  const handleConfirm = (reasonToUse?: RejectionFeedback['reason']) => {
    confirmRejection({
      recommendationId: rejectionTargetRecommendation.id,
      recipeId: recipe.id,
      reason: reasonToUse || selectedReason,
      notes: notes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <div
      id="rejection-modal-overlay"
      className="fixed inset-0 z-50 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeRejectionModal();
      }}
    >
      <div
        id="rejection-modal-content"
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E5E5E3] p-6"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider">
              Ajustar propuestas
            </span>
            <h3 className="text-base font-bold text-[#1A1A1A] mt-0.5">
              ¿Por qué no te sirve "{recipe.name}"?
            </h3>
            <p className="text-xs text-[#666666] mt-1">
              Tu respuesta nos ayuda a calibrar las opciones sin juzgar.
            </p>
          </div>
          <button
            onClick={closeRejectionModal}
            className="text-[#8C8C8C] hover:text-[#1A1A1A] p-1.5 rounded-full hover:bg-[#F0F0F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Reason Options */}
        <div className="space-y-2 my-4">
          {REJECTION_REASONS.map((r) => {
            const Icon = r.icon;
            const isSelected = selectedReason === r.id;
            return (
              <button
                key={r.id}
                id={`rejection-reason-${r.id}`}
                onClick={() => setSelectedReason(r.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-[#1A1A1A] bg-[#FAF9F6] text-[#1A1A1A] font-semibold ring-1 ring-[#1A1A1A]/10'
                    : 'border-[#E5E5E3] hover:border-[#1A1A1A] text-[#444444] bg-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#1A1A1A] text-white' : 'bg-[#F0F0F0] text-[#666666]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#1A1A1A]">{r.label}</div>
                  <div className="text-[11px] text-[#666666]">{r.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Optional note */}
        {selectedReason === 'otro' && (
          <div className="mb-4">
            <input
              type="text"
              id="rejection-note-input"
              placeholder="Detalle opcional..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5E5E3] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] bg-[#F9F9F8]"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F0F0F0]">
          <button
            id="rejection-skip-btn"
            onClick={() => handleConfirm('otro')}
            className="text-xs font-medium text-[#666666] hover:text-[#1A1A1A] px-3 py-2 rounded-full cursor-pointer"
          >
            Descartar sin especificar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={closeRejectionModal}
              className="text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] px-3.5 py-2 rounded-full hover:bg-[#F0F0F0] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="rejection-confirm-btn"
              onClick={() => handleConfirm()}
              className="text-xs font-bold bg-[#1A1A1A] hover:bg-black text-white px-4 py-2.5 rounded-full shadow-xs transition-colors cursor-pointer"
            >
              Descartar y ver otra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
