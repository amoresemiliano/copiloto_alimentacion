import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MealMoment } from '../types/domain';
import { X, CheckCircle, Utensils, MessageSquarePlus } from 'lucide-react';

export const MealLogModal: React.FC = () => {
  const {
    isLogMealModalOpen,
    closeLogMealModal,
    logMealPrefill,
    recipes,
    context,
    logRealMeal,
  } = useApp();

  const [mode, setMode] = useState<'sugerido' | 'otro'>(
    logMealPrefill?.suggested ? 'sugerido' : 'otro'
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    logMealPrefill?.recipe?.id || recipes[0]?.id || ''
  );
  const [customText, setCustomText] = useState('');
  const [mealMoment, setMealMoment] = useState<MealMoment>(context.moment);

  if (!isLogMealModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'sugerido') {
      const rec = recipes.find((r) => r.id === selectedRecipeId);
      logRealMeal({
        mealMoment,
        selectedRecipeId,
        recipeName: rec?.name || 'Receta sugerida',
        wasSuggested: true,
        plannedMealId: logMealPrefill?.plannedMealId,
      });
    } else {
      logRealMeal({
        mealMoment,
        customText: customText.trim() || 'Comida no sugerida',
        wasSuggested: false,
        plannedMealId: logMealPrefill?.plannedMealId,
      });
    }
  };

  return (
    <div
      id="meal-log-modal-overlay"
      className="fixed inset-0 z-50 bg-[#1A1A1A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLogMealModal();
      }}
    >
      <div
        id="meal-log-modal-content"
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E5E5E3] p-6"
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F0F0F0] text-[#1A1A1A] flex items-center justify-center border border-[#E5E5E3]">
              <Utensils className="w-4 h-4 text-[#FF6321]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">
                Registrar comida real
              </h3>
              <p className="text-xs text-[#666666]">
                Para que el copiloto aprenda qué comiste sin juzgar.
              </p>
            </div>
          </div>
          <button
            onClick={closeLogMealModal}
            className="text-[#8C8C8C] hover:text-[#1A1A1A] p-1.5 rounded-full hover:bg-[#F0F0F0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Momento de la comida */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1] mb-2">
              Momento de la comida
            </label>
            <div className="grid grid-cols-4 gap-1 bg-[#F0F0F0] p-1 rounded-full border border-[#E5E5E3]">
              {(['desayuno', 'almuerzo', 'merienda', 'cena'] as MealMoment[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMealMoment(m)}
                  className={`py-1.5 text-xs font-semibold rounded-full capitalize transition-all cursor-pointer ${
                    mealMoment === m
                      ? 'bg-[#1A1A1A] text-white shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1A]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher: Sugerido vs Otra cosa */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1] mb-2">
              ¿Qué comiste?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="tab-mode-sugerido"
                onClick={() => setMode('sugerido')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  mode === 'sugerido'
                    ? 'border-[#1A1A1A] bg-[#FAF9F6] text-[#1A1A1A] font-semibold ring-1 ring-[#1A1A1A]/10'
                    : 'border-[#E5E5E3] hover:border-[#1A1A1A] text-[#444444] bg-white'
                }`}
              >
                <CheckCircle className={`w-4 h-4 mt-0.5 ${mode === 'sugerido' ? 'text-[#2E7D32]' : 'text-[#8C8C8C]'}`} />
                <div>
                  <div className="text-xs font-bold text-[#1A1A1A]">Una sugerencia</div>
                  <div className="text-[10px] text-[#666666]">Del catálogo de propuestas</div>
                </div>
              </button>

              <button
                type="button"
                id="tab-mode-otro"
                onClick={() => setMode('otro')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  mode === 'otro'
                    ? 'border-[#1A1A1A] bg-[#FAF9F6] text-[#1A1A1A] font-semibold ring-1 ring-[#1A1A1A]/10'
                    : 'border-[#E5E5E3] hover:border-[#1A1A1A] text-[#444444] bg-white'
                }`}
              >
                <MessageSquarePlus className={`w-4 h-4 mt-0.5 ${mode === 'otro' ? 'text-[#FF6321]' : 'text-[#8C8C8C]'}`} />
                <div>
                  <div className="text-xs font-bold text-[#1A1A1A]">Otra cosa</div>
                  <div className="text-[10px] text-[#666666]">Comida espontánea o afuera</div>
                </div>
              </button>
            </div>
          </div>

          {/* Mode inputs */}
          {mode === 'sugerido' ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1] mb-1.5">
                Seleccioná el plato:
              </label>
              <select
                id="select-suggested-recipe"
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full text-xs bg-[#F9F9F8] border border-[#E5E5E3] rounded-2xl p-3 text-[#1A1A1A] font-medium focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.prepTimeMinutes}m)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1] mb-1.5">
                Escribí brevemente qué comiste:
              </label>
              <input
                type="text"
                id="input-custom-meal-text"
                placeholder="Ej. Empanadas de verdura en el trabajo, sándwich de jamón y queso..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full text-xs bg-[#F9F9F8] border border-[#E5E5E3] rounded-2xl p-3 text-[#1A1A1A] placeholder:text-[#8C8C8C] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                autoFocus
              />
              <p className="text-[11px] text-[#8C8C8C] mt-1.5">
                No te preocupes por calorías o cantidades exactas.
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0F0F0]">
            <button
              type="button"
              onClick={closeLogMealModal}
              className="text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] px-4 py-2 rounded-full cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="submit-log-meal-btn"
              className="text-xs font-bold bg-[#1A1A1A] hover:bg-black text-white px-5 py-2.5 rounded-full transition-all shadow-xs cursor-pointer"
            >
              Guardar en historial
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
