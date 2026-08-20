import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlannedMeal, PlanDay, MealMoment } from '../types/domain';
import {
  Calendar,
  Plus,
  Trash2,
  Utensils,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingCart,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const PlanningScreen: React.FC = () => {
  const {
    plannedMeals,
    removePlannedMeal,
    updatePlannedMealServings,
    openPlanMealModal,
    openLogMealModal,
    recipes,
    setTab,
    shoppingNeeds,
  } = useApp();

  const [activeDayTab, setActiveDayTab] = useState<PlanDay>('hoy');

  const days: { id: PlanDay; label: string; sub: string }[] = [
    { id: 'hoy', label: 'Hoy', sub: 'Decisiones de la jornada' },
    { id: 'manana', label: 'Mañana', sub: 'Anticipación cercana' },
    { id: 'proximos_dias', label: 'Próximos días', sub: 'Previsión general' },
  ];

  const moments: { id: MealMoment; label: string }[] = [
    { id: 'desayuno', label: 'Desayuno' },
    { id: 'almuerzo', label: 'Almuerzo' },
    { id: 'merienda', label: 'Merienda' },
    { id: 'cena', label: 'Cena' },
  ];

  const activeDayMeals = plannedMeals.filter((m) => m.day === activeDayTab);
  const totalActionableNeeds = shoppingNeeds.filter((n) => n.suggestedAction !== 'cubierto').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="planning-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#E5E5E3] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF2EB] text-[#FF6321]">
              <Calendar className="w-3.5 h-3.5" />
              Planificación Próxima
            </span>
            <span className="text-xs text-[#8C8C8C]">Fase 3</span>
          </div>
          <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
            Anticipá comidas sin rigidez
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Pensá qué comer en próximos momentos para reducir carga mental y generar tu lista de compra inteligente.
          </p>
        </div>

        <button
          id="btn-add-planned-meal"
          onClick={() => openPlanMealModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white rounded-2xl text-xs font-bold hover:bg-black transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 text-[#FF6321]" />
          <span>Planificar comida</span>
        </button>
      </div>

      {/* Connection Banner to Shopping List */}
      {totalActionableNeeds > 0 && (
        <div className="bg-[#FFF9F5] border border-[#FFD9C6] p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF6321] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1A1A1A]">
                Tus comidas planificadas requieren {totalActionableNeeds} {totalActionableNeeds === 1 ? 'producto' : 'productos'}
              </p>
              <p className="text-[11px] text-[#666666]">
                El sistema contrastó con Mi Cocina y preparó tu lista de compras sugerida.
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab('compras')}
            className="px-3.5 py-2 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-black transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Ver Compras</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#FF6321]" />
          </button>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-[#EBEBEA] p-1.5 rounded-2xl border border-[#E0E0DE]">
        {days.map((day) => {
          const isActive = activeDayTab === day.id;
          const count = plannedMeals.filter((m) => m.day === day.id).length;
          return (
            <button
              key={day.id}
              id={`tab-day-${day.id}`}
              onClick={() => setActiveDayTab(day.id)}
              className={`py-2 px-3 rounded-xl transition-all text-center flex flex-col items-center justify-center ${
                isActive
                  ? 'bg-white text-[#1A1A1A] font-bold shadow-xs border border-[#E5E5E3]'
                  : 'text-[#666666] hover:text-[#1A1A1A]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold">{day.label}</span>
                {count > 0 && (
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                      isActive ? 'bg-[#FF6321] text-white font-black' : 'bg-[#DCDCDA] text-[#666666]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#8C8C8C] hidden sm:inline">{day.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Day Moments Content */}
      <div className="space-y-3">
        {moments.map((moment) => {
          const momentMeals = activeDayMeals.filter((m) => m.mealMoment === moment.id);

          return (
            <div
              key={moment.id}
              className="bg-white rounded-2xl border border-[#E5E5E3] p-4.5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
                    {moment.label}
                  </span>
                  {momentMeals.length > 0 ? (
                    <span className="text-[10px] font-semibold text-[#8C8C8C] bg-[#F5F5F4] px-2 py-0.5 rounded-full">
                      {momentMeals.length} {momentMeals.length === 1 ? 'plato' : 'platos'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#A3A3A3] italic">Sin planificar</span>
                  )}
                </div>

                <button
                  onClick={() => openPlanMealModal()}
                  className="text-xs font-bold text-[#FF6321] hover:text-[#E05215] flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>

              {momentMeals.length === 0 ? (
                <div className="py-3 px-3 bg-[#FBFBFA] rounded-xl border border-dashed border-[#E5E5E3] flex items-center justify-between text-xs text-[#8C8C8C]">
                  <span>No hay comidas previstas para este momento.</span>
                  <button
                    onClick={() => openPlanMealModal()}
                    className="text-[11px] font-semibold text-[#1A1A1A] hover:underline"
                  >
                    + Elegir propuesta
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {momentMeals.map((meal) => {
                    const matchedRecipe = meal.recipeId ? recipes.find((r) => r.id === meal.recipeId) : undefined;
                    const isCompleted = meal.status === 'completed';

                    return (
                      <div
                        key={meal.id}
                        id={`planned-card-${meal.id}`}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isCompleted
                            ? 'bg-[#F9F9F8] border-[#E5E5E3] opacity-75'
                            : 'bg-white border-[#E5E5E3] hover:border-[#D1D1CE]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3
                                className={`text-sm font-bold truncate ${
                                  isCompleted ? 'text-[#8C8C8C] line-through' : 'text-[#1A1A1A]'
                                }`}
                              >
                                {meal.recipeName}
                              </h3>
                              {isCompleted ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#E6F4EA] text-[#137333] px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Consumido
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold bg-[#FFF2EB] text-[#FF6321] px-2 py-0.5 rounded-full">
                                  Planificado
                                </span>
                              )}
                              {meal.source === 'recommendation_save' && (
                                <span className="text-[10px] font-medium text-[#8C8C8C] flex items-center gap-0.5">
                                  <Sparkles className="w-3 h-3 text-[#FF6321]" /> Guardado de propuestas
                                </span>
                              )}
                            </div>

                            {matchedRecipe && (
                              <p className="text-xs text-[#666666] line-clamp-1 mb-2">
                                {matchedRecipe.description}
                              </p>
                            )}

                            {meal.notes && (
                              <p className="text-[11px] text-[#8C8C8C] italic mb-2">
                                Nota: {meal.notes}
                              </p>
                            )}

                            {/* Servings Stepper & Info */}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 bg-[#F5F5F4] px-2.5 py-1 rounded-xl border border-[#E5E5E3]">
                                <Users className="w-3 h-3 text-[#666666]" />
                                <span className="text-[11px] font-medium text-[#666666]">Porciones:</span>
                                <button
                                  type="button"
                                  onClick={() => updatePlannedMealServings(meal.id, Math.max(1, meal.servings - 1))}
                                  disabled={meal.servings <= 1}
                                  className="w-5 h-5 rounded-md bg-white border border-[#E5E5E3] text-xs font-bold flex items-center justify-center text-[#1A1A1A] hover:bg-[#F0F0F0] disabled:opacity-30"
                                >
                                  -
                                </button>
                                <span className="text-xs font-bold text-[#1A1A1A] px-1">{meal.servings}</span>
                                <button
                                  type="button"
                                  onClick={() => updatePlannedMealServings(meal.id, meal.servings + 1)}
                                  className="w-5 h-5 rounded-md bg-white border border-[#E5E5E3] text-xs font-bold flex items-center justify-center text-[#1A1A1A] hover:bg-[#F0F0F0]"
                                >
                                  +
                                </button>
                              </div>

                              {matchedRecipe && (
                                <span className="text-[11px] text-[#8C8C8C] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {matchedRecipe.prepTimeMinutes} min
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {!isCompleted && (
                              <button
                                onClick={() =>
                                  openLogMealModal({
                                    recipe: matchedRecipe,
                                    suggested: true,
                                    plannedMealId: meal.id,
                                  })
                                }
                                className="px-2.5 py-1.5 bg-[#1A1A1A] text-white text-xs font-bold rounded-xl hover:bg-black transition-all flex items-center gap-1 shadow-2xs"
                              >
                                <Utensils className="w-3 h-3 text-[#FF6321]" />
                                <span>Cocinar ahora</span>
                              </button>
                            )}

                            <button
                              onClick={() => removePlannedMeal(meal.id)}
                              className="p-1.5 text-[#8C8C8C] hover:text-[#D9381E] hover:bg-[#FEECEB] rounded-lg transition-colors"
                              title="Eliminar de planificación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
