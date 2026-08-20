import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingItem, ShoppingItemStatus, InventoryItem } from '../types/domain';
import { FinalizePurchaseModal } from './FinalizePurchaseModal';
import { InventoryMergeResult } from '../services/inventoryMergeService';
import {
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  Edit2,
  Sparkles,
  ShoppingBag,
  Home,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  RefreshCw,
  Eye,
  Zap,
} from 'lucide-react';

export const ShoppingScreen: React.FC = () => {
  const {
    shoppingItems,
    shoppingNeeds,
    addManualShoppingItem,
    removeShoppingItem,
    updateShoppingItemStatus,
    updateShoppingItemQuantity,
    syncShoppingList,
    isShoppingActiveMode,
    setIsShoppingActiveMode,
    setTab,
  } = useApp();

  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InventoryItem['category']>('despensa');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQtyText, setEditingQtyText] = useState('');
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [purchaseSummaryResult, setPurchaseSummaryResult] = useState<InventoryMergeResult | null>(null);

  const pendingItems = shoppingItems.filter((i) => i.status === 'pending');
  const purchasedItems = shoppingItems.filter((i) => i.status === 'purchased' || i.status === 'marked_have');

  const filteredItems = shoppingItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
  });

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    addManualShoppingItem({
      name: newItemName.trim(),
      quantityText: newItemQty.trim() || undefined,
      category: newItemCategory,
    });
    setNewItemName('');
    setNewItemQty('');
  };

  const handleStartEditQty = (item: ShoppingItem) => {
    setEditingItemId(item.id);
    setEditingQtyText(item.quantityText || '');
  };

  const handleSaveEditQty = (item: ShoppingItem) => {
    if (editingQtyText.trim()) {
      updateShoppingItemQuantity(item.id, editingQtyText.trim());
    }
    setEditingItemId(null);
  };

  const handleTogglePurchased = (item: ShoppingItem) => {
    if (item.status === 'purchased') {
      updateShoppingItemStatus(item.id, 'pending');
    } else {
      updateShoppingItemStatus(item.id, 'purchased');
    }
  };

  const handleMarkHave = (item: ShoppingItem) => {
    updateShoppingItemStatus(item.id, 'marked_have');
  };

  const categoriesList: { id: InventoryItem['category']; label: string }[] = [
    { id: 'verduras', label: 'Verduras & Frutas' },
    { id: 'carnes_proteinas', label: 'Proteínas & Carnes' },
    { id: 'lacteos_huevos', label: 'Lácteos & Huevos' },
    { id: 'despensa', label: 'Despensa' },
    { id: 'otros', label: 'Otros' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="shopping-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-[#E5E5E3] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF2EB] text-[#FF6321]">
              <ShoppingCart className="w-3.5 h-3.5" />
              Compras Inteligentes
            </span>
            <span className="text-xs text-[#8C8C8C]">Fase 3</span>
          </div>
          <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight">
            Necesidad real de compra
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Derivada de tus comidas planificadas menos el stock disponible en Mi Cocina.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <button
            onClick={() => setIsShoppingActiveMode(!isShoppingActiveMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isShoppingActiveMode
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-xs'
                : 'bg-[#F9F9F8] text-[#1A1A1A] border-[#E5E5E3] hover:border-[#1A1A1A]'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isShoppingActiveMode ? 'text-[#FF6321]' : 'text-[#8C8C8C]'}`} />
            <span>{isShoppingActiveMode ? 'Modo Comprando ACTIVO' : 'Modo Comprando'}</span>
          </button>

          <button
            onClick={syncShoppingList}
            title="Recalcular según planificación y cocina"
            className="p-2 rounded-xl bg-[#F9F9F8] border border-[#E5E5E3] text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success banner after finalizing a purchase */}
      {purchaseSummaryResult && (
        <div className="bg-[#E6F4EA] border border-[#A8DAB5] p-4.5 rounded-3xl animate-in fade-in duration-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#137333]">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold">
                ¡Compra aplicada a Mi Cocina con éxito!
              </span>
            </div>
            <button
              onClick={() => setPurchaseSummaryResult(null)}
              className="text-xs font-semibold text-[#137333] hover:underline"
            >
              Cerrar
            </button>
          </div>
          <p className="text-xs text-[#1E4620]">
            Se incorporaron <strong>{purchaseSummaryResult.itemsAppliedCount} ítems</strong> a tu inventario doméstico con stock y estados actualizados.
          </p>
          <div className="pt-1 flex gap-2">
            <button
              onClick={() => setTab('cocina')}
              className="px-3 py-1.5 bg-[#137333] text-white rounded-xl text-xs font-bold hover:bg-[#0E5826] transition-all flex items-center gap-1"
            >
              <span>Ver Mi Cocina</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Summary & Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E5E3] text-center shadow-2xs">
          <span className="text-xs text-[#8C8C8C] font-semibold block">Pendientes</span>
          <span className="text-xl font-black text-[#1A1A1A]">{pendingItems.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E5E3] text-center shadow-2xs">
          <span className="text-xs text-[#8C8C8C] font-semibold block">Comprados</span>
          <span className="text-xl font-black text-[#137333]">{purchasedItems.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E5E3] text-center shadow-2xs">
          <span className="text-xs text-[#8C8C8C] font-semibold block">Sugeridos</span>
          <span className="text-xl font-black text-[#FF6321]">
            {shoppingItems.filter((i) => i.origin === 'suggested').length}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#E5E5E3] flex flex-col justify-center items-center shadow-2xs">
          <button
            onClick={() => setIsFinalizeModalOpen(true)}
            disabled={purchasedItems.length === 0}
            className="w-full py-2 px-3 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 shadow-xs"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#FF6321]" />
            <span>Finalizar ({purchasedItems.length})</span>
          </button>
        </div>
      </div>

      {/* Add Manual Item Input */}
      {!isShoppingActiveMode && (
        <form
          onSubmit={handleAddManual}
          className="bg-white p-4 rounded-3xl border border-[#E5E5E3] shadow-xs space-y-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#666666] uppercase tracking-wider">
              + Agregar ítem manual o extra
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6">
              <input
                type="text"
                placeholder="Nombre del producto (ej. Pan integral, Yerba mate...)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-[#F9F9F8] border border-[#E5E5E3] rounded-xl text-xs focus:outline-hidden focus:border-[#1A1A1A] transition-all"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="Cantidad (ej. 500g, 2 unid)"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F9F9F8] border border-[#E5E5E3] rounded-xl text-xs focus:outline-hidden focus:border-[#1A1A1A] transition-all"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF6321]" />
                <span>Agregar a la lista</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search in Shopping List */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8C8C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar en la lista de compras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E5E3] rounded-2xl text-xs focus:outline-hidden focus:border-[#1A1A1A] transition-all"
        />
      </div>

      {/* Shopping List Items Container */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="py-12 bg-white rounded-3xl border border-[#E5E5E3] text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F9F9F8] text-[#8C8C8C] flex items-center justify-center mx-auto">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1A1A1A]">Tu lista de compras está al día</h3>
            <p className="text-xs text-[#666666] max-w-sm mx-auto">
              No tenés faltantes pendientes para tus comidas planificadas. Agregá platos en Planificación o sumá productos manuales arriba.
            </p>
            <button
              onClick={() => setTab('plan')}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl text-xs font-bold hover:bg-black transition-all inline-flex items-center gap-1.5"
            >
              <span>Ir a Planificación</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FF6321]" />
            </button>
          </div>
        ) : (
          <>
            {/* Pending items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
                  Para Comprar ({pendingItems.length})
                </span>
                <span className="text-[11px] text-[#8C8C8C]">Tocá el casillero al comprar</span>
              </div>

              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  id={`shop-item-${item.id}`}
                  className={`bg-white rounded-2xl border border-[#E5E5E3] p-3.5 transition-all shadow-2xs hover:border-[#D1D1CE] ${
                    isShoppingActiveMode ? 'py-4' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Checkbox button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePurchased(item)}
                        className="w-7 h-7 rounded-xl border-2 border-[#D1D1CE] flex items-center justify-center hover:border-[#FF6321] transition-colors shrink-0"
                      >
                        <span className="sr-only">Marcar comprado</span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-bold text-[#1A1A1A] truncate ${
                              isShoppingActiveMode ? 'text-base' : 'text-sm'
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.origin === 'suggested' ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-[#FFF2EB] text-[#FF6321] px-2 py-0.5 rounded-full shrink-0">
                              <Sparkles className="w-3 h-3" />
                              Sugerido
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium bg-[#F5F5F4] text-[#666666] px-2 py-0.5 rounded-full shrink-0">
                              Manual
                            </span>
                          )}
                        </div>

                        {/* Quantity / Reason */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingQtyText}
                                onChange={(e) => setEditingQtyText(e.target.value)}
                                className="px-2 py-0.5 border border-[#1A1A1A] rounded-lg text-xs w-28 bg-[#FFF9F5]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEditQty(item)}
                                className="px-2 py-0.5 bg-[#1A1A1A] text-white rounded-lg text-[10px] font-bold"
                              >
                                Guardar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditQty(item)}
                              className="text-xs font-semibold text-[#1A1A1A] bg-[#F5F5F4] px-2 py-0.5 rounded-lg hover:bg-[#EBEBEA] transition-colors flex items-center gap-1"
                              title="Modificar cantidad"
                            >
                              <span>{item.quantityText || 'Cantidad no especificada'}</span>
                              <Edit2 className="w-3 h-3 text-[#8C8C8C]" />
                            </button>
                          )}

                          {item.reason && !isShoppingActiveMode && (
                            <span className="text-[11px] text-[#666666] italic">
                              • {item.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Item Right Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.origin === 'suggested' && (
                        <button
                          type="button"
                          onClick={() => handleMarkHave(item)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#E5E5E3] text-[11px] font-bold text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors flex items-center gap-1"
                          title="Tengo este ingrediente en casa"
                        >
                          <Home className="w-3.5 h-3.5 text-[#8C8C8C]" />
                          <span className="hidden sm:inline">Ya tengo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeShoppingItem(item.id)}
                        className="p-1.5 text-[#8C8C8C] hover:text-[#D9381E] hover:bg-[#FEECEB] rounded-lg transition-colors"
                        title="Eliminar de la lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Purchased / Acquired items */}
            {purchasedItems.length > 0 && (
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-[#137333] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Comprados y Confirmados ({purchasedItems.length})
                  </span>
                  <span className="text-[11px] text-[#8C8C8C]">
                    Listos para enviar a Mi Cocina
                  </span>
                </div>

                {purchasedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#F9FBF9] rounded-2xl border border-[#D5EBD7] p-3 transition-all opacity-85"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePurchased(item)}
                          className="w-7 h-7 rounded-xl bg-[#137333] text-white flex items-center justify-center shrink-0 shadow-2xs"
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <div className="min-w-0">
                          <span className="font-bold text-sm text-[#1A1A1A] line-through">
                            {item.name}
                          </span>
                          <span className="text-xs text-[#666666] ml-2">
                            ({item.quantityText || '1 u.'})
                          </span>
                          {item.status === 'marked_have' && (
                            <span className="ml-2 text-[10px] font-bold bg-[#E8F0FE] text-[#1967D2] px-2 py-0.5 rounded-full">
                              Confirmado en casa
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeShoppingItem(item.id)}
                        className="p-1.5 text-[#8C8C8C] hover:text-[#D9381E] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Finalize Modal */}
      <FinalizePurchaseModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        onSuccess={(res) => setPurchaseSummaryResult(res)}
      />
    </div>
  );
};
