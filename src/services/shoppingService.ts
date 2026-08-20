import { ShoppingItem, ShoppingNeed, InventoryItem } from '../types/domain';
import { normalizeText } from './shoppingNeedsService';

export class ShoppingService {
  /**
   * Merges calculated needs with the current active shopping list.
   * Preserves manual items and existing user overrides on suggested items.
   */
  public generateShoppingListFromNeeds(
    needs: ShoppingNeed[],
    existingList: ShoppingItem[],
    inventory: InventoryItem[]
  ): ShoppingItem[] {
    const existingById = new Map<string, ShoppingItem>();
    const existingByName = new Map<string, ShoppingItem>();

    existingList.forEach((item) => {
      existingById.set(item.id, item);
      existingByName.set(normalizeText(item.name), item);
    });

    const inventoryById = new Map<string, InventoryItem>();
    inventory.forEach((i) => inventoryById.set(i.id, i));

    const resultList: ShoppingItem[] = [];
    const processedKeys = new Set<string>();

    // 1. Process active needs (comprar, probablemente_comprar, revisar_en_casa)
    const actionableNeeds = needs.filter((n) => n.suggestedAction !== 'cubierto');

    actionableNeeds.forEach((need) => {
      const normName = normalizeText(need.ingredientName);
      const existing = existingByName.get(normName);
      const inv = need.inventoryItemId ? inventoryById.get(need.inventoryItemId) : undefined;

      processedKeys.add(normName);

      if (existing) {
        // Update reason and suggested values while preserving user-entered overrides & status
        resultList.push({
          ...existing,
          suggestedQuantity: need.suggestedQuantity,
          unit: existing.unit || need.unit,
          quantityText: existing.finalPlannedQuantity
            ? `${existing.finalPlannedQuantity} ${existing.unit || need.unit || ''}`.trim()
            : existing.quantityText || need.suggestedQuantityText,
          reason: need.reason,
          needLevel: need.suggestedAction,
          inventoryItemId: need.inventoryItemId || existing.inventoryItemId,
          category: existing.category || inv?.category || 'otros',
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new suggested shopping item
        resultList.push({
          id: `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: need.ingredientName,
          category: inv?.category || 'otros',
          suggestedQuantity: need.suggestedQuantity,
          finalPlannedQuantity: need.suggestedQuantity,
          unit: need.unit,
          quantityText: need.suggestedQuantityText,
          reason: need.reason,
          origin: 'suggested',
          status: 'pending',
          needLevel: need.suggestedAction,
          inventoryItemId: need.inventoryItemId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    // 2. Preserve manually added items and previously accepted suggested items that are still pending/purchased
    existingList.forEach((item) => {
      const normName = normalizeText(item.name);
      if (!processedKeys.has(normName)) {
        // If it was a suggested item and now its need is 'cubierto', keep it if user already marked it as have or purchased,
        // or if it was manually added by user.
        if (item.origin === 'manual' || item.status === 'purchased' || item.status === 'marked_have') {
          resultList.push(item);
        }
      }
    });

    return resultList;
  }

  /**
   * Creates a new manual shopping item.
   */
  public createManualItem(params: {
    name: string;
    quantityText?: string;
    category?: InventoryItem['category'];
    inventoryItemId?: string;
  }): ShoppingItem {
    return {
      id: `shop_man_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: params.name.trim(),
      category: params.category || 'otros',
      quantityText: params.quantityText?.trim() || undefined,
      reason: 'Agregado manualmente a tu lista de compra',
      origin: 'manual',
      status: 'pending',
      inventoryItemId: params.inventoryItemId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const shoppingService = new ShoppingService();
