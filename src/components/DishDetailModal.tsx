import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Check,
  ChefHat,
  Scale,
  Calendar,
} from 'lucide-react';

export const DishDetailModal: React.FC = () => {
  const {
    detailRecommendation,
    closeDetailModal,
    selectRecommendation,
    openPlanMealModal,
    activeChosenRecommendation,
    inventory,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'receta' | 'match'>('receta');

  if (!detailRecommendation) return null;

  const { recipe, matchPercentage, factors, positiveReasons, penalties } = detailRecommendation;
  const isChosen = activeChosenRecommendation?.recipe.id === recipe.id;

  const inventoryMap = new Map<string, (typeof inventory)[0]>(inventory.map((i) => [i.id, i]));

  return (
    <div
      id="dish-detail-modal-overlay"
      className="fixed inset-0 z-50 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDetailModal();
      }}
    >
      <div
        id="dish-detail-modal-content"
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E5E5E3] flex flex-col max-h-[90vh]"
      >
        {/* Header with Photo or Banner */}
        <div className="relative">
          {recipe.photoUrl ? (
            <div className="h-44 sm:h-52 w-full overflow-hidden relative bg-[#1A1A1A]">
              <img
                src={recipe.photoUrl}
                alt={recipe.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/90 via-[#1A1A1A]/30 to-transparent" />
            </div>
          ) : (
            <div className="h-28 bg-[#F0F0F0] p-4" />
          )}

          {/* Close button */}
          <button
            id="close-dish-detail-btn"
            onClick={closeDetailModal}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#1A1A1A]/80 text-white flex items-center justify-center hover:bg-[#1A1A1A] transition-colors z-10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Title on Photo overlay or top */}
          <div className="absolute bottom-3 left-5 right-5 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-black italic bg-[#E8F5E9] text-[#2E7D32] px-2.5 py-0.5 rounded-md">
                {matchPercentage}% MATCH
              </span>
              <span className="text-xs text-white/90 font-semibold bg-black/50 px-2.5 py-0.5 rounded-full">
                {recipe.prepTimeMinutes} min
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold leading-tight text-white">{recipe.name}</h2>
          </div>
        </div>

        {/* Tab switcher: Receta / Por qué este match */}
        <div className="flex border-b border-[#E5E5E3] px-5 pt-2 bg-[#F9F9F8]">
          <button
            id="tab-recipe-btn"
            onClick={() => setActiveTab('receta')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'receta'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#8C8C8C] hover:text-[#1A1A1A]'
            }`}
          >
            Preparación e Ingredientes
          </button>
          <button
            id="tab-match-btn"
            onClick={() => setActiveTab('match')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'match'
                ? 'border-[#FF6321] text-[#FF6321]'
                : 'border-transparent text-[#8C8C8C] hover:text-[#1A1A1A]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Por qué encaja hoy
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'receta' ? (
            <>
              {/* Short description */}
              <p className="text-xs text-[#555555] leading-relaxed">{recipe.description}</p>

              {/* Quick specs */}
              <div className="grid grid-cols-3 gap-2 bg-[#F9F9F8] p-3 rounded-2xl border border-[#E5E5E3] text-center">
                <div>
                  <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block">Tiempo</span>
                  <span className="text-xs font-bold text-[#1A1A1A]">{recipe.prepTimeMinutes} min</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block">Complejidad</span>
                  <span className="text-xs font-bold text-[#1A1A1A] capitalize">
                    {recipe.complexity.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block">Saciedad</span>
                  <span className="text-xs font-bold text-[#1A1A1A] capitalize">{recipe.satiety}</span>
                </div>
              </div>

              {/* Ingredients with Inventory Availability Status */}
              <div>
                <h4 className="text-[11px] font-bold text-[#A1A1A1] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ChefHat className="w-3.5 h-3.5 text-[#8C8C8C]" />
                  Ingredientes ({recipe.ingredients.length})
                </h4>

                <div className="space-y-1.5">
                  {recipe.ingredients.map((ing, i) => {
                    const invItem = ing.inventoryItemId ? inventoryMap.get(ing.inventoryItemId) : null;
                    const status = invItem ? invItem.status : 'tengo';
                    const isAvail = status === 'tengo' || status === 'available';
                    const isLow = status === 'queda_poco' || status === 'low';
                    const isUnknown = status === 'desconocido' || status === 'unknown';
                    const isPriority =
                      invItem?.priority === 'prioritario' ||
                      invItem?.priority === 'priority' ||
                      invItem?.priority === 'consumir_pronto' ||
                      invItem?.priority === 'consume_soon';

                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#F9F9F8] border border-[#E5E5E3] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {isAvail ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
                          ) : isLow ? (
                            <AlertCircle className="w-3.5 h-3.5 text-[#B78103] shrink-0" />
                          ) : isUnknown ? (
                            <Info className="w-3.5 h-3.5 text-[#8C8C8C] shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-[#D9381E] shrink-0" />
                          )}
                          <span className="font-semibold text-[#1A1A1A]">{ing.name}</span>
                          {ing.optional && (
                            <span className="text-[10px] text-[#8C8C8C] bg-[#E5E5E3] px-1.5 py-0.2 rounded-full">
                              opcional
                            </span>
                          )}
                          {isPriority && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FF6321] bg-[#FFF1EB] px-1.5 py-0.5 rounded-full">
                              <Sparkles className="w-2.5 h-2.5" />
                              Aprovechar
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {ing.quantityDemo && (
                            <span className="text-[11px] text-[#666666]">{ing.quantityDemo}</span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isAvail
                                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                : isLow
                                ? 'bg-[#FFF8E1] text-[#B78103]'
                                : isUnknown
                                ? 'bg-[#F5F5F5] text-[#666666]'
                                : 'bg-[#FDF2F0] text-[#D9381E]'
                            }`}
                          >
                            {isAvail ? 'Tengo' : isLow ? 'Queda poco' : isUnknown ? 'Sin confirmar' : 'Falta'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div>
                <h4 className="text-[11px] font-bold text-[#A1A1A1] uppercase tracking-wider mb-2">
                  Preparación paso a paso
                </h4>
                <ol className="space-y-2">
                  {recipe.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2.5 text-xs text-[#444444]">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1A1A1A] text-white font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Synthetic Nutrition note */}
              <div className="p-3 bg-[#F9F9F8] rounded-2xl border border-[#E5E5E3] text-[11px] text-[#666666] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#FF6321] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#1A1A1A]">Nota sobre datos nutricionales: </span>
                  {recipe.syntheticMeta.nutritionNote}
                </div>
              </div>
            </>
          ) : (
            /* Match & Factors Breakdown (Transparent Scoring) */
            <div className="space-y-4">
              <div className="p-4 bg-[#E8F5E9] rounded-2xl border border-[#C8E6C9]">
                <h4 className="text-[11px] font-bold text-[#2E7D32] uppercase tracking-wider mb-2">
                  Factores positivos principales
                </h4>
                <ul className="space-y-1.5 text-xs text-[#1B5E20]">
                  {positiveReasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[#2E7D32] font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {penalties.length > 0 && (
                <div className="p-4 bg-[#FFF8E1] rounded-2xl border border-[#FFE082]">
                  <h4 className="text-[11px] font-bold text-[#B78103] uppercase tracking-wider mb-2">
                    Aspectos a tener en cuenta
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#7A5500]">
                    {penalties.map((pen, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#B78103] font-bold">•</span>
                        <span>{pen}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Factor Score Bars */}
              <div className="space-y-2.5 pt-2">
                <h4 className="text-[11px] font-bold text-[#A1A1A1] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#8C8C8C]" />
                  Desglose de adecuación contextual
                </h4>

                <FactorBar label="Ajuste al momento" value={factors.momentFit} />
                <FactorBar label="Ajuste al tiempo disponible" value={factors.timeFit} />
                <FactorBar label="Ajuste a energía y esfuerzo" value={factors.effortFit} />
                <FactorBar label="Ajuste al nivel de hambre" value={factors.hungerFit} />
                <FactorBar label="Disponibilidad de ingredientes" value={factors.inventoryFit} />
                <FactorBar label="Aprovechamiento de prioritarios" value={factors.utilizationFit} />
                <FactorBar label="Variedad respecto a comida reciente" value={factors.recentVarietyFit} />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F9F9F8] border-t border-[#E5E5E3] flex items-center justify-between gap-2">
          <button
            id="modal-plan-btn"
            onClick={() => {
              openPlanMealModal(recipe);
              closeDetailModal();
            }}
            className="text-xs font-semibold text-[#1A1A1A] hover:bg-[#E5E5E3]/60 px-4 py-2.5 rounded-full border border-[#E5E5E3] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#FF6321]" />
            <span>Planificar para después</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="modal-close-action-btn"
              onClick={closeDetailModal}
              className="text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] px-4 py-2 rounded-full hover:bg-[#E5E5E3]/60 transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            <button
              id="modal-choose-btn"
              onClick={() => {
                selectRecommendation(detailRecommendation);
                closeDetailModal();
              }}
              className="text-xs font-bold bg-[#1A1A1A] hover:bg-black text-white px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isChosen ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Elegida como plato de hoy</span>
                </>
              ) : (
                <span>Voy con esta opción</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FactorBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const percentage = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-[#666666]">
        <span>{label}</span>
        <span className="font-bold text-[#1A1A1A]">{percentage}%</span>
      </div>
      <div className="w-full bg-[#E5E5E3] rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            percentage >= 80 ? 'bg-[#2E7D32]' : percentage >= 50 ? 'bg-[#FF6321]' : 'bg-[#8C8C8C]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
