import {
  PlannedMeal,
  Recipe,
  InventoryItem,
  ShoppingNeed,
  NeedSuggestedAction,
  IngredientAvailability,
} from '../types/domain';

// Helper to normalize strings for comparison
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface ParsedQuantity {
  numeric?: number;
  unit?: string;
  raw: string;
}

// Parse quantities like "200 g", "500g", "2 unidades", "~350 g", "1 lata", "1 atado", "media botella"
export function parseQuantityString(qtyStr?: string): ParsedQuantity {
  if (!qtyStr) return { raw: '' };
  const clean = qtyStr.trim();

  // Match numbers like 200, 350, 1.5, 2
  const match = clean.match(/(?:~|aprox\.?\s*)?(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)?/i);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    let unit = match[2]?.toLowerCase() || '';

    // Standardize common units
    if (unit === 'g' || unit === 'gr' || unit === 'gramos' || unit === 'g.') unit = 'g';
    else if (unit === 'kg' || unit === 'kilos' || unit === 'kilo' || unit === 'kg.') unit = 'kg';
    else if (unit === 'ml' || unit === 'cm3') unit = 'ml';
    else if (unit === 'l' || unit === 'litro' || unit === 'litros') unit = 'L';
    else if (unit.startsWith('unidad') || unit === 'u' || unit === 'u.') unit = 'unidades';
    else if (unit.startsWith('lata')) unit = 'latas';
    else if (unit.startsWith('atado')) unit = 'atado';
    else if (unit.startsWith('paquete')) unit = 'paquete';
    else if (unit.startsWith('rodaja')) unit = 'rodajas';

    return {
      numeric: isNaN(num) ? undefined : num,
      unit: unit || undefined,
      raw: clean,
    };
  }

  return { raw: clean };
}

export function areUnitsCompatible(unitA?: string, unitB?: string): boolean {
  if (!unitA && !unitB) return true;
  if (!unitA || !unitB) return false;
  const a = unitA.toLowerCase();
  const b = unitB.toLowerCase();
  if (a === b) return true;
  if ((a === 'g' && b === 'g') || (a === 'kg' && b === 'kg')) return true;
  if ((a === 'ml' && b === 'ml') || (a === 'l' && b === 'l')) return true;
  if (a.startsWith('unidad') && b.startsWith('unidad')) return true;
  return false;
}

export function formatQuantity(numeric?: number, unit?: string, fallbackRaw?: string): string {
  if (numeric !== undefined) {
    const formattedNum = Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(1).replace('.0', '');
    return unit ? `${formattedNum} ${unit}` : formattedNum;
  }
  return fallbackRaw || '';
}

