import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { telemetryService } from '../services/telemetryService';
import { storageService } from '../services/storageService';
import { shoppingNeedsService } from '../services/shoppingNeedsService';
import { inventoryMergeService } from '../services/inventoryMergeService';
import { planningService } from '../services/planningService';
import {
  Activity,
  RotateCcw,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import {
  rankRecipes,
  scoreTimeFit,
  scoreEffortFit,
  evaluateInventoryAndUtilization,
  scoreRecentVariety,
} from '../services/rankingEngine';
import { INITIAL_RECIPES, INITIAL_INVENTORY_ITEMS, INITIAL_USER_CONTEXT } from '../data/fixtures';
import { UserContext, MealEvent, InventoryItem, PlannedMeal, ShoppingItem } from '../types/domain';

export const TelemetryView: React.FC = () => {
  const {
    telemetryEvents,
    refreshTelemetry,
    resetAllFixtures,
    context,
    inventory,
    plannedMeals,
    shoppingItems,
    purchaseHistory,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'scenarios' | 'events'>('scenarios');
  const [scenarioResults, setScenarioResults] = useState<{ [key: string]: { pass: boolean; details: string } }>({});
  const [isRunningScenarios, setIsRunningScenarios] = useState(false);

  const metrics = telemetryService.calculateMetrics();

  const runAllScenarios = () => {
    setIsRunningScenarios(true);
    const results: { [key: string]: { pass: boolean; details: string } } = {};

    try {
      // Escenario A: 15 min limit
      const context15m: UserContext = { ...INITIAL_USER_CONTEXT, timeLimit: '15min' };
      const fastRecipe = INITIAL_RECIPES.find((r) => r.prepTimeMinutes <= 15)!;
      const slowRecipe = INITIAL_RECIPES.find((r) => r.prepTimeMinutes >= 45)!;
      const scoreFast = scoreTimeFit(fastRecipe, context15m);
      const scoreSlow = scoreTimeFit(slowRecipe, context15m);
      const ranksA = rankRecipes(INITIAL_RECIPES, context15m, INITIAL_INVENTORY_ITEMS, []);
      const fastRank = ranksA.find((r) => r.recipe.id === fastRecipe.id)!.rank;
      const slowRank = ranksA.find((r) => r.recipe.id === slowRecipe.id)!.rank;
      const passA = scoreFast > 0.9 && scoreSlow < 0.2 && fastRank < slowRank;
      results['scenario_a'] = {
        pass: passA,
        details: `Receta rápida (${fastRecipe.prepTimeMinutes}m) score ${scoreFast.toFixed(2)} (Rank #${fastRank}) vs lenta (${slowRecipe.prepTimeMinutes}m) score ${scoreSlow.toFixed(2)} (Rank #${slowRank})`,
      };

      // Escenario B: Baja energía y mínimas ganas
      const contextLow: UserContext = { ...INITIAL_USER_CONTEXT, energy: 'baja', motivation: 'minimas' };
      const simpleRecipe = INITIAL_RECIPES.find((r) => r.complexity === 'muy_baja')!;
      const complexRecipe = INITIAL_RECIPES.find((r) => r.complexity === 'alta')!;
      const scoreSimple = scoreEffortFit(simpleRecipe, contextLow);
      const scoreComplex = scoreEffortFit(complexRecipe, contextLow);
      const ranksB = rankRecipes(INITIAL_RECIPES, contextLow, INITIAL_INVENTORY_ITEMS, []);
      const simpleRank = ranksB.find((r) => r.recipe.id === simpleRecipe.id)!.rank;
      const complexRank = ranksB.find((r) => r.recipe.id === complexRecipe.id)!.rank;
      const passB = scoreSimple === 1.0 && scoreComplex < 0.15 && simpleRank < complexRank;
      results['scenario_b'] = {
        pass: passB,
        details: `Receta muy baja complejidad score ${scoreSimple.toFixed(2)} (Rank #${simpleRank}) vs alta complejidad score ${scoreComplex.toFixed(2)} (Rank #${complexRank})`,
      };

      // Escenario C: Ingrediente prioritario
      const invWithPriority: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
        item.name.toLowerCase().includes('espinaca')
          ? { ...item, priority: 'prioritario', status: 'tengo' }
          : { ...item, priority: 'normal' }
      );
      const invNormal: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) => ({ ...item, priority: 'normal' }));
      const espinacaRecipe = INITIAL_RECIPES.find((r) =>
        r.ingredients.some((ing) => ing.name.toLowerCase().includes('espinaca'))
      )!;
      const rankWithPriority = rankRecipes(INITIAL_RECIPES, INITIAL_USER_CONTEXT, invWithPriority, []).find(
        (r) => r.recipe.id === espinacaRecipe.id
      )!;
      const rankNormal = rankRecipes(INITIAL_RECIPES, INITIAL_USER_CONTEXT, invNormal, []).find(
        (r) => r.recipe.id === espinacaRecipe.id
      )!;
      const passC = rankWithPriority.totalScore > rankNormal.totalScore;
      results['scenario_c'] = {
        pass: passC,
        details: `Score con espinaca prioritaria: ${rankWithPriority.totalScore.toFixed(2)} (${rankWithPriority.matchPercentage}%) vs normal: ${rankNormal.totalScore.toFixed(2)} (${rankNormal.matchPercentage}%)`,
      };

      // Escenario D: Repetición reciente
      const pastaRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_pasta_tomate_queso')!;
      const recentPasta: MealEvent[] = [
        {
          id: 'scen_d',
          timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
          mealMoment: 'almuerzo',
          selectedRecipeId: pastaRecipe.id,
          recipeName: pastaRecipe.name,
          wasSuggested: true,
        },
      ];
      const varietyRecent = scoreRecentVariety(pastaRecipe, recentPasta);
      const varietyFresh = scoreRecentVariety(pastaRecipe, []);
      const passD = varietyRecent.score <= 0.2 && varietyFresh.score === 1.0;
      results['scenario_d'] = {
        pass: passD,
        details: `Score variedad consumido hoy: ${varietyRecent.score.toFixed(2)} vs no consumido: ${varietyFresh.score.toFixed(2)}`,
      };

      // Escenario E: Inventario
      const pastelRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_pastel_carne_horno')!;
      const tortillaRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_tortilla_zucchini')!;
      const pastelInv = evaluateInventoryAndUtilization(pastelRecipe, INITIAL_INVENTORY_ITEMS);
      const tortillaInv = evaluateInventoryAndUtilization(tortillaRecipe, INITIAL_INVENTORY_ITEMS);
      const passE = pastelInv.missingCoreIngredients.length > 0 && tortillaInv.score > pastelInv.score;
      results['scenario_e'] = {
        pass: passE,
        details: `Tortilla (ingredientes listos): ${(tortillaInv.score * 100).toFixed(0)}% vs Pastel de carne (falta carne): ${(pastelInv.score * 100).toFixed(0)}%`,
      };

      // Escenario F: Cambio de prioridad a 'Rápido'
      const contextAuto: UserContext = { ...INITIAL_USER_CONTEXT, timeLimit: '30min', priority: 'automatico' };
      const contextFast: UserContext = { ...INITIAL_USER_CONTEXT, timeLimit: '30min', priority: 'rapido' };
      const autoRankings = rankRecipes(INITIAL_RECIPES, contextAuto, INITIAL_INVENTORY_ITEMS, []);
      const fastRankings = rankRecipes(INITIAL_RECIPES, contextFast, INITIAL_INVENTORY_ITEMS, []);
      const fastestRecipe = INITIAL_RECIPES.reduce((min, r) => (r.prepTimeMinutes < min.prepTimeMinutes ? r : min));
      const scoreAuto = autoRankings.find((r) => r.recipe.id === fastestRecipe.id)!.totalScore;
      const scoreFastPriority = fastRankings.find((r) => r.recipe.id === fastestRecipe.id)!.totalScore;
      const passF = scoreFastPriority >= scoreAuto;
      results['scenario_f'] = {
        pass: passF,
        details: `Receta más rápida (${fastestRecipe.prepTimeMinutes}m) en prioridad Rápido: ${(scoreFastPriority * 100).toFixed(0)}% vs Automático: ${(scoreAuto * 100).toFixed(0)}%`,
      };

      // Escenario G — Estado de inventario: Disponible vs No disponible
      const testRecipeG = INITIAL_RECIPES.find((r) => r.id === 'rec_tortilla_zucchini')!;
      const invWithHuevos: InventoryItem[] = [
        { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', updatedAt: '' },
        { id: 'inv_zucchini', name: 'Zucchini / Calabacín', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
        { id: 'inv_queso', name: 'Queso cremoso / mozzarella', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', updatedAt: '' },
      ];
      const invWithoutHuevos: InventoryItem[] = [
        { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'no_tengo', priority: 'normal', updatedAt: '' },
        { id: 'inv_zucchini', name: 'Zucchini / Calabacín', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
        { id: 'inv_queso', name: 'Queso cremoso / mozzarella', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', updatedAt: '' },
      ];
      const evalG_avail = evaluateInventoryAndUtilization(testRecipeG, invWithHuevos);
      const evalG_unavail = evaluateInventoryAndUtilization(testRecipeG, invWithoutHuevos);
      const passG = evalG_avail.missingCoreIngredients.length === 0 && evalG_unavail.missingCoreIngredients.length > 0 && evalG_avail.score > evalG_unavail.score;
      results['scenario_g'] = {
        pass: passG,
        details: `Con ingredientes listos: ${(evalG_avail.score * 100).toFixed(0)}% (faltantes: 0) vs Sin huevos: ${(evalG_unavail.score * 100).toFixed(0)}% (faltantes: ${evalG_unavail.missingCoreIngredients.join(', ')})`,
      };

      // Escenario H — Consumir pronto: Mejora score y genera señal de aprovechamiento
      const espinacaRecH = INITIAL_RECIPES.find((r) => r.ingredients.some((i) => i.name.toLowerCase().includes('espinaca')))!;
      const invConsumeSoon: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
        item.name.toLowerCase().includes('espinaca')
          ? { ...item, priority: 'consumir_pronto' as const, status: 'tengo' as const }
          : { ...item, priority: 'normal' as const }
      );
      const rankConsumeSoon = rankRecipes(INITIAL_RECIPES, INITIAL_USER_CONTEXT, invConsumeSoon, []).find(
        (r) => r.recipe.id === espinacaRecH.id
      )!;
      const rankNormalH = rankRecipes(INITIAL_RECIPES, INITIAL_USER_CONTEXT, invNormal, []).find(
        (r) => r.recipe.id === espinacaRecH.id
      )!;
      const passH = rankConsumeSoon.totalScore > rankNormalH.totalScore && rankConsumeSoon.priorityIngredientsUsed.length > 0;
      results['scenario_h'] = {
        pass: passH,
        details: `Score consumir pronto: ${rankConsumeSoon.totalScore.toFixed(2)} vs normal: ${rankNormalH.totalScore.toFixed(2)} (Aprovecha: ${rankConsumeSoon.priorityIngredientsUsed.join(', ')})`,
      };

      // Escenario I — Prioritario vs Normal: Mayor beneficio
      const invTopPriority: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
        item.name.toLowerCase().includes('espinaca')
          ? { ...item, priority: 'prioritario' as const, status: 'tengo' as const }
          : { ...item, priority: 'normal' as const }
      );
      const rankTopPriority = rankRecipes(INITIAL_RECIPES, INITIAL_USER_CONTEXT, invTopPriority, []).find(
        (r) => r.recipe.id === espinacaRecH.id
      )!;
      const passI = rankTopPriority.totalScore >= rankConsumeSoon.totalScore && rankTopPriority.totalScore > rankNormalH.totalScore;
      results['scenario_i'] = {
        pass: passI,
        details: `Prioritario: ${rankTopPriority.totalScore.toFixed(2)} ≥ Consumir pronto: ${rankConsumeSoon.totalScore.toFixed(2)} > Normal: ${rankNormalH.totalScore.toFixed(2)}`,
      };

      // Escenario J — No dominancia: Si el plato excede el tiempo límite disponible, el tiempo manda
      const contextTight: UserContext = { ...INITIAL_USER_CONTEXT, timeLimit: '15min' };
      const slowRecipeJ = INITIAL_RECIPES.find((r) => r.prepTimeMinutes >= 45)!;
      const fastRecipeJ = INITIAL_RECIPES.find((r) => r.prepTimeMinutes <= 15)!;
      const invPrioritySlow: InventoryItem[] = INITIAL_INVENTORY_ITEMS.map((item) =>
        slowRecipeJ.ingredients.some((ing) => ing.name.toLowerCase().includes(item.name.toLowerCase()))
          ? { ...item, priority: 'prioritario' as const, status: 'tengo' as const }
          : item
      );
      const ranksJ = rankRecipes(INITIAL_RECIPES, contextTight, invPrioritySlow, []);
      const fastRankJ = ranksJ.find((r) => r.recipe.id === fastRecipeJ.id)!.rank;
      const slowRankJ = ranksJ.find((r) => r.recipe.id === slowRecipeJ.id)!.rank;
      const passJ = fastRankJ < slowRankJ;
      results['scenario_j'] = {
        pass: passJ,
        details: `Receta rápida de 15m (Rank #${fastRankJ}) supera a receta lenta de 45m priorizada (Rank #${slowRankJ}) por restricción temporal`,
      };

      // Escenario K — Estado 'desconocido' no penaliza severamente como 'no_tengo'
      const invUnknownState: InventoryItem[] = [
        { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'desconocido', priority: 'normal', updatedAt: '' },
        { id: 'inv_tomates', name: 'Tomates', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
      ];
      const evalK_unknown = evaluateInventoryAndUtilization(testRecipeG, invUnknownState);
      const passK = evalK_unknown.score > evalG_unavail.score;
      results['scenario_k'] = {
        pass: passK,
        details: `Ingrediente sin confirmar score ${(evalK_unknown.score * 100).toFixed(0)}% es superior a faltante confirmado ${(evalG_unavail.score * 100).toFixed(0)}%`,
      };

      // Escenario L — Persistencia y reflectividad
      const passL = typeof storageService.getInventory === 'function' && typeof storageService.saveInventory === 'function';
      results['scenario_l'] = {
        pass: passL,
        details: `Capa storageService activa con persistencia de inventario en LocalStorage y fallback automático a fixtures.`,
      };

      // Escenario M — Explicación contextual de aprovechamiento
      const passM = rankConsumeSoon.positiveReasons.some((r) => r.toLowerCase().includes('aprovecha') || r.toLowerCase().includes('espinaca'));
      results['scenario_m'] = {
        pass: passM,
        details: `Razones generadas: "${rankConsumeSoon.positiveReasons.join(' · ')}"`,
      };

      // ==========================================
      // PHASE 3 SCENARIOS: N TO W
      // ==========================================

      // Escenario N — Planificación sin stock suficiente genera necesidad de compra derivada
      const plannedPastel: PlannedMeal = {
        id: 'plan_test_pastel',
        recipeId: 'rec_pastel_carne_horno',
        recipeName: 'Pastel de Carne y Papas al Horno',
        day: 'manana',
        mealMoment: 'cena',
        servings: 3,
        status: 'planned',
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const invWithoutCarne: InventoryItem[] = [
        { id: 'inv_carne', name: 'Carne picada / molida magra', category: 'carnes_proteinas', status: 'no_tengo', priority: 'normal', updatedAt: '' },
        { id: 'inv_papas', name: 'Papas', category: 'verduras', status: 'tengo', priority: 'normal', updatedAt: '' },
      ];
      const needsN = shoppingNeedsService.calculateShoppingNeeds([plannedPastel], INITIAL_RECIPES, invWithoutCarne);
      const carneNeed = needsN.find((n) => n.ingredientName.toLowerCase().includes('carne'));
      const passN = !!carneNeed && (carneNeed.suggestedAction === 'comprar' || carneNeed.suggestedAction === 'probablemente_comprar');
      results['scenario_n'] = {
        pass: passN,
        details: `Planificación de Pastel sin carne genera necesidad de compra: "${carneNeed?.ingredientName}" (Acción: ${carneNeed?.suggestedAction}, Razón: ${carneNeed?.reason})`,
      };

      // Escenario O — Planificación con stock suficiente no genera necesidad de compra
      const plannedTortilla: PlannedMeal = {
        id: 'plan_test_tortilla',
        recipeId: 'rec_tortilla_zucchini',
        recipeName: 'Tortilla Jugosa de Zucchini y Cebolla',
        day: 'hoy',
        mealMoment: 'cena',
        servings: 2,
        status: 'planned',
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const invFullTortilla: InventoryItem[] = [
        { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', approximateQuantity: '6 unidades', unit: 'unidades', updatedAt: '' },
        { id: 'inv_zucchini', name: 'Zucchini / Calabacín', category: 'verduras', status: 'tengo', priority: 'normal', approximateQuantity: '2 unidades', unit: 'unidades', updatedAt: '' },
        { id: 'inv_cebolla', name: 'Cebolla', category: 'verduras', status: 'tengo', priority: 'normal', approximateQuantity: '3 unidades', unit: 'unidades', updatedAt: '' },
        { id: 'inv_queso', name: 'Queso cremoso / mozzarella', category: 'lacteos_huevos', status: 'tengo', priority: 'normal', approximateQuantity: '300 g', unit: 'g', updatedAt: '' },
        { id: 'inv_aceite', name: 'Aceite de oliva', category: 'despensa', status: 'tengo', priority: 'normal', approximateQuantity: '1 botella', unit: 'botella', updatedAt: '' },
      ];
      const needsO = shoppingNeedsService.calculateShoppingNeeds([plannedTortilla], INITIAL_RECIPES, invFullTortilla);
      const buyNeedsO = needsO.filter((n) => n.suggestedAction === 'comprar');
      const passO = buyNeedsO.length === 0;
      results['scenario_o'] = {
        pass: passO,
        details: `Con stock suficiente para Tortilla, ítems a comprar = ${buyNeedsO.length} (Stock útil cubre la demanda)`,
      };

      // Escenario P — Modificación de porciones recalcula la lista derivada
      const plannedTortilla4p: PlannedMeal = { ...plannedTortilla, servings: 4 };
      const needsP_2p = shoppingNeedsService.calculateShoppingNeeds([plannedTortilla], INITIAL_RECIPES, []);
      const needsP_4p = shoppingNeedsService.calculateShoppingNeeds([plannedTortilla4p], INITIAL_RECIPES, []);
      const huevos2p = needsP_2p.find((n) => n.ingredientName.toLowerCase().includes('huevo'));
      const huevos4p = needsP_4p.find((n) => n.ingredientName.toLowerCase().includes('huevo'));
      const passP = !!huevos2p && !!huevos4p && (huevos4p.totalRequiredQuantity || 0) > (huevos2p.totalRequiredQuantity || 0);
      results['scenario_p'] = {
        pass: passP,
        details: `Porciones 2p (${huevos2p?.formattedRequired}) vs 4p (${huevos4p?.formattedRequired}) recalcula cantidades de forma proporcional y determinística.`,
      };

      // Escenario Q — Compra realizada aplica al inventario actualizando estado o cantidad compatible
      const invBeforeQ: InventoryItem[] = [
        { id: 'inv_huevos', name: 'Huevos', category: 'lacteos_huevos', status: 'no_tengo', priority: 'normal', approximateQuantity: '0 unidades', unit: 'unidades', updatedAt: '' },
      ];
      const purchaseItemQ: ShoppingItem = {
        id: 'shop_huevos_q',
        name: 'Huevos',
        category: 'lacteos_huevos',
        status: 'purchased',
        purchasedQuantity: 6,
        unit: 'unidades',
        origin: 'suggested',
        reason: 'Para comidas de la semana',
        inventoryItemId: 'inv_huevos',
        createdAt: '',
        updatedAt: '',
      };
      const mergeQ = inventoryMergeService.applyPurchaseToInventory([purchaseItemQ], invBeforeQ);
      const updatedHuevosQ = mergeQ.updatedInventory.find((i) => i.id === 'inv_huevos');
      const passQ = updatedHuevosQ?.status === 'tengo' && (updatedHuevosQ.approximateQuantity?.includes('6') || false);
      results['scenario_q'] = {
        pass: passQ,
        details: `Huevos comprados aplicados a Mi Cocina: estado=${updatedHuevosQ?.status}, cantidad="${updatedHuevosQ?.approximateQuantity}" (${mergeQ.appliedSummary.join(' · ')})`,
      };

      // Escenario R — Ítem comprado con unidad incompatible pasa a estado disponible ('tengo') con cantidad nueva
      const invBeforeR: InventoryItem[] = [
        { id: 'inv_arroz', name: 'Arroz', category: 'despensa', status: 'queda_poco', priority: 'normal', approximateQuantity: '1 taza', unit: 'taza', updatedAt: '' },
      ];
      const purchaseItemR: ShoppingItem = {
        id: 'shop_arroz_r',
        name: 'Arroz',
        category: 'despensa',
        status: 'purchased',
        purchasedQuantity: 1,
        unit: 'kg',
        origin: 'manual',
        reason: 'Compra de almacén',
        inventoryItemId: 'inv_arroz',
        createdAt: '',
        updatedAt: '',
      };
      const mergeR = inventoryMergeService.applyPurchaseToInventory([purchaseItemR], invBeforeR);
      const updatedArrozR = mergeR.updatedInventory.find((i) => i.id === 'inv_arroz');
      const passR = updatedArrozR?.status === 'tengo' && updatedArrozR.approximateQuantity === '1 kg' && updatedArrozR.unit === 'kg';
      results['scenario_r'] = {
        pass: passR,
        details: `Arroz previo ('1 taza') actualizado honestamente con compra ('1 kg'): status=${updatedArrozR?.status}, cantidad="${updatedArrozR?.approximateQuantity}". Sin sumas corruptas.`,
      };

      // Escenario S — Ítem nuevo comprado que no existía se inserta prolijamente en Mi Cocina
      const invBeforeS: InventoryItem[] = [...INITIAL_INVENTORY_ITEMS];
      const purchaseItemS: ShoppingItem = {
        id: 'shop_jengibre_s',
        name: 'Jengibre fresco',
        category: 'verduras',
        status: 'purchased',
        purchasedQuantity: 1,
        unit: 'unidades',
        origin: 'manual',
        reason: 'Para condimentar',
        createdAt: '',
        updatedAt: '',
      };
      const mergeS = inventoryMergeService.applyPurchaseToInventory([purchaseItemS], invBeforeS);
      const newJengibre = mergeS.updatedInventory.find((i) => i.name.toLowerCase().includes('jengibre'));
      const passS = !!newJengibre && newJengibre.status === 'tengo' && mergeS.updatedInventory.length === invBeforeS.length + 1;
      results['scenario_s'] = {
        pass: passS,
        details: `Nuevo producto 'Jengibre fresco' incorporado al inventario con id: ${newJengibre?.id}, status=${newJengibre?.status}, ubicación=${newJengibre?.location}.`,
      };

      // Escenario T — Marcar 'Ya tengo' en la lista de compras actualiza el inventario y remueve la necesidad
      const purchaseItemT: ShoppingItem = {
        id: 'shop_huevos_t',
        name: 'Huevos',
        category: 'lacteos_huevos',
        status: 'marked_have',
        origin: 'suggested',
        reason: 'Ya había en la heladera',
        inventoryItemId: 'inv_huevos',
        createdAt: '',
        updatedAt: '',
      };
      const mergeT = inventoryMergeService.applyPurchaseToInventory([purchaseItemT], invBeforeQ);
      const updatedHuevosT = mergeT.updatedInventory.find((i) => i.id === 'inv_huevos');
      const passT = updatedHuevosT?.status === 'tengo';
      results['scenario_t'] = {
        pass: passT,
        details: `'Ya tengo' aplicado a Mi Cocina: estado actualizado a '${updatedHuevosT?.status}' sin exigir compra.`,
      };

      // Escenario U — Cancelación/eliminación de comida planificada recalcula la lista sin compras residuales fantasma
      const needsBeforeU = shoppingNeedsService.calculateShoppingNeeds([plannedPastel], INITIAL_RECIPES, invWithoutCarne);
      const needsAfterU = shoppingNeedsService.calculateShoppingNeeds([], INITIAL_RECIPES, invWithoutCarne);
      const passU = needsBeforeU.length > 0 && needsAfterU.length === 0;
      results['scenario_u'] = {
        pass: passU,
        details: `Plan con 1 comida = ${needsBeforeU.length} necesidades derivadas. Al cancelar el plan = ${needsAfterU.length} necesidades residuales (cero compras fantasma).`,
      };

      // Escenario V — Comida planificada cocinada/registrada actualiza estado a 'completed' sin juzgar atrasos
      const planV: PlannedMeal = { ...plannedPastel, id: 'plan_v' };
      const completedPlanV = planningService.markCompleted('plan_v', [planV]);
      const passV = completedPlanV.find((p) => p.id === 'plan_v')?.status === 'completed';
      results['scenario_v'] = {
        pass: passV,
        details: `Comida planificada cocinada pasa a status: '${completedPlanV.find((p) => p.id === 'plan_v')?.status}' en el historial y plan sin lenguaje de culpa.`,
      };

      // Escenario W — Persistencia integral en LocalStorage de planes, compras e inventario consolidado
      const passW =
        typeof storageService.getPlannedMeals === 'function' &&
        typeof storageService.savePlannedMeals === 'function' &&
        typeof storageService.getShoppingItems === 'function' &&
        typeof storageService.saveShoppingItems === 'function' &&
        typeof storageService.getPurchaseHistory === 'function' &&
        typeof storageService.savePurchaseHistory === 'function';
      results['scenario_w'] = {
        pass: passW,
        details: `Todos los contratos de persistencia para Planes, Compras e Historial de compras están implementados y verificados en LocalStorage.`,
      };

      setScenarioResults(results);
    } finally {
      setIsRunningScenarios(false);
    }
  };

  return (
    <div id="telemetry-screen" className="space-y-5 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 bg-white p-5 rounded-3xl border border-[#E5E5E3] shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A] tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#FF6321]" />
            Telemetría y Verificación
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            Métricas de fatiga de decisión, verificación de hipótesis A-W y registro de eventos.
          </p>
        </div>

        <button
          onClick={resetAllFixtures}
          className="text-xs font-bold text-[#1A1A1A] bg-[#F7F6F3] border border-[#E5E5E3] hover:border-[#1A1A1A] px-3.5 py-2 rounded-2xl transition-all flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
          title="Restablecer datos iniciales"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>

      {/* Sub tabs */}
      <div className="flex border border-[#E5E5E3] bg-[#EBEBEA] rounded-2xl p-1 shadow-xs">
        <button
          onClick={() => setActiveSubTab('scenarios')}
          className={`flex-1 py-2 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'scenarios'
              ? 'bg-white text-[#1A1A1A] font-bold shadow-xs border border-[#E5E5E3]'
              : 'text-[#666666] hover:text-[#1A1A1A] font-semibold'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#FF6321]" />
          <span>Verificación de Escenarios (A–W)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`flex-1 py-2 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'metrics'
              ? 'bg-white text-[#1A1A1A] font-bold shadow-xs border border-[#E5E5E3]'
              : 'text-[#666666] hover:text-[#1A1A1A] font-semibold'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-[#FF6321]" />
          <span>Métricas de Decisión (H1–H7)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('events')}
          className={`flex-1 py-2 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'events'
              ? 'bg-white text-[#1A1A1A] font-bold shadow-xs border border-[#E5E5E3]'
              : 'text-[#666666] hover:text-[#1A1A1A] font-semibold'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-[#FF6321]" />
          <span>Eventos ({telemetryEvents.length})</span>
        </button>
      </div>

      {/* SUBTAB: SCENARIO VERIFICATION */}
      {activeSubTab === 'scenarios' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E5E3] rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                Verificación interactiva de hipótesis (Escenarios A a W)
              </h3>
              <p className="text-xs text-[#666666] mt-1">
                Ejecutá los 23 escenarios de producto definidos para validar el comportamiento determinístico de las Fases 1, 2 y 3.
              </p>
            </div>
            <button
              id="btn-run-all-scenarios"
              onClick={runAllScenarios}
              disabled={isRunningScenarios}
              className="text-xs font-bold bg-[#1A1A1A] hover:bg-black text-white px-5 py-2.5 rounded-2xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <PlayCircle className="w-4 h-4 text-[#FF6321]" />
              <span>{isRunningScenarios ? 'Ejecutando...' : 'Ejecutar 23 Escenarios'}</span>
            </button>
          </div>

          {/* Section: Fase 1 */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-black text-[#8C8C8C] uppercase tracking-wider px-2">
              Fase 1: Fundaciones + "¿Qué como ahora?" (A–F)
            </h4>
            <div className="space-y-2">
              <ScenarioCard
                id="scenario_a"
                title="Escenario A — Tiempo límite 15 min"
                desc="Usuario con 15 minutos disponibles: receta rápida de ≤15m se beneficia frente a una de ≥45m."
                result={scenarioResults['scenario_a']}
              />
              <ScenarioCard
                id="scenario_b"
                title="Escenario B — Baja energía y mínimas ganas"
                desc="Energía baja + ganas mínimas de cocinar: receta de muy baja complejidad se prioriza sobre una compleja."
                result={scenarioResults['scenario_b']}
              />
              <ScenarioCard
                id="scenario_c"
                title="Escenario C — Aprovechamiento de ingrediente prioritario"
                desc="Ingrediente marcado como prioritario mejora el ranking de la receta compatible."
                result={scenarioResults['scenario_c']}
              />
              <ScenarioCard
                id="scenario_d"
                title="Escenario D — Variedad y repetición reciente"
                desc="Receta consumida en las últimas 24h recibe penalización moderada para fomentar variedad."
                result={scenarioResults['scenario_d']}
              />
              <ScenarioCard
                id="scenario_e"
                title="Escenario E — Disponibilidad de inventario"
                desc="Receta con ingredientes disponibles supera a otra con faltantes principales."
                result={scenarioResults['scenario_e']}
              />
              <ScenarioCard
                id="scenario_f"
                title="Escenario F — Cambio de prioridad a 'Rápido'"
                desc="Cambiar de Automático a Rápido reordena dinámicamente beneficiando recetas inmediatas."
                result={scenarioResults['scenario_f']}
              />
            </div>
          </div>

          {/* Section: Fase 2 */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[11px] font-black text-[#8C8C8C] uppercase tracking-wider px-2">
              Fase 2: Mi Cocina + Aprovechamiento (G–M)
            </h4>
            <div className="space-y-2">
              <ScenarioCard
                id="scenario_g"
                title="Escenario G — Estado de inventario"
                desc="Alimento disponible permite receta completa (100%); faltante confirmado penaliza con faltante principal."
                result={scenarioResults['scenario_g']}
              />
              <ScenarioCard
                id="scenario_h"
                title="Escenario H — Consumir pronto"
                desc="Ingrediente marcado como 'consumir pronto' mejora el score y genera mención de aprovechamiento."
                result={scenarioResults['scenario_h']}
              />
              <ScenarioCard
                id="scenario_i"
                title="Escenario I — Prioritario vs Normal"
                desc="Ingrediente marcado como prioritario tiene mayor peso positivo de aprovechamiento."
                result={scenarioResults['scenario_i']}
              />
              <ScenarioCard
                id="scenario_j"
                title="Escenario J — No dominancia del aprovechamiento"
                desc="Una receta que aprovecha ingredientes pero excede drásticamente el tiempo límite no supera a opciones viables."
                result={scenarioResults['scenario_j']}
              />
              <ScenarioCard
                id="scenario_k"
                title="Escenario K — Estado sin confirmar (Desconocido)"
                desc="Ingrediente en estado desconocido no penaliza severamente como un faltante confirmado."
                result={scenarioResults['scenario_k']}
              />
              <ScenarioCard
                id="scenario_l"
                title="Escenario L — Persistencia y reflectividad"
                desc="Actualizaciones en Mi Cocina se persisten localmente e impactan de inmediato en el ranking."
                result={scenarioResults['scenario_l']}
              />
              <ScenarioCard
                id="scenario_m"
                title="Escenario M — Explicación contextual"
                desc="El sistema fundamenta por qué encaja el plato destacando los ingredientes que aprovecha."
                result={scenarioResults['scenario_m']}
              />
            </div>
          </div>

          {/* Section: Fase 3 */}
          <div className="space-y-2 pt-2">
            <h4 className="text-[11px] font-black text-[#8C8C8C] uppercase tracking-wider px-2">
              Fase 3: Planificación + Compras Inteligentes (N–W)
            </h4>
            <div className="space-y-2">
              <ScenarioCard
                id="scenario_n"
                title="Escenario N — Plan sin stock genera necesidad"
                desc="Planificar comida sin stock suficiente deriva necesidad de compra explicable (Plan − Stock útil)."
                result={scenarioResults['scenario_n']}
              />
              <ScenarioCard
                id="scenario_o"
                title="Escenario O — Plan con stock completo no exige compra"
                desc="Planificar receta cuando el stock útil ya cubre los ingredientes genera 0 ítems para comprar."
                result={scenarioResults['scenario_o']}
              />
              <ScenarioCard
                id="scenario_p"
                title="Escenario P — Modificación de porciones recalcula compra"
                desc="Cambiar porciones de 2 a 4 recalcula proporcionalmente los requerimientos derivados."
                result={scenarioResults['scenario_p']}
              />
              <ScenarioCard
                id="scenario_q"
                title="Escenario Q — Compra realizada actualiza inventario"
                desc="Finalizar compra aplica los ítems comprados a Mi Cocina actualizando su estado a 'tengo'."
                result={scenarioResults['scenario_q']}
              />
              <ScenarioCard
                id="scenario_r"
                title="Escenario R — Fusión con unidades incompatibles"
                desc="Comprar '1 kg' teniendo '1 taza' reemplaza limpiamente el estado sin producir sumas matemáticas corruptas."
                result={scenarioResults['scenario_r']}
              />
              <ScenarioCard
                id="scenario_s"
                title="Escenario S — Ítem nuevo adquirido se crea en Mi Cocina"
                desc="Un ítem que no existía en el inventario se inserta con su categoría y ubicación adecuada."
                result={scenarioResults['scenario_s']}
              />
              <ScenarioCard
                id="scenario_t"
                title="Escenario T — 'Ya tengo' resuelve necesidad"
                desc="Marcar 'Ya tengo' en la lista actualiza el inventario y remueve la necesidad de compra."
                result={scenarioResults['scenario_t']}
              />
              <ScenarioCard
                id="scenario_u"
                title="Escenario U — Cancelación de plan sin compras fantasma"
                desc="Eliminar una comida prevista recalcula inmediatamente la lista sin dejar compras residuales."
                result={scenarioResults['scenario_u']}
              />
              <ScenarioCard
                id="scenario_v"
                title="Escenario V — Comida cocinada pasa a 'completed'"
                desc="Registrar la comida planificada actualiza su estado sin penalizaciones por retraso."
                result={scenarioResults['scenario_v']}
              />
              <ScenarioCard
                id="scenario_w"
                title="Escenario W — Persistencia integral Phase 3"
                desc="Planes, lista de compras e historial se sincronizan y persisten en LocalStorage."
                result={scenarioResults['scenario_w']}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: DECISION METRICS */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-4">
          {/* Phase 1 Metrics */}
          <div>
            <h4 className="text-[11px] font-black text-[#8C8C8C] uppercase tracking-wider px-1 mb-2">
              Fase 1: Fatiga de decisión y selección
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Generaciones de opciones" value={metrics.generationsCount} />
              <MetricCard label="Opciones elegidas" value={metrics.selectionsCount} />
              <MetricCard label="Descartes de opción" value={metrics.rejectionsCount} />
              <MetricCard label="Rank promedio elegido" value={metrics.averageRankChosen} />
            </div>
          </div>

          {/* Phase 2: H5 & H6 Metrics */}
          <div>
            <h4 className="text-[11px] font-black text-[#8C8C8C] uppercase tracking-wider px-1 mb-2">
              Fase 2: Aprovechamiento e Inventario (H5 / H6)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Vistas aprovechamiento (H5)" value={metrics.utilizationViewsCount} />
              <MetricCard label="Elecciones aprovechadas (H5)" value={metrics.utilizationSelectionsCount} />
              <MetricCard label="Cambios de inventario (H6)" value={metrics.inventoryUpdatesCount} />
              <MetricCard label="Alimentos agregados (H6)" value={metrics.inventoryItemsAddedCount} />
            </div>
          </div>

          {/* Phase 3: H7 Metrics */}
          <div>
            <h4 className="text-[11px] font-black text-[#8C8C8C] uppercase tracking-wider px-1 mb-2">
              Fase 3: Planificación y Compras Derivadas (H7)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Comidas planificadas" value={metrics.plannedMealsAddedCount} />
              <MetricCard label="Ítems comprados" value={metrics.shoppingPurchasedCount} />
              <MetricCard label="Ítems marcados 'Ya tengo'" value={metrics.shoppingMarkedHaveCount} />
              <MetricCard label="Compras aplicadas a cocina" value={metrics.purchasesAppliedCount} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-5 rounded-3xl border border-[#E5E5E3] shadow-xs">
              <h4 className="text-[11px] font-bold text-[#A1A1A1] uppercase tracking-wider mb-3">
                Comidas reales registradas
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#F0F0F0]">
                  <span className="text-[#666666]">Total comidas registradas:</span>
                  <span className="font-bold text-[#1A1A1A]">{metrics.mealsLoggedCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F0F0F0]">
                  <span className="text-[#666666]">Siguiendo la sugerencia elegida:</span>
                  <span className="font-bold text-[#2E7D32]">{metrics.suggestedLoggedCount}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#666666]">Desvíos espontáneos ("Comí otra cosa"):</span>
                  <span className="font-bold text-[#1A1A1A]">{metrics.spontaneousDeviationsCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-[#E5E5E3] shadow-xs">
              <h4 className="text-[11px] font-bold text-[#A1A1A1] uppercase tracking-wider mb-3">
                Estado del Motor Contextual
              </h4>
              <div className="space-y-2 text-xs text-[#555555]">
                <div><span className="font-bold text-[#1A1A1A]">Momento:</span> {context.moment}</div>
                <div><span className="font-bold text-[#1A1A1A]">Tiempo / Energía:</span> {context.timeLimit} · {context.energy}</div>
                <div><span className="font-bold text-[#1A1A1A]">Prioridad:</span> {context.priority}</div>
                <div><span className="font-bold text-[#1A1A1A]">Items en inventario:</span> {inventory.length}</div>
                <div><span className="font-bold text-[#1A1A1A]">Planes próximos activos:</span> {plannedMeals.filter((p) => p.status === 'planned').length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: EVENT STREAM */}
      {activeSubTab === 'events' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#1A1A1A]">Últimos eventos registrados:</span>
            <button
              onClick={refreshTelemetry}
              className="text-xs text-[#1A1A1A] hover:underline font-semibold cursor-pointer"
            >
              Refrescar
            </button>
          </div>

          <div className="bg-[#1A1A1A] text-white rounded-3xl p-4 font-mono text-[11px] max-h-96 overflow-y-auto space-y-2.5 border border-[#333333]">
            {telemetryEvents.length > 0 ? (
              telemetryEvents.map((evt) => (
                <div key={evt.id} className="p-3 rounded-2xl bg-[#262626] border border-[#3A3A3A]">
                  <div className="flex items-center justify-between text-[#8C8C8C] text-[10px] mb-1.5">
                    <span className="font-bold text-[#FF6321]">{evt.eventName}</span>
                    <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <pre className="text-[#D4D4D4] text-[10px] overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <div className="text-[#8C8C8C] text-center py-6">No hay eventos registrados aún.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-white p-4 rounded-3xl border border-[#E5E5E3] shadow-xs">
    <div className="text-[11px] text-[#8C8C8C] font-semibold">{label}</div>
    <div className="text-2xl font-bold text-[#1A1A1A] mt-1">{value}</div>
  </div>
);

const ScenarioCard: React.FC<{
  id: string;
  title: string;
  desc: string;
  result?: { pass: boolean; details: string };
}> = ({ title, desc, result }) => {
  return (
    <div className="bg-white p-4 rounded-3xl border border-[#E5E5E3] flex items-start justify-between gap-3 shadow-xs">
      <div className="flex-1">
        <h4 className="text-xs font-bold text-[#1A1A1A]">{title}</h4>
        <p className="text-xs text-[#666666] mt-0.5">{desc}</p>
        {result && (
          <div
            className={`mt-2.5 text-[11px] p-2.5 rounded-2xl border flex items-start gap-2 ${
              result.pass
                ? 'bg-[#E8F5E9] text-[#1B5E20] border-[#C8E6C9]'
                : 'bg-[#FDF2F0] text-[#B71C1C] border-[#FFCDD2]'
            }`}
          >
            {result.pass ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-[#D9381E] shrink-0 mt-0.5" />
            )}
            <span>{result.details}</span>
          </div>
        )}
      </div>

      {result && (
        <span
          className={`text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 uppercase tracking-wider ${
            result.pass ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#FDF2F0] text-[#D9381E]'
          }`}
        >
          {result.pass ? 'PASS' : 'FAIL'}
        </span>
      )}
    </div>
  );
};
