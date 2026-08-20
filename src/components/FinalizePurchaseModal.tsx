import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { InventoryMergeResult } from '../services/inventoryMergeService';
import { Check, X, ShoppingBag, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface FinalizePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: InventoryMergeResult) => void;
}

export const FinalizePurchaseModal: React.FC<FinalizePurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { shoppingItems, finalizePurchase, setTab } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const purchasedItems = shoppingItems.filter(
    (item) => item.status === 'purchased' || item.status === 'marked_have'
  );

  const handleConfirm = () => {
    setIsProcessing(true);
    try {
      const result = finalizePurchase();
      onSuccess(result);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-[#E5E5E3] max-h-[90vh] overflow-y-auto"
        id="finalize-purchase-modal"
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E3]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E6F4EA] text-[#137333] flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">Finalizar Compra</h2>
              <p className="text-xs text-[#8C8C8C]">Transformar productos comprados en inventario útil</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#8C8C8C] hover:text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pt-4">
          {purchasedItems.length === 0 ? (
            <div className="p-4 bg-[#FFF9F5] border border-[#FFD9C6] rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FF6321] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">No marcaste ningún producto como comprado</p>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Marcá los productos con el tilde de comprado antes de pasarlos a Mi Cocina.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-[#F9F9F8] p-4 rounded-2xl border border-[#E5E5E3]">
                <p className="text-xs font-bold text-[#1A1A1A] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6321]" />
                  Se actualizarán {purchasedItems.length} {purchasedItems.length === 1 ? 'producto' : 'productos'} en Mi Cocina:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {purchasedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-white rounded-xl border border-[#EBEBEA]"
                    >
                      <span className="font-semibold text-[#1A1A1A]">{item.name}</span>
                      <span className="text-[#666666] font-medium text-[11px]">
                        {item.quantityText || (item.purchasedQuantity ? `${item.purchasedQuantity} ${item.unit || ''}` : 'Tengo')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-[#8C8C8C] leading-relaxed">
                • Los productos nuevos se crearán con estado <strong>Tengo</strong>.<br />
                • Los productos existentes con unidades compatibles sumarán su stock automáticamente.<br />
                • Se evitará inventar precisión anterior para mantener un inventario honesto.
              </p>
            </>
          )}

          {/* Buttons */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-[#E5E5E3] text-xs font-semibold text-[#666666] hover:bg-[#F0F0F0] transition-colors"
            >
              Volver a la lista
            </button>
            <button
              type="button"
              disabled={purchasedItems.length === 0 || isProcessing}
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold hover:bg-black transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Check className="w-4 h-4 text-[#FF6321]" />
              <span>Aplicar a Mi Cocina</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