export function calculateShoppingNeeds(
  plannedMeals: PlannedMeal[],
  recipes: Recipe[],
  inventory: InventoryItem[]
): ShoppingNeed[] {
  // Only process active planned meals
  const activeMeals = plannedMeals.filter((m) => m.status === 'planned');
  if (activeMeals.length === 0) return [];

  const recipeMap = new Map<string, Recipe>();
  recipes.forEach((r) => recipeMap.set(r.id, r));

  const inventoryById = new Map<string, InventoryItem>();
  const inventoryByName = new Map<string, InventoryItem>();
  inventory.forEach((item) => {
    inventoryById.set(item.id, item);
    inventoryByName.set(normalizeText(item.name), item);
  });

  // Helper to find matching inventory item
  function findInventoryItem(ingName: string, inventoryItemId?: string): InventoryItem | undefined {
    if (inventoryItemId && inventoryById.has(inventoryItemId)) {
      return inventoryById.get(inventoryItemId);
    }
    const norm = normalizeText(ingName);
    if (inventoryByName.has(norm)) {
      return inventoryByName.get(norm);
    }
    // Partial inclusion match
    for (const item of inventory) {
      const itemNorm = normalizeText(item.name);
      if (itemNorm.includes(norm) || norm.includes(itemNorm)) {
        return item;
      }
    }
    return undefined;
  }

  // Aggregate requirements by normalized ingredient key
  interface AggregatedRequirement {
    key: string;
    ingredientName: string;
    inventoryItemId?: string;
    totalNumeric?: number;
    unit?: string;
    fallbackRaws: string[];
    isCore: boolean;
    plannedMealIds: string[];
    plannedMealTitles: string[];
  }

  const requirementsMap = new Map<string, AggregatedRequirement>();

  activeMeals.forEach((meal) => {
    const recipe = meal.recipeId ? recipeMap.get(meal.recipeId) : null;
    const mealTitle = `${meal.recipeName} (${meal.day === 'hoy' ? 'Hoy' : meal.day === 'manana' ? 'Mañana' : 'Próximos días'} ${meal.mealMoment})`;

    if (recipe) {
      // Standard recipe base is 2 servings. Scale factor is servings / 2.
      // If recipe is single serving or not specified, factor = meal.servings / 2
      const servingsScale = (meal.servings || 2) / 2;

      recipe.ingredients.forEach((ing) => {
        // Skip purely optional generic seasonings like "Aceite de oliva y sal" without inventory mapping
        if (ing.optional && !ing.inventoryItemId) return;

        const matchedInv = findInventoryItem(ing.name, ing.inventoryItemId);
        const aggKey = matchedInv ? matchedInv.id : normalizeText(ing.name);

        const parsed = ing.quantityNumeric !== undefined
          ? { numeric: ing.quantityNumeric, unit: ing.unit, raw: ing.quantityDemo || '' }
          : parseQuantityString(ing.quantityDemo);

        const scaledNumeric = parsed.numeric !== undefined ? parsed.numeric * servingsScale : undefined;

        if (!requirementsMap.has(aggKey)) {
          requirementsMap.set(aggKey, {
            key: aggKey,
            ingredientName: matchedInv?.name || ing.name,
            inventoryItemId: matchedInv?.id || ing.inventoryItemId,
            totalNumeric: scaledNumeric,
            unit: parsed.unit,
            fallbackRaws: parsed.raw ? [parsed.raw] : [],
            isCore: ing.isCore,
            plannedMealIds: [meal.id],
            plannedMealTitles: [mealTitle],
          });
        } else {
          const current = requirementsMap.get(aggKey)!;
          if (!current.plannedMealIds.includes(meal.id)) {
            current.plannedMealIds.push(meal.id);
            current.plannedMealTitles.push(mealTitle);
          }
          if (scaledNumeric !== undefined && current.totalNumeric !== undefined && areUnitsCompatible(current.unit, parsed.unit)) {
            current.totalNumeric += scaledNumeric;
          } else if (scaledNumeric !== undefined && current.totalNumeric === undefined) {
            current.totalNumeric = scaledNumeric;
            current.unit = parsed.unit;
          }
          if (parsed.raw) {
            current.fallbackRaws.push(parsed.raw);
          }
        }
      });
    } else {
      // Custom manual planned meal without recipe template
      const aggKey = normalizeText(meal.recipeName);
      if (!requirementsMap.has(aggKey)) {
        requirementsMap.set(aggKey, {
          key: aggKey,
          ingredientName: meal.recipeName,
          fallbackRaws: [],
          isCore: true,
          plannedMealIds: [meal.id],
          plannedMealTitles: [mealTitle],
        });
      }
    }
  });

  // Evaluate each requirement against inventory
  const needs: ShoppingNeed[] = [];

  requirementsMap.forEach((req) => {
    const invItem = findInventoryItem(req.ingredientName, req.inventoryItemId);
    const invStatus: IngredientAvailability = invItem ? invItem.status : 'no_tengo';
    const isAvail = invStatus === 'tengo' || invStatus === 'available';
    const isLow = invStatus === 'queda_poco' || invStatus === 'low';
    const isUnknown = invStatus === 'desconocido' || invStatus === 'unknown';
    const isPriority =
      invItem?.priority === 'prioritario' ||
      invItem?.priority === 'priority' ||
      invItem?.priority === 'consumir_pronto' ||
      invItem?.priority === 'consumeSoon' ||
      invItem?.priority === 'consume_soon';

    // Parse inventory quantity if available
    const parsedInvQty = invItem?.quantityDemo
      ? { numeric: parseFloat(invItem.quantityDemo), unit: invItem.unitDemo, raw: invItem.approximateQuantity || '' }
      : parseQuantityString(invItem?.approximateQuantity);

    const formattedRequired = formatQuantity(req.totalNumeric, req.unit, req.fallbackRaws.join(' + '));
    const mealsCount = req.plannedMealIds.length;
    const mealsDesc = mealsCount === 1 ? req.plannedMealTitles[0] : `${mealsCount} comidas planificadas (${req.plannedMealTitles.join(', ')})`;

    let action: NeedSuggestedAction = 'comprar';
    let reason = '';
    let suggestedQuantity = req.totalNumeric;
    let suggestedQuantityText = formattedRequired;

    if (isAvail) {
      // Available in stock
      if (isPriority) {
        action = 'cubierto';
        reason = `Aprovechando ingrediente prioritario disponible en Mi Cocina (${invItem?.approximateQuantity || 'en stock'})`;
        suggestedQuantity = undefined;
        suggestedQuantityText = undefined;
      } else if (
        req.totalNumeric !== undefined &&
        parsedInvQty.numeric !== undefined &&
        areUnitsCompatible(req.unit, parsedInvQty.unit)
      ) {
        if (parsedInvQty.numeric >= req.totalNumeric) {
          action = 'cubierto';
          reason = `Cubierto por stock en Mi Cocina (tenés ${formatQuantity(parsedInvQty.numeric, parsedInvQty.unit)})`;
          suggestedQuantity = undefined;
          suggestedQuantityText = undefined;
        } else {
          // Partial stock
          action = 'probablemente_comprar';
          const deficit = req.totalNumeric - parsedInvQty.numeric;
          suggestedQuantity = deficit;
          suggestedQuantityText = formatQuantity(deficit, req.unit);
          reason = `Tenés ${formatQuantity(parsedInvQty.numeric, parsedInvQty.unit)} en Mi Cocina; necesitás ${formattedRequired} para tus comidas (faltan aprox. ${suggestedQuantityText})`;
        }
      } else {
        // Stock is available without numeric breakdown -> assume covered to avoid overbuying
        action = 'cubierto';
        reason = `Disponible en Mi Cocina (${invItem?.approximateQuantity || 'Tengo'})`;
        suggestedQuantity = undefined;
        suggestedQuantityText = undefined;
      }
    } else if (isLow) {
      action = 'probablemente_comprar';
      reason = `Te queda poco en Mi Cocina (${invItem?.approximateQuantity || 'Queda poco'}); conviene reponer para ${mealsDesc}`;
    } else if (isUnknown) {
      action = 'revisar_en_casa';
      reason = `Stock sin confirmar en Mi Cocina: revisar antes de comprar si alcanza para ${mealsDesc}`;
    } else {
      // no_tengo or missing
      action = 'comprar';
      reason = `No figura disponible en Mi Cocina; necesario para ${mealsDesc}`;
    }

    needs.push({
      id: `need_${req.key}`,
      ingredientName: req.ingredientName,
      inventoryItemId: invItem?.id || req.inventoryItemId,
      totalRequiredQuantity: req.totalNumeric,
      unit: req.unit,
      formattedRequired: formattedRequired || undefined,
      inventoryStatus: invStatus,
      inventoryQuantity: parsedInvQty.numeric,
      inventoryQuantityRaw: invItem?.approximateQuantity,
      inventoryPriority: invItem?.priority,
      suggestedAction: action,
      reason,
      plannedMealIds: req.plannedMealIds,
      plannedMealTitles: req.plannedMealTitles,
      suggestedQuantity,
      suggestedQuantityText,
    });
  });

  return needs;
}

export const shoppingNeedsService = {
  calculateShoppingNeeds,
  areUnitsCompatible,
  parseQuantityString,
  formatQuantity,
  normalizeText,
};

