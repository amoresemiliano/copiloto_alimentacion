import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlusCircle, CheckCircle2, Clock, MessageSquarePlus, Info, ShoppingBag, Brain } from 'lucide-react';
import { LearningProfileView } from './LearningProfileView';

export const HistoryScreen: React.FC = () => {
  const { recentMeals, purchaseHistory, affinityProfile, openLogMealModal, setTab } = useApp();
  const [activeSection, setActiveSection] = useState<'comidas' | 'compras' | 'aprendizaje'>('comidas');

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

  const activeHypothesesCount = (affinityProfile.activeHypotheses || []).filter((h) => h.status !== 'dismissed').length;

  return (
    <div id="history-screen" className="space-y-5 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#E5E5E3] shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
            Historial y Aprendizaje
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Registro de actividad real y perfil de comportamiento determinístico sin juicios.
          </p>
        </div>

        {activeSection === 'comidas' ? (
          <button
            id="btn-add-history-meal"
            onClick={() => openLogMealModal()}
            className="text-xs font-bold bg-[#1A1A1A] hover:bg-black text-white px-4 py-2.5 rounded-2xl transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#FF6321]" />
            <span>Registrar comida</span>
          </button>
        ) : activeSection === 'compras' ? (
          <button
            onClick={() => setTab('compras')}
            className="text-xs font-bold bg-[#1A1A1A] hover:bg-black text-white px-4 py-2.5 rounded-2xl transition-all flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#FF6321]" />
            <span>Ir a Compras</span>
          </button>
        ) : (
          <div className="text-[11px] font-bold text-[#2E7D32] bg-[#E8F5E9] border border-[#C8E6C9] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
            <span>{activeHypothesesCount} hipótesis activas</span>
          </div>
        )}
      </div>

      {/* Section Switcher */}
      <div className="grid grid-cols-3 gap-2 bg-[#EBEBEA] p-1 rounded-2xl border border-[#E0E0DE]">
        <button
          onClick={() => setActiveSection('comidas')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeSection === 'comidas'
              ? 'bg-white text-[#1A1A1A] shadow-xs border border-[#E5E5E3]'
              : 'text-[#666666] hover:text-[#1A1A1A]'
          }`}
        >
          <span>Comidas ({recentMeals.length})</span>
        </button>
        <button
          onClick={() => setActiveSection('compras')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeSection === 'compras'
              ? 'bg-white text-[#1A1A1A] shadow-xs border border-[#E5E5E3]'
              : 'text-[#666666] hover:text-[#1A1A1A]'
          }`}
        >
          <span>Compras ({purchaseHistory.length})</span>
        </button>
        <button
          onClick={() => setActiveSection('aprendizaje')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
            activeSection === 'aprendizaje'
              ? 'bg-white text-[#1A1A1A] shadow-xs border border-[#E5E5E3]'
              : 'text-[#666666] hover:text-[#1A1A1A]'
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-[#FF6321]" />
          <span>Aprendiendo de vos</span>
        </button>
      </div>

      {/* Content based on active section */}
      {activeSection === 'aprendizaje' ? (
        <LearningProfileView />
      ) : activeSection === 'comidas' ? (
        <div className="bg-white rounded-3xl border border-[#E5E5E3] overflow-hidden shadow-xs divide-y divide-[#F0F0F0]">
          {recentMeals.length > 0 ? (
            recentMeals.map((meal) => {
              const isSuggested = meal.wasSuggested;
              const isPlanned = meal.wasPlanned;
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

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isSuggested
                              ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
                              : 'bg-[#F0F0F0] text-[#666666] border border-[#E5E5E3]'
                          }`}
                        >
                          {isSuggested ? 'Sugerencia elegida' : 'Comida espontánea / desvío'}
                        </span>
                        {isPlanned && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FFF2EB] text-[#FF6321] border border-[#FFD9C6]">
                            Comida prevista en Plan
                          </span>
                        )}
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
      ) : (
        /* Purchase History Section */
        <div className="space-y-3">
          {purchaseHistory.length > 0 ? (
            purchaseHistory.map((purch) => (
              <div
                key={purch.id}
                className="bg-white rounded-3xl border border-[#E5E5E3] p-4.5 shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#E6F4EA] text-[#137333] flex items-center justify-center font-bold">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1A1A1A]">
                        Compra realizada ({purch.items.length} {purch.items.length === 1 ? 'ítem' : 'ítems'})
                      </span>
                      <span className="text-[11px] text-[#8C8C8C] block">
                        {formatMealTime(purch.timestamp)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-[#F5F5F4] text-[#666666] px-2.5 py-1 rounded-full">
                    Aplicado a Mi Cocina
                  </span>
                </div>

                {/* Items in this purchase */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {purch.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-[#F9F9F8] rounded-xl border border-[#EBEBEA] flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-[#1A1A1A]">{item.name}</span>
                      <span className="text-[11px] text-[#666666] font-medium">
                        {item.quantityText || `${item.purchasedQuantity || 1} ${item.unit || 'u.'}`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Summary notes */}
                {purch.appliedChangesSummary.length > 0 && (
                  <div className="pt-2 text-[11px] text-[#666666] space-y-0.5">
                    {purch.appliedChangesSummary.map((sum, i) => (
                      <p key={i}>• {sum}</p>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[#8C8C8C] text-xs bg-white rounded-3xl border border-[#E5E5E3]">
              Aún no hay compras finalizadas.
            </div>
          )}
        </div>
      )}

      <div className="bg-[#FAF9F6] p-4 rounded-3xl text-xs text-[#666666] border border-[#E5E5E3] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#FF6321] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#1A1A1A]">Efecto en el motor: </span>
          Los platos consumidos en las últimas 24–48 horas reciben una penalización de repetición para sugerirte variedad en el momento actual. Las compras nutren tu inventario doméstico.
        </div>
      </div>
    </div>
  );
};
