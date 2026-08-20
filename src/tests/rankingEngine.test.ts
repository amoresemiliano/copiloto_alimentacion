import { describe, it, expect } from 'vitest';
import {
  rankRecipes,
  scoreTimeFit,
  scoreEffortFit,
  evaluateInventoryAndUtilization,
  scoreRecentVariety,
} from '../services/rankingEngine';
import { INITIAL_RECIPES, INITIAL_INVENTORY_ITEMS } from '../data/fixtures';
import { UserContext, MealEvent, InventoryItem } from '../types/domain';

const BASE_CONTEXT: UserContext = {
  moment: 'almuerzo',
  hunger: 'normal',
  energy: 'normal',
  timeLimit: '30min',
  motivation: 'normales',
  priority: 'automatico',
  lastUpdated: new Date().toISOString(),
};

describe('Motor de Recomendación Determinístico - Copiloto de Alimentación', () => {
  it('Escenario A: Usuario con 15 minutos disponibles beneficia a recetas rápidas frente a recetas largas', () => {
    const context15m: UserContext = {
      ...BASE_CONTEXT,
      timeLimit: '15min',
    };

    const fastRecipe = INITIAL_RECIPES.find((r) => r.prepTimeMinutes <= 15)!; // Tortilla (14m) or Bowl (10m)
    const slowRecipe = INITIAL_RECIPES.find((r) => r.prepTimeMinutes >= 45)!; // Guiso (48m)

    const scoreFast = scoreTimeFit(fastRecipe, context15m);
    const scoreSlow = scoreTimeFit(slowRecipe, context15m);

    expect(scoreFast).toBeGreaterThan(0.9);
    expect(scoreSlow).toBeLessThan(0.15);

    const rankings = rankRecipes(INITIAL_RECIPES, context15m, INITIAL_INVENTORY_ITEMS, []);
    const fastRank = rankings.find((r) => r.recipe.id === fastRecipe.id)!.rank;
    const slowRank = rankings.find((r) => r.recipe.id === slowRecipe.id)!.rank;

    expect(fastRank).toBeLessThan(slowRank);
  });

  it('Escenario B: Energía baja + ganas mínimas de cocinar penaliza recetas complejas', () => {
    const lowEnergyContext: UserContext = {
      ...BASE_CONTEXT,
      energy: 'baja',
      motivation: 'minimas',
    };

    const simpleRecipe = INITIAL_RECIPES.find((r) => r.complexity === 'muy_baja')!;
    const complexRecipe = INITIAL_RECIPES.find((r) => r.complexity === 'alta')!;

    const scoreSimple = scoreEffortFit(simpleRecipe, lowEnergyContext);
    const scoreComplex = scoreEffortFit(complexRecipe, lowEnergyContext);

    expect(scoreSimple).toBe(1.0);
    expect(scoreComplex).toBeLessThan(0.15);

    const rankings = rankRecipes(INITIAL_RECIPES, lowEnergyContext, INITIAL_INVENTORY_ITEMS, []);
    const simpleRank = rankings.find((r) => r.recipe.id === simpleRecipe.id)!.rank;
    const complexRank = rankings.find((r) => r.recipe.id === complexRecipe.id)!.rank;

    expect(simpleRank).toBeLessThan(complexRank);
  });

  it('Escenario C: Ingrediente prioritario mejora ranking de receta compatible', () => {
    // Inventory with Espinaca as prioritario
    const inventoryWithPriority: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) => {
      if (item.name.toLowerCase().includes('espinaca')) {
        return { ...item, priority: 'prioritario', status: 'tengo' };
      }
      return { ...item, priority: 'normal' };
    });

    // Inventory without priority (all normal)
    const inventoryNormal: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) => ({
      ...item,
      priority: 'normal',
    }));

    const espinacaRecipe = INITIAL_RECIPES.find((r) =>
      r.ingredients.some((ing) => ing.name.toLowerCase().includes('espinaca'))
    )!;

    const rankWithPriority = rankRecipes(
      INITIAL_RECIPES,
      BASE_CONTEXT,
      inventoryWithPriority,
      []
    ).find((r) => r.recipe.id === espinacaRecipe.id)!;

    const rankNormal = rankRecipes(
      INITIAL_RECIPES,
      BASE_CONTEXT,
      inventoryNormal,
      []
    ).find((r) => r.recipe.id === espinacaRecipe.id)!;

    expect(rankWithPriority.totalScore).toBeGreaterThan(rankNormal.totalScore);
    expect(rankWithPriority.priorityIngredientsUsed.length).toBeGreaterThan(0);
  });

  it('Escenario D: Repetición reciente penaliza variedad', () => {
    const pastaRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_pasta_tomate_queso')!;

    const recentMealsToday: MealEvent[] = [
      {
        id: 'recent_1',
        timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(), // 2 hours ago
        mealMoment: 'almuerzo',
        selectedRecipeId: pastaRecipe.id,
        recipeName: pastaRecipe.name,
        wasSuggested: true,
      },
    ];

    const varietyRecent = scoreRecentVariety(pastaRecipe, recentMealsToday);
    const varietyFresh = scoreRecentVariety(pastaRecipe, []);

    expect(varietyRecent.score).toBeLessThanOrEqual(0.2);
    expect(varietyFresh.score).toBe(1.0);

    const rankRecent = rankRecipes(
      INITIAL_RECIPES,
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      recentMealsToday
    ).find((r) => r.recipe.id === pastaRecipe.id)!;

    const rankFresh = rankRecipes(
      INITIAL_RECIPES,
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      []
    ).find((r) => r.recipe.id === pastaRecipe.id)!;

    expect(rankFresh.totalScore).toBeGreaterThan(rankRecent.totalScore);
  });

  it('Escenario E: Receta con ingredientes disponibles supera a una con faltantes principales', () => {
    // Pastel de carne has 'Carne vacuna picada' with status 'no_tengo'
    const pastelRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_pastel_carne_horno')!;
    const tortillaRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_tortilla_zucchini')!;

    const pastelInv = evaluateInventoryAndUtilization(pastelRecipe, INITIAL_INVENTORY_ITEMS);
    const tortillaInv = evaluateInventoryAndUtilization(tortillaRecipe, INITIAL_INVENTORY_ITEMS);

    expect(pastelInv.missingCoreIngredients.length).toBeGreaterThan(0);
    expect(tortillaInv.missingCoreIngredients.length).toBe(0);
    expect(tortillaInv.score).toBeGreaterThan(pastelInv.score);

    const rankings = rankRecipes(
      INITIAL_RECIPES,
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      []
    );

    const tortillaRank = rankings.find((r) => r.recipe.id === tortillaRecipe.id)!.rank;
    const pastelRank = rankings.find((r) => r.recipe.id === pastelRecipe.id)!.rank;

    expect(tortillaRank).toBeLessThan(pastelRank);
  });

  it('Escenario F: Cambio de prioridad a "Rápido" reordena hacia recetas inmediatas', () => {
    const autoContext: UserContext = {
      ...BASE_CONTEXT,
      timeLimit: '30min',
      priority: 'automatico',
    };

    const fastPriorityContext: UserContext = {
      ...BASE_CONTEXT,
      timeLimit: '30min',
      priority: 'rapido',
    };

    const autoRankings = rankRecipes(INITIAL_RECIPES, autoContext, INITIAL_INVENTORY_ITEMS, []);
    const fastRankings = rankRecipes(INITIAL_RECIPES, fastPriorityContext, INITIAL_INVENTORY_ITEMS, []);

    // The fastest recipe gets a higher score or better rank in fast priority
    const fastestRecipe = INITIAL_RECIPES.reduce((min, r) =>
      r.prepTimeMinutes < min.prepTimeMinutes ? r : min
    );

    const scoreAuto = autoRankings.find((r) => r.recipe.id === fastestRecipe.id)!.totalScore;
    const scoreFast = fastRankings.find((r) => r.recipe.id === fastestRecipe.id)!.totalScore;

    expect(scoreFast).toBeGreaterThanOrEqual(scoreAuto);
  });

  it('Escenario G: Estado de inventario disponible permite receta completa; no disponible genera faltante', () => {
    const testRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_tortilla_zucchini')!;
    const invAvailable: InventoryItem[] = [
      { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'available', priority: 'normal', updatedAt: '' },
      { id: 'inv_zucchini', name: 'Zucchini / Calabacín', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
      { id: 'inv_queso', name: 'Queso cremoso / mozzarella', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', updatedAt: '' },
    ];
    const invUnavailable: InventoryItem[] = [
      { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'unavailable', priority: 'normal', updatedAt: '' },
      { id: 'inv_zucchini', name: 'Zucchini / Calabacín', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
      { id: 'inv_queso', name: 'Queso cremoso / mozzarella', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', updatedAt: '' },
    ];

    const evalAvail = evaluateInventoryAndUtilization(testRecipe, invAvailable);
    const evalUnavail = evaluateInventoryAndUtilization(testRecipe, invUnavailable);

    expect(evalAvail.missingCoreIngredients.length).toBe(0);
    expect(evalUnavail.missingCoreIngredients.length).toBeGreaterThan(0);
    expect(evalAvail.score).toBeGreaterThan(evalUnavail.score);
  });

  it('Escenario H: Ingrediente marcado como consumir pronto mejora score y genera señal de aprovechamiento', () => {
    const espinacaRec = INITIAL_RECIPES.find((r) => r.ingredients.some((i) => i.name.toLowerCase().includes('espinaca')))!;
    const invNormal: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) => ({ ...item, priority: 'normal' as const }));
    const invConsumeSoon: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
      item.name.toLowerCase().includes('espinaca')
        ? { ...item, priority: 'consume_soon' as const, status: 'tengo' as const }
        : { ...item, priority: 'normal' as const }
    );

    const rankNormal = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, invNormal, []).find((r) => r.recipe.id === espinacaRec.id)!;
    const rankConsumeSoon = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, invConsumeSoon, []).find((r) => r.recipe.id === espinacaRec.id)!;

    expect(rankConsumeSoon.totalScore).toBeGreaterThan(rankNormal.totalScore);
    expect(rankConsumeSoon.priorityIngredientsUsed.length).toBeGreaterThan(0);
  });

  it('Escenario I: Ingrediente prioritario genera mayor o igual impulso que consumir pronto', () => {
    const espinacaRec = INITIAL_RECIPES.find((r) => r.ingredients.some((i) => i.name.toLowerCase().includes('espinaca')))!;
    const invNormal: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) => ({ ...item, priority: 'normal' as const }));
    const invConsumeSoon: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
      item.name.toLowerCase().includes('espinaca')
        ? { ...item, priority: 'consumir_pronto' as const, status: 'tengo' as const }
        : { ...item, priority: 'normal' as const }
    );
    const invTopPriority: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
      item.name.toLowerCase().includes('espinaca')
        ? { ...item, priority: 'prioritario' as const, status: 'tengo' as const }
        : { ...item, priority: 'normal' as const }
    );

    const rankNormal = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, invNormal, []).find((r) => r.recipe.id === espinacaRec.id)!;
    const rankConsumeSoon = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, invConsumeSoon, []).find((r) => r.recipe.id === espinacaRec.id)!;
    const rankTopPriority = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, invTopPriority, []).find((r) => r.recipe.id === espinacaRec.id)!;

    expect(rankTopPriority.totalScore).toBeGreaterThanOrEqual(rankConsumeSoon.totalScore);
    expect(rankTopPriority.totalScore).toBeGreaterThan(rankNormal.totalScore);
  });

  it('Escenario J: No dominancia - la urgencia temporal prevalece sobre el aprovechamiento', () => {
    const tightContext: UserContext = { ...BASE_CONTEXT, timeLimit: '15min' };
    const slowRecipe = INITIAL_RECIPES.find((r) => r.prepTimeMinutes >= 45)!;
    const fastRecipe = INITIAL_RECIPES.find((r) => r.prepTimeMinutes <= 15)!;

    // Make slow recipe ingredients top priority
    const invPrioritySlow: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
      slowRecipe.ingredients.some((ing) => ing.name.toLowerCase().includes(item.name.toLowerCase()))
        ? { ...item, priority: 'prioritario' as const, status: 'tengo' as const }
        : item
    );

    const ranks = rankRecipes(INITIAL_RECIPES, tightContext, invPrioritySlow, []);
    const fastRank = ranks.find((r) => r.recipe.id === fastRecipe.id)!.rank;
    const slowRank = ranks.find((r) => r.recipe.id === slowRecipe.id)!.rank;

    expect(fastRank).toBeLessThan(slowRank);
  });

  it('Escenario K: Estado sin confirmar / desconocido no castiga severamente como no_tengo', () => {
    const testRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_tortilla_zucchini')!;
    const invUnknown: InventoryItem[] = [
      { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'unknown', priority: 'normal', updatedAt: '' },
      { id: 'inv_zucchini', name: 'Zucchini / Calabacín', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
      { id: 'inv_queso', name: 'Queso cremoso / mozzarella', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', updatedAt: '' },
    ];
    const invMissing: InventoryItem[] = [
      { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'no_tengo', priority: 'normal', updatedAt: '' },
      { id: 'inv_zucchini', name: 'Zucchini / Calabacín', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
      { id: 'inv_queso', name: 'Queso cremoso / mozzarella', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', updatedAt: '' },
    ];

    const evalUnknown = evaluateInventoryAndUtilization(testRecipe, invUnknown);
    const evalMissing = evaluateInventoryAndUtilization(testRecipe, invMissing);

    expect(evalUnknown.score).toBeGreaterThan(evalMissing.score);
  });

  it('Escenario M: Genera explicaciones transparentes cuando se aprovechan ingredientes', () => {
    const espinacaRec = INITIAL_RECIPES.find((r) => r.ingredients.some((i) => i.name.toLowerCase().includes('espinaca')))!;
    const invWithPriority: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
      item.name.toLowerCase().includes('espinaca')
        ? { ...item, priority: 'consumir_pronto' as const, status: 'tengo' as const }
        : { ...item, priority: 'normal' as const }
    );

    const ranking = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, invWithPriority, []).find(
      (r) => r.recipe.id === espinacaRec.id
    )!;

    expect(ranking.positiveReasons.some((r) => r.toLowerCase().includes('aprovecha') || r.toLowerCase().includes('espinaca'))).toBe(true);
  });
});
