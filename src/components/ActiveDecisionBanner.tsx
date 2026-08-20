import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, Utensils, ArrowRight, X } from 'lucide-react';

export const ActiveDecisionBanner: React.FC = () => {
  const { activeChosenRecommendation, logRealMeal, openLogMealModal, clearChosenRecommendation } = useApp();

  if (!activeChosenRecommendation) return null;

  const { recipe } = activeChosenRecommendation;

  return (
    <div
      id="active-decision-banner"
      className="bg-[#1A1A1A] text-white rounded-3xl p-5 shadow-md border border-[#333333] transition-all animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#2E2E2E] flex items-center justify-center shrink-0 mt-0.5 border border-[#444444]">
            <Utensils className="w-4 h-4 text-[#FF6321]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1A1] font-bold uppercase tracking-wider">
              <span className="inline-block w-2 h-2 rounded-full bg-[#FF6321] animate-pulse" />
              Elección en curso
            </div>
            <h4 className="text-base font-bold text-white mt-0.5">
              {recipe.name}
            </h4>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              {recipe.prepTimeMinutes} min · ¿Terminaste o cambiaste de plan?
            </p>
          </div>
        </div>

        <button
          onClick={clearChosenRecommendation}
          className="text-[#8C8C8C] hover:text-white p-1.5 rounded-full hover:bg-[#333333] transition-colors cursor-pointer"
          title="Cancelar selección activa"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-[#2E2E2E]">
        <button
          id="btn-confirm-ate-this"
          onClick={() =>
            logRealMeal({
              mealMoment: activeChosenRecommendation.recipe.mealMoments[0] || 'almuerzo',
              selectedRecipeId: recipe.id,
              recipeName: recipe.name,
              wasSuggested: true,
            })
          }
          className="flex-1 sm:flex-none text-xs font-bold bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#2E7D32] px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Comí esto</span>
        </button>

        <button
          id="btn-ate-something-else"
          onClick={() => openLogMealModal({ recipe, suggested: false })}
          className="flex-1 sm:flex-none text-xs font-semibold bg-[#2E2E2E] hover:bg-[#3E3E3E] text-white px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-[#444444]"
        >
          <span>Al final comí otra cosa</span>
          <ArrowRight className="w-3 h-3 text-[#FF6321]" />
        </button>
      </div>
    </div>
  );
};
