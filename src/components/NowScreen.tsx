import React from 'react';
import { useApp } from '../context/AppContext';
import { ContextCapture } from './ContextCapture';
import { ActiveDecisionBanner } from './ActiveDecisionBanner';
import { RecommendationCard } from './RecommendationCard';
import { RotateCcw, PlusCircle, AlertCircle, Sparkles, X, Calendar, Utensils, ArrowRight } from 'lucide-react';

export const NowScreen: React.FC = () => {
  const {
    recommendations,
    activeChosenRecommendation,
    rejectedRecipeIds,
    clearRejectedList,
    openLogMealModal,
    context,
    utilizationFilterIngredient,
    setUtilizationFilterIngredient,
    plannedMeals,
    recipes,
    setTab,
  } = useApp();

  const todayPlannedMeal = plannedMeals.find(
    (m) => m.day === 'hoy' && m.status === 'planned' && (m.mealMoment === context.moment || true)
  );
  const todayPlannedRecipe = todayPlannedMeal?.recipeId
    ? recipes.find((r) => r.id === todayPlannedMeal.recipeId)
    : undefined;

  return (
    <div id="now-screen" className="space-y-6 pb-12 animate-fadeIn">
      {/* Friendly, Calm Editorial Header */}
      <div className="flex items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[12px] uppercase tracking-[0.15em] font-bold text-[#8C8C8C] mb-1">
            {context.moment.toUpperCase()}
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#1A1A1A] tracking-tight leading-none">
            ¿Qué comemos?
          </h1>
          <p className="text-xs sm:text-[13px] text-[#666666] mt-1.5 leading-relaxed">
            Propuestas personalizadas según tu tiempo, energía e ingredientes.
          </p>
        </div>

        <button
          id="btn-quick-log-meal"
          onClick={() => openLogMealModal()}
          className="text-xs font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white bg-white border border-[#E5E5E3] px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
          title="Registrar comida directamente"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#FF6321]" />
          <span className="hidden sm:inline">Ya comí / </span>Registrar
        </button>
      </div>

      {/* Planned Meal Notice for Today (if any planned meal exists) */}
      {todayPlannedMeal && (
        <div
          id="today-planned-notice"
          className="bg-white border border-[#E5E5E3] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FFF2EB] text-[#FF6321] flex items-center justify-center font-bold shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6321] bg-[#FFF2EB] px-2 py-0.5 rounded-md">
                  Planificado para {todayPlannedMeal.mealMoment}
                </span>
                <span className="text-xs text-[#8C8C8C]">({todayPlannedMeal.servings} porciones)</span>
              </div>
              <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">{todayPlannedMeal.recipeName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() =>
                openLogMealModal({
                  recipe: todayPlannedRecipe,
                  suggested: true,
                  plannedMealId: todayPlannedMeal.id,
                })
              }
              className="px-3 py-1.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-black transition-all flex items-center gap-1 shadow-2xs"
            >
              <Utensils className="w-3 h-3 text-[#FF6321]" />
              <span>Cocinar esto</span>
            </button>
            <button
              onClick={() => setTab('plan')}
              className="px-3 py-1.5 border border-[#E5E5E3] text-[#666666] hover:text-[#1A1A1A] text-xs font-semibold rounded-xl hover:bg-[#F0F0F0] transition-colors"
            >
              Ver plan
            </button>
          </div>
        </div>
      )}

      {/* Utilization Focus Banner (if filtered from Mi Cocina) */}
      {utilizationFilterIngredient && (
        <div
          id="utilization-focus-banner"
          className="bg-[#FFF1EB] border border-[#FFD9CC] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF6321] shrink-0" />
            <span className="text-[#1A1A1A]">
              Priorizando platos que aprovechan: <strong>{utilizationFilterIngredient}</strong>
            </span>
          </div>

          <button
            id="btn-clear-utilization-filter"
            onClick={() => setUtilizationFilterIngredient(null)}
            className="text-xs font-bold text-[#FF6321] hover:text-[#D94E14] inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Ver todas</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Decision Banner (if user picked an option previously) */}
      <ActiveDecisionBanner />

      {/* Quick Context Capture Component */}
      <ContextCapture />

      {/* Rejected Items Notice & Reset (if any were rejected) */}
      {rejectedRecipeIds.length > 0 && (
        <div className="flex items-center justify-between bg-[#F9F9F8] px-4 py-2.5 rounded-2xl text-xs text-[#666666] border border-[#E5E5E3]">
          <span>Ocultando {rejectedRecipeIds.length} opciones descartadas</span>
          <button
            onClick={clearRejectedList}
            className="text-[#1A1A1A] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[#FF6321]" />
            Restaurar todas
          </button>
        </div>
      )}

      {/* Ranked Proposals List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#A1A1A1]">
            Recomendado para vos ({recommendations.length})
          </h2>
          <span className="text-[11px] font-medium text-[#8C8C8C]">Ordenadas por adecuación contextual</span>
        </div>

        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                isChosen={activeChosenRecommendation?.recipe.id === rec.recipe.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E5E5E3] p-8 text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#FFF1EB] text-[#FF6321] flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#1A1A1A]">
              {utilizationFilterIngredient
                ? `No encontramos recetas que usen ${utilizationFilterIngredient} con el contexto actual`
                : 'No encontramos opciones con los filtros actuales'}
            </h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto leading-relaxed">
              {utilizationFilterIngredient
                ? 'Podés ampliar el tiempo disponible o volver a ver todas las propuestas.'
                : 'Podés ampliar el tiempo disponible, cambiar de prioridad o restaurar las opciones descartadas.'}
            </p>
            <div className="flex justify-center gap-2 pt-1 flex-wrap">
              {utilizationFilterIngredient && (
                <button
                  onClick={() => setUtilizationFilterIngredient(null)}
                  className="text-xs font-semibold bg-[#1A1A1A] text-white px-4 py-2 rounded-full hover:bg-black transition-colors"
                >
                  Ver todas las propuestas
                </button>
              )}
              {rejectedRecipeIds.length > 0 && (
                <button
                  onClick={clearRejectedList}
                  className="text-xs font-semibold bg-[#F5F5F5] text-[#1A1A1A] px-4 py-2 rounded-full hover:bg-[#E8E8E8] transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-[#FF6321]" />
                  Restaurar descartadas
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
