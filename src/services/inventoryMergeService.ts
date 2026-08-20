import { InventoryItem, ShoppingItem, StorageLocation } from '../types/domain';
import { normalizeText, parseQuantityString, areUnitsCompatible, formatQuantity } from './shoppingNeedsService';

function getDefaultLocationByCategory(category?: InventoryItem['category']): StorageLocation {
  switch (category) {
    case 'despensa':
      return 'despensa';
    case 'verduras':
    case 'frutas':
      return 'frutas_verduras';
    case 'carnes_proteinas':
      return 'heladera';
    case 'lacteos_huevos':
      return 'heladera';
    default:
      return 'heladera';
  }
}

export interface InventoryMergeResult {
  updatedInventory: InventoryItem[];
  appliedSummary: string[];
  itemsAppliedCount: number;
}

export class InventoryMergeService {
  /**
   * Applies purchased items into the user's inventory safely without false precision.
   */
  public applyPurchaseToInventory(
    purchasedItems: ShoppingItem[],
    currentInventory: InventoryItem[]
  ): InventoryMergeResult {
    // Only process items that were purchased or marked as acquired
    const validPurchases = purchasedItems.filter(
      (item) => item.status === 'purchased' || item.status === 'marked_have'
    );

    if (validPurchases.length === 0) {
      return {
        updatedInventory: [...currentInventory],
        appliedSummary: ['No había productos marcados como comprados.'],
        itemsAppliedCount: 0,
      };
    }

    const inventoryMap = new Map<string, InventoryItem>();
    const inventoryNameMap = new Map<string, InventoryItem>();

    currentInventory.forEach((item) => {
      inventoryMap.set(item.id, { ...item });
      inventoryNameMap.set(normalizeText(item.name), item);
    });

    const appliedSummary: string[] = [];

    validPurchases.forEach((purchased) => {
      // Find existing item by id or normalized name
      let existing: InventoryItem | undefined = purchased.inventoryItemId
        ? inventoryMap.get(purchased.inventoryItemId)
        : undefined;

      if (!existing) {
        const normName = normalizeText(purchased.name);
        existing = inventoryNameMap.get(normName);
        if (!existing) {
          // Partial search
          for (const item of inventoryMap.values()) {
            const itemNorm = normalizeText(item.name);
            if (itemNorm === normName || itemNorm.includes(normName) || normName.includes(itemNorm)) {
              existing = item;
              break;
            }
          }
        }
      }

      // Parse purchased quantity
      const purchasedQtyParsed = parseQuantityString(
        purchased.purchasedQuantity
          ? `${purchased.purchasedQuantity} ${purchased.unit || ''}`
          : purchased.quantityText || (purchased.suggestedQuantity ? `${purchased.suggestedQuantity} ${purchased.unit || ''}` : '')
      );

      if (!existing) {
        // CASE 1: Brand new item to inventory
        const newId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newItem: InventoryItem = {
          id: newId,
          name: purchased.name,
          category: purchased.category || 'otros',
          status: 'tengo',
          priority: 'normal',
          location: getDefaultLocationByCategory(purchased.category),
          approximateQuantity: purchasedQtyParsed.raw || purchased.quantityText || undefined,
          unitDemo: purchasedQtyParsed.unit,
          quantityDemo: purchasedQtyParsed.numeric !== undefined ? purchasedQtyParsed.numeric.toString() : undefined,
          confidence: 'confirmed',
          source: 'shopping_purchase' as any,
          updatedAt: new Date().toISOString(),
        };

        inventoryMap.set(newId, newItem);
        inventoryNameMap.set(normalizeText(purchased.name), newItem);
        appliedSummary.push(`Agregado a Mi Cocina: ${purchased.name} (${purchased.quantityText || 'Tengo'})`);
      } else {
        // CASE 2: Item exists in inventory
        const existingQtyParsed = existing.quantityDemo
          ? { numeric: parseFloat(existing.quantityDemo), unit: existing.unitDemo, raw: existing.approximateQuantity || '' }
          : parseQuantityString(existing.approximateQuantity);

        // Check if both quantities are known numbers with compatible units
        const canMergeNumerically =
          existingQtyParsed.numeric !== undefined &&
          purchasedQtyParsed.numeric !== undefined &&
          areUnitsCompatible(existingQtyParsed.unit, purchasedQtyParsed.unit);

        if (canMergeNumerically) {
          // Compatible numerical merge
          const combinedNumeric = existingQtyParsed.numeric! + purchasedQtyParsed.numeric!;
          const unit = purchasedQtyParsed.unit || existingQtyParsed.unit;
          const formatted = formatQuantity(combinedNumeric, unit);

          const updated: InventoryItem = {
            ...existing,
            status: 'tengo',
            priority: 'normal',
            approximateQuantity: formatted,
            quantityDemo: combinedNumeric.toString(),
            unitDemo: unit,
            confidence: 'confirmed',
            source: 'shopping_purchase' as any,
            updatedAt: new Date().toISOString(),
          };

          inventoryMap.set(existing.id, updated);
          appliedSummary.push(
            `Stock actualizado: ${existing.name} (${formatQuantity(existingQtyParsed.numeric, unit)} + ${formatQuantity(purchasedQtyParsed.numeric, unit)} → ${formatted})`
          );
        } else {
          // Incompatible / uncertain merge (e.g. was 'queda poco' or undefined quantity)
          // Do NOT invent fake previous quantity! Set to Tengo with the new purchased amount known.
          const updated: InventoryItem = {
            ...existing,
            status: 'tengo',
            priority: 'normal',
            approximateQuantity: purchasedQtyParsed.raw || purchased.quantityText || existing.approximateQuantity || 'En stock',
            quantityDemo: purchasedQtyParsed.numeric !== undefined ? purchasedQtyParsed.numeric.toString() : existing.quantityDemo,
            unitDemo: purchasedQtyParsed.unit || existing.unitDemo,
            confidence: 'confirmed',
            source: 'shopping_purchase' as any,
            updatedAt: new Date().toISOString(),
          };

          inventoryMap.set(existing.id, updated);
          appliedSummary.push(
            `Disponibilidad repuesta a 'Tengo': ${existing.name} (${purchased.quantityText || 'En stock'})`
          );
        }
      }
    });

    return {
      updatedInventory: Array.from(inventoryMap.values()),
      appliedSummary,
      itemsAppliedCount: validPurchases.length,
    };
  }
}

export const inventoryMergeService = new InventoryMergeService();
