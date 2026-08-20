import React from 'react';
import { Recommendation } from '../types/domain';
import { useApp } from '../context/AppContext';
import { Clock, CheckCircle2, AlertCircle, Sparkles, ChevronRight, ThumbsDown, Check } from 'lucide-react';

interface RecommendationCardProps {
  recommendation: Recommendation;
  isChosen?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  isChosen = false,
}) => {
  const { recipe, matchPercentage, positiveReasons, missingCoreIngredients, priorityIngredientsUsed, rank } =
    recommendation;
  const { selectRecommendation, openDetailModal, openRejectionModal } = useApp();

  const isMissingIngredients = missingCoreIngredients.length > 0;
  const isTopMatch = rank === 1 || matchPercentage >= 85;

  return (
    <article
      id={`recommendation-card-${recipe.id}`}
      className={`group relative bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
        isChosen
          ? 'border-[#1A1A1A] ring-2 ring-[#1A1A1A]/15 bg-[#FAF9F6]'
          : 'border-[#E5E5E3] hover:border-[#1A1A1A]'
      }`}
    >
      {/* Top Banner: Rank & Match Score */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center justify-center text-[11px] font-black italic px-2.5 py-0.5 rounded-md ${
              isTopMatch
                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                : 'bg-[#F0F0F0] text-[#666666]'
            }`}
          >
            {matchPercentage}% MATCH
          </span>

          <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider bg-[#F0F0F0] px-2.5 py-0.5 rounded-full">
            #{rank} {rank === 1 ? 'Mejor opción' : 'Opción'}
          </span>

          {priorityIngredientsUsed.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FF6321] bg-[#FFF1EB] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              <Sparkles className="w-2.5 h-2.5" />
              Aprovecha {priorityIngredientsUsed[0]}
            </span>
          )}
        </div>

        {/* Dismiss / Reject */}
        <button
          id={`reject-btn-${recipe.id}`}
          onClick={() => openRejectionModal(recommendation)}
          className="text-[#A1A1A1] hover:text-[#1A1A1A] hover:bg-[#F0F0F0] p-1.5 rounded-full transition-colors cursor-pointer"
          title="No me sirve esta opción"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="px-5 py-2 flex flex-col sm:flex-row gap-4">
        {/* Photo thumbnail */}
        {recipe.photoUrl && (
          <div
            onClick={() => openDetailModal(recommendation)}
            className="relative w-full sm:w-28 h-32 sm:h-24 rounded-2xl overflow-hidden bg-[#F0F0F0] shrink-0 border border-[#E5E5E3] cursor-pointer"
          >
            <img
              src={recipe.photoUrl}
              alt={recipe.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute bottom-1.5 right-1.5 bg-[#1A1A1A]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {recipe.prepTimeMinutes} min
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3
            onClick={() => openDetailModal(recommendation)}
            className="text-base sm:text-lg font-bold text-[#1A1A1A] leading-snug cursor-pointer group-hover:text-black transition-colors"
          >
            {recipe.name}
          </h3>

          <p className="text-xs text-[#666666] mt-1 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>

          {/* Quick specs pill */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px] text-[#666666]">
            <span className="inline-flex items-center gap-1 font-medium text-[#1A1A1A]">
              <Clock className="w-3.5 h-3.5 text-[#8C8C8C]" />
              {recipe.prepTimeMinutes} min
            </span>

            <span className="text-[#D0D0D0]">•</span>

            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isMissingIngredients ? 'text-[#D9381E]' : 'text-[#2E7D32]'
              }`}
            >
              {isMissingIngredients ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-[#D9381E]" />
                  Falta comprar: {missingCoreIngredients.join(', ')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                  Ingredientes disponibles
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* "Por qué hoy" Explainability Section */}
      <div className="mx-5 my-3 p-3 rounded-2xl bg-[#F9F9F8] border-l-2 border-[#FF6321]">
        <span className="text-[10px] font-bold text-[#8C8C8C] uppercase tracking-wider block mb-1">
          Por qué encaja hoy:
        </span>
        <ul className="text-xs text-[#444444] space-y-1">
          {positiveReasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-1.5 leading-tight">
              <span className="text-[#FF6321] font-bold shrink-0 mt-0.5">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 bg-[#FAF9F6]/50 border-t border-[#F0F0F0]">
        <button
          id={`detail-btn-${recipe.id}`}
          onClick={() => openDetailModal(recommendation)}
          className="text-xs font-semibold text-[#1A1A1A] hover:bg-[#F0F0F0] px-3.5 py-2 rounded-full border border-[#E5E5E3] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Ver preparación</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          id={`choose-btn-${recipe.id}`}
          onClick={() => selectRecommendation(recommendation)}
          className={`text-xs font-bold px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
            isChosen
              ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
              : 'bg-[#1A1A1A] hover:bg-black text-white'
          }`}
        >
          {isChosen ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Elegida para hoy</span>
            </>
          ) : (
            <span>Voy con esta</span>
          )}
        </button>
      </div>
    </article>
  );
};
