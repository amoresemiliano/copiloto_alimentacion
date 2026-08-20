import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InventoryItem, IngredientAvailability, IngredientPriority } from '../types/domain';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Star,
  Search,
  Plus,
  ArrowRight,
  Refrigerator,
  Package,
  Apple,
  Snowflake,
  HelpCircle,
  Trash2,
  Edit2,
  X,
  Info,
} from 'lucide-react';

export const KitchenScreen: React.FC = () => {
  const {
    inventory,
    recipes,
    updateInventoryItemStatus,
    updateInventoryItemPriority,
    updateInventoryItemDetails,
    addInventoryItem,
    removeInventoryItem,
    focusUtilizationIngredient,
    setTab,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // all, available, low, priority, unknown, heladera, despensa, frutas_verduras, freezer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // New item form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryItem['category']>('verduras');
  const [newStatus, setNewStatus] = useState<IngredientAvailability>('tengo');
  const [newPriority, setNewPriority] = useState<IngredientPriority>('normal');
  const [newLocation, setNewLocation] = useState<NonNullable<InventoryItem['location']>>('heladera');
  const [newApproxQty, setNewApproxQty] = useState('');

  // Quick suggestion chips for adding items
  const quickFoodSuggestions = [
    { name: 'Zanahorias', category: 'verduras', location: 'heladera' },
    { name: 'Palta / Aguacate', category: 'verduras', location: 'frutas_verduras' },
    { name: 'Limones', category: 'verduras', location: 'frutas_verduras' },
    { name: 'Brócoli', category: 'verduras', location: 'heladera' },
    { name: 'Leche', category: 'lacteos_huevos', location: 'heladera' },
    { name: 'Manteca / Mantequilla', category: 'lacteos_huevos', location: 'heladera' },
    { name: 'Lentejas cocidas o secas', category: 'despensa', location: 'despensa' },
    { name: 'Ajo', category: 'verduras', location: 'despensa' },
  ] as const;

  // Counts & metrics
  const availableItems = inventory.filter(
    (i) => i.status === 'tengo' || i.status === 'available'
  );
  const lowItems = inventory.filter(
    (i) => i.status === 'queda_poco' || i.status === 'low'
  );
  const unknownItems = inventory.filter(
    (i) => i.status === 'desconocido' || i.status === 'unknown'
  );
  const priorityItems = inventory.filter(
    (i) =>
      (i.priority === 'prioritario' ||
        i.priority === 'priority' ||
        i.priority === 'consumir_pronto' ||
        i.priority === 'consume_soon') &&
      i.status !== 'no_tengo' &&
      i.status !== 'unavailable'
  );

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      // Search text match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchLoc = item.location?.toLowerCase().includes(q);
        if (!matchName && !matchLoc) return false;
      }

      // Filter chips
      if (filterType === 'all') return true;
      if (filterType === 'available') return item.status === 'tengo' || item.status === 'available';
      if (filterType === 'low') return item.status === 'queda_poco' || item.status === 'low';
      if (filterType === 'priority') {
        return (
          (item.priority === 'prioritario' ||
            item.priority === 'priority' ||
            item.priority === 'consumir_pronto' ||
            item.priority === 'consume_soon') &&
          item.status !== 'no_tengo' &&
          item.status !== 'unavailable'
        );
      }
      if (filterType === 'unknown') return item.status === 'desconocido' || item.status === 'unknown';
      if (filterType === 'heladera') return item.location === 'heladera';
      if (filterType === 'despensa') return item.location === 'despensa';
      if (filterType === 'frutas_verduras') return item.location === 'frutas_verduras';
      if (filterType === 'freezer') return item.location === 'freezer';

      return true;
    });
  }, [inventory, searchQuery, filterType]);

  // Helper to count how many recipes in the catalog use a specific ingredient
  const getRecipeCountForIngredient = (ingredientName: string) => {
    const q = ingredientName.toLowerCase();
    return recipes.filter((r) =>
      r.ingredients.some(
        (ing) => ing.name.toLowerCase().includes(q) || q.includes(ing.name.toLowerCase())
      )
    ).length;
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    addInventoryItem({
      name: newName.trim(),
      category: newCategory,
      status: newStatus,
      priority: newPriority,
      location: newLocation,
      approximateQuantity: newApproxQty.trim() || undefined,
      confidence: newStatus === 'desconocido' ? 'uncertain' : 'confirmed',
      source: 'manual',
    });

    setNewName('');
    setNewApproxQty('');
    setNewPriority('normal');
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateInventoryItemDetails(editingItem.id, {
      name: editingItem.name,
      category: editingItem.category,
      status: editingItem.status,
      priority: editingItem.priority,
      location: editingItem.location,
      approximateQuantity: editingItem.approximateQuantity || undefined,
      confidence: editingItem.confidence,
    });

    setEditingItem(null);
  };

  return (
    <div id="kitchen-screen" className="space-y-6 pb-16 animate-fadeIn">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[12px] uppercase tracking-[0.15em] font-bold text-[#8C8C8C] mb-1">
            DISPONIBILIDAD & APROVECHAMIENTO
          </p>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#1A1A1A] tracking-tight leading-none">
            Mi Cocina
          </h1>
          <p className="text-xs sm:text-[13px] text-[#666666] mt-1.5 leading-relaxed">
            Inventario de baja fricción. El motor contextual prioriza lo que conviene aprovechar hoy.
          </p>
        </div>

        <button
          id="btn-add-ingredient"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-[#FF6321]" />
          <span>Agregar alimento</span>
        </button>
      </div>

      {/* Structured Overview Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => setFilterType('available')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === 'available'
              ? 'bg-[#E8F5E9]/50 border-[#2E7D32]'
              : 'bg-white border-[#E5E5E3] hover:border-[#1A1A1A]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">Disponibles</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
          </div>
          <p className="text-xl font-bold text-[#1A1A1A] mt-1">{availableItems.length}</p>
        </button>

        <button
          onClick={() => setFilterType('low')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === 'low'
              ? 'bg-[#FFF8E1]/50 border-[#B78103]'
              : 'bg-white border-[#E5E5E3] hover:border-[#1A1A1A]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">Queda poco</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#B78103]" />
          </div>
          <p className="text-xl font-bold text-[#1A1A1A] mt-1">{lowItems.length}</p>
        </button>

        <button
          onClick={() => setFilterType('priority')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === 'priority'
              ? 'bg-[#FFF1EB]/80 border-[#FF6321]'
              : 'bg-white border-[#E5E5E3] hover:border-[#1A1A1A]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#FF6321] uppercase tracking-wider">Aprovechar</span>
            <Sparkles className="w-3.5 h-3.5 text-[#FF6321]" />
          </div>
          <p className="text-xl font-bold text-[#1A1A1A] mt-1">{priorityItems.length}</p>
        </button>

        <button
          onClick={() => setFilterType('unknown')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            filterType === 'unknown'
              ? 'bg-[#F5F5F5] border-[#8C8C8C]'
              : 'bg-white border-[#E5E5E3] hover:border-[#1A1A1A]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#666666] uppercase tracking-wider">Sin confirmar</span>
            <HelpCircle className="w-3.5 h-3.5 text-[#8C8C8C]" />
          </div>
          <p className="text-xl font-bold text-[#1A1A1A] mt-1">{unknownItems.length}</p>
        </button>
      </div>

      {/* Contextual Utilization Module ("¿Qué conviene aprovechar primero?") */}
      <section
        id="utilization-intelligence-card"
        className="bg-gradient-to-br from-[#FFF9F6] to-[#FAF9F6] border border-[#FFD9CC] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FF6321] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A] tracking-tight">
                ¿Qué conviene aprovechar primero?
              </h2>
              <p className="text-xs text-[#666666] mt-0.5 leading-relaxed">
                Recomendaciones proactivas para usar ingredientes frescos o prioritarios sin desperdicio.
              </p>
            </div>
          </div>

          <button
            onClick={() => setTab('ahora')}
            className="text-xs font-bold text-[#1A1A1A] bg-white border border-[#E5E5E3] hover:border-[#1A1A1A] px-3.5 py-1.5 rounded-full shrink-0 transition-colors cursor-pointer hidden sm:inline-flex items-center gap-1 shadow-2xs"
          >
            <span>Ver Ahora</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {priorityItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {priorityItems.map((item) => {
              const matchingRecipes = getRecipeCountForIngredient(item.name);
              const isHighPriority = item.priority === 'prioritario' || item.priority === 'priority';

              return (
                <div
                  key={item.id}
                  id={`utilization-card-${item.id}`}
                  className="bg-white rounded-2xl border border-[#FFE0D6] p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-[#FF6321] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#1A1A1A]">{item.name}</span>
                        {isHighPriority ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-[#2E7D32]" />
                            Prioritario
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#B78103] bg-[#FFF8E1] px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5" />
                            Usar pronto
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#666666]">
                        {item.location && (
                          <span className="capitalize">{item.location.replace('_', ' ')}</span>
                        )}
                        {item.approximateQuantity && (
                          <>
                            <span className="text-[#D0D0D0]">•</span>
                            <span>{item.approximateQuantity}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => updateInventoryItemPriority(item.id, 'normal')}
                      className="text-[#A1A1A1] hover:text-[#1A1A1A] p-1 rounded-full text-[11px]"
                      title="Quitar prioridad"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F5F5F5]">
                    <span className="text-[11px] text-[#666666] font-medium">
                      {matchingRecipes > 0
                        ? `${matchingRecipes} plato${matchingRecipes > 1 ? 's' : ''} disponible${matchingRecipes > 1 ? 's' : ''}`
                        : 'Sugerencias adaptables'}
                    </span>

                    <button
                      id={`btn-focus-rec-${item.id}`}
                      onClick={() => focusUtilizationIngredient(item.name)}
                      className="text-[11px] font-bold text-[#FF6321] bg-[#FFF1EB] hover:bg-[#FFE3D6] px-3 py-1 rounded-full transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Ver platos</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 rounded-2xl border border-dashed border-[#E5E5E3] p-4 text-center text-xs text-[#666666] space-y-1">
            <p className="font-semibold text-[#1A1A1A]">No tenés ingredientes marcados para aprovechar primero.</p>
            <p className="text-[11px]">
              Tocá el ícono de <Clock className="w-3 h-3 inline text-[#B78103]" /> <strong>Pronto</strong> o{' '}
              <Star className="w-3 h-3 inline text-[#2E7D32]" /> <strong>Prioritario</strong> en cualquier alimento de la lista para que el motor busque platos compatibles.
            </p>
          </div>
        )}
      </section>

      {/* Filter and Search Bar */}
      <div className="space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C8C8C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-inventory"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o ubicación (ej: espinaca, heladera, tomates)..."
            className="w-full bg-white border border-[#E5E5E3] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-none focus:border-[#1A1A1A] transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C8C8C] hover:text-[#1A1A1A]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'available', label: 'Tengo' },
            { id: 'low', label: 'Queda poco' },
            { id: 'priority', label: 'Aprovechar' },
            { id: 'unknown', label: 'Sin confirmar' },
            { id: 'heladera', label: 'Heladera' },
            { id: 'despensa', label: 'Despensa' },
            { id: 'frutas_verduras', label: 'Frutas / Verduras' },
            { id: 'freezer', label: 'Freezer' },
          ].map((pill) => (
            <button
              key={pill.id}
              id={`filter-pill-${pill.id}`}
              onClick={() => setFilterType(pill.id)}
              className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                filterType === pill.id
                  ? 'bg-[#1A1A1A] text-white font-bold shadow-2xs'
                  : 'bg-white text-[#666666] border border-[#E5E5E3] hover:border-[#1A1A1A] font-medium'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inventory Items List */}
      <div className="bg-white rounded-3xl border border-[#E5E5E3] overflow-hidden shadow-xs divide-y divide-[#F0F0F0]">
        {filteredInventory.length > 0 ? (
          filteredInventory.map((item) => {
            const isTengo = item.status === 'tengo' || item.status === 'available';
            const isPoco = item.status === 'queda_poco' || item.status === 'low';
            const isNoTengo = item.status === 'no_tengo' || item.status === 'unavailable';
            const isDesconocido = item.status === 'desconocido' || item.status === 'unknown';

            const isPronto = item.priority === 'consumir_pronto' || item.priority === 'consume_soon';
            const isPrioritario = item.priority === 'prioritario' || item.priority === 'priority';

            return (
              <div
                key={item.id}
                id={`inv-row-${item.id}`}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6]/80 transition-colors"
              >
                {/* Item Details */}
                <div className="flex items-start sm:items-center gap-3">
                  {/* Location icon */}
                  <div className="w-8 h-8 rounded-xl bg-[#F5F5F5] text-[#666666] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    {item.location === 'heladera' ? (
                      <Refrigerator className="w-4 h-4 text-[#2E7D32]" />
                    ) : item.location === 'freezer' ? (
                      <Snowflake className="w-4 h-4 text-[#0288D1]" />
                    ) : item.location === 'frutas_verduras' ? (
                      <Apple className="w-4 h-4 text-[#FF6321]" />
                    ) : (
                      <Package className="w-4 h-4 text-[#B78103]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1A1A1A]">{item.name}</span>
                      {item.approximateQuantity && (
                        <span className="text-[11px] font-semibold text-[#666666] bg-[#F0F0F0] px-2 py-0.5 rounded-md">
                          {item.approximateQuantity}
                        </span>
                      )}
                      {item.confidence === 'uncertain' && (
                        <span className="text-[10px] font-medium text-[#8C8C8C] bg-[#F5F5F5] px-1.5 py-0.5 rounded italic">
                          sin confirmar
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8C8C8C]">
                      <span className="capitalize">{item.location?.replace('_', ' ') || item.category}</span>
                    </div>
                  </div>
                </div>

                {/* Controls: Availability Segmented Group + Priority + Quick Edit */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  {/* Availability Segmented Controls */}
                  <div className="flex bg-[#F0F0F0] p-1 rounded-full border border-[#E5E5E3]">
                    <button
                      id={`status-tengo-${item.id}`}
                      onClick={() => updateInventoryItemStatus(item.id, 'tengo')}
                      className={`px-2.5 py-1 text-xs rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                        isTengo
                          ? 'bg-white text-[#2E7D32] font-bold shadow-2xs'
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
                      className={`px-2.5 py-1 text-xs rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                        isPoco
                          ? 'bg-white text-[#B78103] font-bold shadow-2xs'
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
                      className={`px-2.5 py-1 text-xs rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                        isNoTengo
                          ? 'bg-white text-[#D9381E] font-bold shadow-2xs'
                          : 'text-[#666666] hover:text-[#1A1A1A]'
                      }`}
                      title="No tengo"
                    >
                      <XCircle className="w-3.5 h-3.5 text-[#D9381E]" />
                      <span>No tengo</span>
                    </button>

                    <button
                      id={`status-desconocido-${item.id}`}
                      onClick={() => updateInventoryItemStatus(item.id, 'desconocido')}
                      className={`px-2 py-1 text-xs rounded-full transition-all flex items-center cursor-pointer ${
                        isDesconocido
                          ? 'bg-white text-[#1A1A1A] font-bold shadow-2xs'
                          : 'text-[#8C8C8C] hover:text-[#1A1A1A]'
                      }`}
                      title="Estado sin confirmar / dudoso"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Priority Toggles */}
                  {!isNoTengo && (
                    <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-full border border-[#E5E5E3]">
                      <button
                        id={`priority-pronto-${item.id}`}
                        onClick={() =>
                          updateInventoryItemPriority(
                            item.id,
                            isPronto ? 'normal' : 'consumir_pronto'
                          )
                        }
                        className={`px-2.5 py-1 text-[11px] rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                          isPronto
                            ? 'bg-[#FFF8E1] text-[#B78103] font-bold border border-[#FFE082]'
                            : 'text-[#666666] hover:text-[#1A1A1A]'
                        }`}
                        title="Consumir pronto para aprovecharlo"
                      >
                        <Clock className="w-3 h-3 text-[#B78103]" />
                        <span>Pronto</span>
                      </button>

                      <button
                        id={`priority-top-${item.id}`}
                        onClick={() =>
                          updateInventoryItemPriority(
                            item.id,
                            isPrioritario ? 'normal' : 'prioritario'
                          )
                        }
                        className={`px-2.5 py-1 text-[11px] rounded-full transition-all flex items-center gap-1 cursor-pointer ${
                          isPrioritario
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

                  {/* Edit detail button */}
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-[#8C8C8C] hover:text-[#1A1A1A] p-1.5 rounded-full transition-colors cursor-pointer"
                    title="Editar detalles del alimento"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-[#1A1A1A]">No se encontraron alimentos</p>
            <p className="text-xs text-[#666666]">
              Podés cambiar los filtros de búsqueda o agregar un nuevo ingrediente a tu cocina.
            </p>
          </div>
        )}
      </div>

      {/* Helpful Product Guidance Footer */}
      <div className="text-[11px] text-[#8C8C8C] flex items-start gap-2 px-2 bg-[#F9F9F8] p-3 rounded-2xl border border-[#E5E5E3]">
        <Info className="w-4 h-4 text-[#FF6321] shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>Aprovechamiento sin fricción:</strong> No es necesario pesar ni registrar gramos exactos.
          El motor utiliza tus ingredientes disponibles y prioritarios como señales contextuales para ordenar las
          propuestas en <em>Ahora</em>.
        </span>
      </div>

      {/* Modal: Add Food Item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E5E3] max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-serif text-[#1A1A1A]">Agregar a mi cocina</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#8C8C8C] hover:text-[#1A1A1A] p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#8C8C8C] uppercase tracking-wider">
                Sugerencias rápidas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickFoodSuggestions.map((sug) => (
                  <button
                    key={sug.name}
                    type="button"
                    onClick={() => {
                      setNewName(sug.name);
                      setNewCategory(sug.category as any);
                      setNewLocation(sug.location as any);
                    }}
                    className="text-[11px] bg-[#F5F5F5] hover:bg-[#E8E8E8] text-[#1A1A1A] px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    + {sug.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Nombre del alimento *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: Tomates cherry, Palta, Queso rallado..."
                  className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3.5 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Ubicación</label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value as any)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="heladera">Heladera</option>
                    <option value="despensa">Despensa</option>
                    <option value="frutas_verduras">Frutas / Verduras</option>
                    <option value="freezer">Freezer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="verduras">Verduras / Frutas</option>
                    <option value="lacteos_huevos">Lácteos / Huevos</option>
                    <option value="carnes_proteinas">Carnes / Proteínas</option>
                    <option value="despensa">Despensa / Secos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#1A1A1A] block mb-1">
                  Cantidad aproximada <span className="font-normal text-[#8C8C8C]">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={newApproxQty}
                  onChange={(e) => setNewApproxQty(e.target.value)}
                  placeholder="Ej: 3 unidades, ~200 g, 1 paquete..."
                  className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3.5 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Disponibilidad</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="tengo">Tengo</option>
                    <option value="queda_poco">Queda poco</option>
                    <option value="desconocido">Sin confirmar</option>
                    <option value="no_tengo">No tengo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Prioridad</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="normal">Normal</option>
                    <option value="consumir_pronto">Consumir pronto</option>
                    <option value="prioritario">Prioritario</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-[#F5F5F5] hover:bg-[#E8E8E8] text-[#1A1A1A] text-xs font-semibold py-2.5 rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold py-2.5 rounded-full transition-colors"
                >
                  Guardar alimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Item Detail */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E5E3] max-w-md w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-serif text-[#1A1A1A]">Editar alimento</h2>
              <button
                onClick={() => setEditingItem(null)}
                className="text-[#8C8C8C] hover:text-[#1A1A1A] p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3.5 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Ubicación</label>
                  <select
                    value={editingItem.location || 'heladera'}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value as any })}
                    className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="heladera">Heladera</option>
                    <option value="despensa">Despensa</option>
                    <option value="frutas_verduras">Frutas / Verduras</option>
                    <option value="freezer">Freezer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A1A1A] block mb-1">Cantidad aprox.</label>
                  <input
                    type="text"
                    value={editingItem.approximateQuantity || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, approximateQuantity: e.target.value })
                    }
                    placeholder="Ej: 3 unidades"
                    className="w-full bg-[#FAF9F6] border border-[#E5E5E3] rounded-2xl px-3.5 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    removeInventoryItem(editingItem.id);
                    setEditingItem(null);
                  }}
                  className="text-xs text-[#D9381E] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar alimento
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 bg-[#F5F5F5] hover:bg-[#E8E8E8] text-[#1A1A1A] text-xs font-semibold py-2.5 rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold py-2.5 rounded-full transition-colors"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
