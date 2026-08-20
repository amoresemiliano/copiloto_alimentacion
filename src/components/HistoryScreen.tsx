import React from 'react';
import { useApp } from '../context/AppContext';
import { PlusCircle, CheckCircle2, Clock, MessageSquarePlus, Info } from 'lucide-react';

export const HistoryScreen: React.FC = () => {
  const { recentMeals, openLogMealModal } = useApp();

  const formatMealTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 3600));

      if (diffHours < 1) return 'Hace instantes';
      if (diffHours < 24) return `Hace ${diffHours} h`;
      const days = Math.round(diffHours / 24);
      return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    } catch {
      return 'Reciente';
    }
  };

  return (
    <div id="history-screen" className="space-y-5 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            Alimentación Reciente
          </h1>
          <p className="text-xs sm:text-sm text-[#666666] mt-1">
            Registro real para calibrar variedad sin juzgar ni contar calorías.
          </p>
        </div>

        <button
          id="btn-add-history-meal"
          onClick={() => openLogMealModal()}
          className="text-xs font-bold bg-[#1A1A1A] hover:bg-black text-white px-4 py-2.5 rounded-full transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Registrar comida</span>
        </button>
      </div>

      {/* Timeline list */}
      <div className="bg-white rounded-3xl border border-[#E5E5E3] overflow-hidden shadow-xs divide-y divide-[#F0F0F0]">
        {recentMeals.length > 0 ? (
          recentMeals.map((meal) => {
            const isSuggested = meal.wasSuggested;
            return (
              <div key={meal.id} className="p-4 flex items-start justify-between gap-3 hover:bg-[#FAF9F6]/80 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${
                      isSuggested
                        ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]'
                        : 'bg-[#F0F0F0] text-[#1A1A1A] border-[#E5E5E3]'
                    }`}
                  >
                    {isSuggested ? (
                      <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                    ) : (
                      <MessageSquarePlus className="w-4 h-4 text-[#FF6321]" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                        {meal.mealMoment}
                      </span>
                      <span className="text-[11px] text-[#8C8C8C] flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-[#A1A1A1]" />
                        {formatMealTime(meal.timestamp)}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#1A1A1A] mt-0.5">
                      {meal.recipeName || meal.customText || 'Comida registrada'}
                    </h4>

                    {meal.customText && meal.recipeName && (
                      <p className="text-xs text-[#666666] mt-0.5 italic">
                        "{meal.customText}"
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isSuggested
                            ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                            : 'bg-[#F0F0F0] text-[#666666] border border-[#E5E5E3]'
                        }`}
                      >
                        {isSuggested ? 'Sugerencia elegida' : 'Comida espontánea / desvío'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-[#8C8C8C] text-xs">
            Aún no hay registros de comidas.
          </div>
        )}
      </div>

      <div className="bg-[#FAF9F6] p-4 rounded-3xl text-xs text-[#666666] border border-[#E5E5E3] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#FF6321] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#1A1A1A]">Efecto en el motor: </span>
          Los platos consumidos en las últimas 24–48 horas reciben una penalización de repetición para sugerirte variedad en el momento actual.
        </div>
      </div>
    </div>
  );
};
