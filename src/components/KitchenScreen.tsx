import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Star,
  Info,
} from 'lucide-react';

export const KitchenScreen: React.FC = () => {
  const { inventory, updateInventoryItemStatus, updateInventoryItemPriority, setTab } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  const categories = [
    { id: 'todas', label: 'Todos' },
    { id: 'verduras', label: 'Verduras' },
    { id: 'lacteos_huevos', label: 'Lácteos y Huevos' },
    { id: 'carnes_proteinas', label: 'Proteínas' },
    { id: 'despensa', label: 'Despensa' },
  ];

  const filteredItems = selectedCategory === 'todas'
    ? inventory
    : inventory.filter((i) => i.category === selectedCategory);

  const priorityCount = inventory.filter((i) => i.priority !== 'normal' && i.status !== 'no_tengo').length;

  return (
    <div id="kitchen-screen" className="space-y-5 pb-12 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] tracking-tight">
          Mi Cocina (Inventario mínimo)
        </h1>
        <p className="text-xs sm:text-sm text-[#666666] mt-1">
          Indicá disponibilidad y qué conviene aprovechar. El ranking se adapta inmediatamente.
        </p>
      </div>

      {/* Utilization summary pill */}
      <div className="bg-[#FAF9F6] border border-[#E5E5E3] rounded-3xl p-4 sm:p-5 flex items-start justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-[#2E7D32]" />
          </div>
          <div className="text-xs text-[#1A1A1A]">
            <span className="font-bold text-[#1A1A1A]">Aprovechamiento activo: </span>
            {priorityCount > 0 ? (
              <span className="text-[#555555]">
                Tenés {priorityCount} ingredientes marcados para aprovechar o consumir pronto. Las recetas compatibles reciben mayor prioridad.
              </span>
            ) : (
              <span className="text-[#555555]">
                Marcá un ingrediente con la estrella o reloj para que el motor priorice recetas que lo utilicen.
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setTab('ahora')}
          className="text-xs font-bold text-white bg-[#1A1A1A] hover:bg-black px-4 py-2 rounded-full shrink-0 transition-colors cursor-pointer shadow-xs"
        >
          Ver en Ahora →
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.id}
            id={`cat-btn-${c.id}`}
            onClick={() => setSelectedCategory(c.id)}
            className={`text-xs px-4 py-2 rounded-full whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-[#1A1A1A] text-white font-bold shadow-xs'
                : 'bg-white text-[#666666] border border-[#E5E5E3] hover:border-[#1A1A1A] font-semibold'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="bg-white rounded-3xl border border-[#E5E5E3] overflow-hidden shadow-xs divide-y divide-[#F0F0F0]">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            id={`inv-row-${item.id}`}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6]/80 transition-colors"
          >
            {/* Item Name & Meta */}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#1A1A1A]">{item.name}</span>
                  {item.quantityDemo && (
                    <span className="text-[11px] font-semibold text-[#8C8C8C] bg-[#F0F0F0] px-2 py-0.5 rounded-full">
                      ~{item.quantityDemo} {item.unitDemo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls: Availability Segmented Button + Priority Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Availability button group */}
              <div className="flex bg-[#F0F0F0] p-1 rounded-full border border-[#E5E5E3]">
                <button
                  id={`status-tengo-${item.id}`}
                  onClick={() => updateInventoryItemStatus(item.id, 'tengo')}
                  className={`px-3 py-1.5 text-xs rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                    item.status === 'tengo'
                      ? 'bg-white text-[#2E7D32] font-bold shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1A]'
                  }`}
                  title="Tengo disponible"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Tengo</span>
                </button>

                <button
                  id={`status-queda_poco-${item.id}`}
                  onClick={() => updateInventoryItemStatus(item.id, 'queda_poco')}
                  className={`px-3 py-1.5 text-xs rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                    item.status === 'queda_poco'
                      ? 'bg-white text-[#B78103] font-bold shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1A]'
                  }`}
                  title="Queda poco"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-[#B78103]" />
                  <span>Poco</span>
                </button>

                <button
                  id={`status-no_tengo-${item.id}`}
                  onClick={() => updateInventoryItemStatus(item.id, 'no_tengo')}
                  className={`px-3 py-1.5 text-xs rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                    item.status === 'no_tengo'
                      ? 'bg-white text-[#D9381E] font-bold shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1A]'
                  }`}
                  title="No tengo"
                >
                  <XCircle className="w-3.5 h-3.5 text-[#D9381E]" />
                  <span>No tengo</span>
                </button>
              </div>

              {/* Priority Toggle (Consumir pronto / Prioritario) */}
              {item.status !== 'no_tengo' && (
                <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-full border border-[#E5E5E3]">
                  <button
                    id={`priority-pronto-${item.id}`}
                    onClick={() =>
                      updateInventoryItemPriority(
                        item.id,
                        item.priority === 'consumir_pronto' ? 'normal' : 'consumir_pronto'
                      )
                    }
                    className={`px-2.5 py-1 text-[11px] rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                      item.priority === 'consumir_pronto'
                        ? 'bg-[#FFF8E1] text-[#B78103] font-bold border border-[#FFE082]'
                        : 'text-[#666666] hover:text-[#1A1A1A]'
                    }`}
                    title="Consumir pronto para no desperdiciar"
                  >
                    <Clock className="w-3 h-3 text-[#B78103]" />
                    <span>Pronto</span>
                  </button>

                  <button
                    id={`priority-top-${item.id}`}
                    onClick={() =>
                      updateInventoryItemPriority(
                        item.id,
                        item.priority === 'prioritario' ? 'normal' : 'prioritario'
                      )
                    }
                    className={`px-2.5 py-1 text-[11px] rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                      item.priority === 'prioritario'
                        ? 'bg-[#E8F5E9] text-[#2E7D32] font-bold border border-[#C8E6C9]'
                        : 'text-[#666666] hover:text-[#1A1A1A]'
                    }`}
                    title="Aprovechar prioritariamente hoy"
                  >
                    <Star className="w-3 h-3 text-[#2E7D32] fill-[#2E7D32]" />
                    <span>Prioritario</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Helpful Hint */}
      <div className="text-[11px] text-[#8C8C8C] flex items-start gap-2 px-2">
        <Info className="w-3.5 h-3.5 text-[#FF6321] shrink-0 mt-0.5" />
        <span>
          En esta fase el inventario no exige pesajes exactos. Alcanza con marcar lo que tenés para que el motor ajuste el ranking determinístico.
        </span>
      </div>
    </div>
  );
};
