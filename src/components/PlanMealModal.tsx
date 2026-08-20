import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Recipe, PlanDay, MealMoment } from '../types/domain';
import { X, Calendar, Clock, Users, Plus, Check } from 'lucide-react';

export const PlanMealModal: React.FC = () => {
  const {
    isPlanMealModalOpen,
    planMealPrefillRecipe,
    closePlanMealModal,
    addPlannedMeal,
    recipes,
  } = useApp();

  const [selectedDay, setSelectedDay] = useState<PlanDay>('hoy');
  const [selectedMoment, setSelectedMoment] = useState<MealMoment>('cena');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [servings, setServings] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  useEffect(() => {
    if (planMealPrefillRecipe) {
      setSelectedRecipeId(planMealPrefillRecipe.id);
      setIsCustomMode(false);
      // Auto pick suitable moment if available
      if (planMealPrefillRecipe.mealMoments.length > 0) {
        setSelectedMoment(planMealPrefillRecipe.mealMoments[0]);
      }
    } else {
      setSelectedRecipeId(recipes[0]?.id || '');
      setIsCustomMode(false);
      setCustomName('');
    }
  }, [planMealPrefillRecipe, recipes, isPlanMealModalOpen]);

  if (!isPlanMealModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recipe = !isCustomMode && selectedRecipeId ? recipes.find((r) => r.id === selectedRecipeId) : undefined;
    const name = isCustomMode ? customName.trim() : (recipe ? recipe.name : customName.trim());

    if (!name) return;

    addPlannedMeal({
      day: selectedDay,
      mealMoment: selectedMoment,
      recipe,
      recipeName: name,
      servings,
      notes: notes.trim() || undefined,
    });

    closePlanMealModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-[#E5E5E3] max-h-[90vh] overflow-y-auto"
        id="plan-meal-modal"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF2EB] text-[#FF6321] flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">Planificar comida próxima</h2>
              <p className="text-xs text-[#8C8C8C]">Anticipá sin rigidez y alimentá tu lista de compras</p>
            </div>
          </div>
          <button
            onClick={closePlanMealModal}
            className="p-1.5 rounded-full text-[#8C8C8C] hover:text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Day selection */}
          <div>
            <label className="block text-xs font-bold text-[#666666] uppercase tracking-wider mb-1.5">
              ¿Cuándo tenés pensado comerlo?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'hoy' as PlanDay, label: 'Hoy' },
                { id: 'manana' as PlanDay, label: 'Mañana' },
                { id: 'proximos_dias' as PlanDay, label: 'Próximos días' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDay(d.id)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                    selectedDay === d.id
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                      : 'bg-[#F9F9F8] text-[#666666] border-[#E5E5E3] hover:border-[#1A1A1A]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Moment selection */}
          <div>
            <label className="block text-xs font-bold text-[#666666] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#8C8C8C]" />
              Momento de comida
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'desayuno' as MealMoment, label: 'Desayuno' },
                { id: 'almuerzo' as MealMoment, label: 'Almuerzo' },
                { id: 'merienda' as MealMoment, label: 'Merienda' },
                { id: 'cena' as MealMoment, label: 'Cena' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMoment(m.id)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all text-center ${
                    selectedMoment === m.id
                      ? 'bg-[#FF6321] text-white border-[#FF6321] shadow-xs'
                      : 'bg-[#F9F9F8] text-[#666666] border-[#E5E5E3] hover:border-[#FF6321]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipe or Custom Dish */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#666666] uppercase tracking-wider">
                {isCustomMode ? 'Plato o preparación libre' : 'Seleccionar receta'}
              </label>
              <button
                type="button"
                onClick={() => setIsCustomMode(!isCustomMode)}
                className="text-[11px] font-semibold text-[#FF6321] hover:underline"
              >
                {isCustomMode ? '← Elegir de mis recetas' : '+ Escribir plato libre'}
              </button>
            </div>

            {isCustomMode ? (
              <input
                type="text"
                placeholder="Ej. Tarta de zapallitos casera, Milanesas con ensalada..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-[#F9F9F8] border border-[#E5E5E3] rounded-xl text-sm focus:outline-hidden focus:border-[#1A1A1A] transition-all"
              />
            ) : (
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F9F9F8] border border-[#E5E5E3] rounded-xl text-sm focus:outline-hidden focus:border-[#1A1A1A] transition-all font-medium"
              >
                {recipes.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.name} ({rec.prepTimeMinutes} min · {rec.complexity})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Servings */}
          <div>
            <label className="block text-xs font-bold text-[#666666] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#8C8C8C]" />
              Porciones / Comensales
            </label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setServings(num)}
                  className={`w-11 h-10 rounded-xl text-xs font-bold border transition-all flex items-center justify-center ${
                    servings === num
                      ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                      : 'bg-[#F9F9F8] text-[#666666] border-[#E5E5E3] hover:border-[#1A1A1A]'
                  }`}
                >
                  {num}
                </button>
              ))}
              <span className="text-xs text-[#8C8C8C] ml-1">
                {servings === 1 ? '1 porción' : `${servings} porciones`} (ajusta cantidades de compra)
              </span>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold text-[#666666] uppercase tracking-wider mb-1.5">
              Nota o aclaración (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Dejar cocido la noche anterior..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F9F9F8] border border-[#E5E5E3] rounded-xl text-xs focus:outline-hidden focus:border-[#1A1A1A] transition-all"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={closePlanMealModal}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#E5E5E3] text-xs font-semibold text-[#666666] hover:bg-[#F0F0F0] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4 text-[#FF6321]" />
              <span>Guardar en planificación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
