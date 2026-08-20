import { describe, it, expect } from 'vitest';
import { localConversationInterpreter } from '../services/conversationInterpreter';
import { conversationService } from '../services/conversationService';
import {
  INITIAL_RECIPES,
  INITIAL_INVENTORY_ITEMS,
  INITIAL_RECENT_MEALS,
  INITIAL_PLANNED_MEALS,
  INITIAL_SHOPPING_ITEMS,
} from '../data/fixtures';
import {
  UserContext,
  AffinityProfile,
  LearningHypothesis,
  PlannedMeal,
  ShoppingItem,
} from '../types/domain';

const BASE_CONTEXT: UserContext = {
  moment: 'cena',
  hunger: 'normal',
  energy: 'normal',
  timeLimit: '30min',
  motivation: 'normales',
  priority: 'automatico',
  lastUpdated: new Date().toISOString(),
};

const BASE_AFFINITY: AffinityProfile = {
  favoriteIngredients: ['Huevos', 'Tomates'],
  avoidedIngredients: [],
  tagAffinities: {},
  recipeAffinities: {},
  momentPreferences: {},
  energyPatterns: { whenLowEnergyPrefersQuick: false, whenLowEnergyPrefersSimple: false },
  hypotheses: [
    {
      id: 'hypo_quick_lunch',
      category: 'time_preference',
      title: 'Prioridad por almuerzos rápidos',
      description: 'Tendés a elegir preparaciones de menos de 15 minutos en el almuerzo.',
      confidence: 'alta',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidenceCount: 3,
      ruleKey: 'quick_lunch',
      impactDescription: 'Favorece opciones rápidas al mediodía',
      weightBonus: 0.1,
    },
  ],
  signalsCount: 5,
  lastCalculatedAt: new Date().toISOString(),
};

describe('Fase 5 - Interfaz Conversacional sobre el Cerebro Compartido (Tests AJ a AV)', () => {
  // Test AJ
  it('AJ: Detecta intención y entidades para "¿Qué puedo cenar rápido?"', () => {
    const intent = localConversationInterpreter.interpret(
      '¿Qué puedo cenar rápido?',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      BASE_AFFINITY.hypotheses
    );

    expect(intent.type).toBe('get_recommendations');
    expect(intent.entities.moment).toBe('cena');
    expect(intent.entities.priority).toBe('rapido');
    expect(intent.confidence).toBeGreaterThanOrEqual(0.85);

    const result = conversationService.processMessage(
      '¿Qué puedo cenar rápido?',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.message.role).toBe('assistant');
    expect(result.message.payload?.recommendations).toBeDefined();
    expect(result.message.payload?.recommendations?.length).toBeGreaterThan(0);
  });

  // Test AK
  it('AK: Actualiza contexto determinísticamente para "Tengo 15 minutos y poca energía"', () => {
    const intent = localConversationInterpreter.interpret(
      'Tengo 15 minutos y poca energía',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      BASE_AFFINITY.hypotheses
    );

    expect(intent.type).toBe('update_context');
    expect(intent.entities.timeLimit).toBe('15min');
    expect(intent.entities.energy).toBe('baja');

    const result = conversationService.processMessage(
      'Tengo 15 minutos y poca energía',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.contextPatch?.timeLimit).toBe('15min');
    expect(result.contextPatch?.energy).toBe('baja');
    expect(result.message.text).toContain('15min');
  });

  // Test AL
  it('AL: Procesa múltiples ingredientes e interactúa con inventario para "Tengo pollo, tomate, queso y huevos"', () => {
    const result = conversationService.processMessage(
      'Tengo pollo, tomate, queso y huevos',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.inventoryUpdates).toBeDefined();
    expect(result.inventoryUpdates!.length).toBeGreaterThanOrEqual(4);

    const hasChicken = result.inventoryUpdates!.some((i) => i.name.toLowerCase().includes('pollo'));
    const hasEggs = result.inventoryUpdates!.some((i) => i.name.toLowerCase().includes('huevo'));
    expect(hasChicken).toBe(true);
    expect(hasEggs).toBe(true);
    expect(result.message.payload?.appliedChangesSummary?.length).toBe(4);
  });

  // Test AM
  it('AM: Maneja incertidumbre ("Creo que me queda arroz") marcando el ítem como tentativo', () => {
    const result = conversationService.processMessage(
      'Creo que me queda arroz',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.inventoryUpdates).toBeDefined();
    const rice = result.inventoryUpdates!.find((i) => i.name.toLowerCase().includes('arroz'));
    expect(rice).toBeDefined();
    expect(rice?.confidence).toBe('uncertain');
    expect(result.message.text.toLowerCase()).toContain('tentativo');
  });

  // Test AN
  it('AN: Registra comida libre ("Al final comí pizza") preservando el plan y registrando desvío neutral', () => {
    const plannedMeal: PlannedMeal = {
      id: 'plan_today_lunch',
      day: 'hoy',
      mealMoment: 'almuerzo',
      recipeName: 'Ensalada Caesar',
      servings: 1,
      status: 'planned',
      source: 'suggestion',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = conversationService.processMessage(
      'Al final almorcé pizza',
      { ...BASE_CONTEXT, moment: 'almuerzo' },
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      [plannedMeal],
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.mealEvent).toBeDefined();
    expect(result.mealEvent?.recipeName.toLowerCase()).toContain('pizza');
    expect(result.mealEvent?.wasSuggested).toBe(false);
    expect(result.mealEvent?.mealMoment).toBe('almuerzo');
    expect(result.message.text).toContain('pizza');
  });

  // Test AO
  it('AO: Consulta de planificación para "¿Qué tenía planeado para mañana?"', () => {
    const tomorrowPlan: PlannedMeal = {
      id: 'p_tomorrow',
      day: 'manana',
      mealMoment: 'cena',
      recipeName: 'Tarta de espinaca',
      servings: 2,
      status: 'planned',
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = conversationService.processMessage(
      '¿Qué tenía planeado para mañana?',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      [tomorrowPlan],
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.message.payload?.plannedMeals).toBeDefined();
    expect(result.message.text).toContain('Tarta de espinaca');
  });

  // Test AP
  it('AP: Planifica comida para "Mañana quiero comer pasta"', () => {
    const result = conversationService.processMessage(
      'Mañana quiero comer pasta',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.plannedMeal).toBeDefined();
    expect(result.plannedMeal?.day).toBe('manana');
    expect(result.plannedMeal?.recipeName.toLowerCase()).toContain('pasta');
    expect(result.message.text).toContain('Pasta');
  });

  // Test AQ
  it('AQ: Consulta de compras para "¿Qué me falta comprar?"', () => {
    const pendingItem: ShoppingItem = {
      id: 'shop_1',
      name: 'Aceite de oliva',
      category: 'despensa',
      status: 'pending',
      origin: 'suggested',
      reason: 'Plan de comidas',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = conversationService.processMessage(
      '¿Qué me falta comprar?',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      [pendingItem],
      BASE_AFFINITY
    );

    expect(result.message.payload?.shoppingItems).toBeDefined();
    expect(result.message.text).toContain('Aceite de oliva');
  });

  // Test AR
  it('AR: Registra compra ("Ya compré huevos y tomates") y transfiere automáticamente a cocina', () => {
    const shoppingList: ShoppingItem[] = [
      {
        id: 's_huevos',
        name: 'Huevos',
        category: 'lacteos_huevos',
        status: 'pending',
        origin: 'manual',
        reason: 'Compra de reposición',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = conversationService.processMessage(
      'Ya compré huevos y tomates',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      shoppingList,
      BASE_AFFINITY
    );

    expect(result.shoppingItemsUpdate).toBeDefined();
    const eggsShop = result.shoppingItemsUpdate?.find((s) => s.name.toLowerCase().includes('huevo'));
    expect(eggsShop?.status).toBe('purchased');

    expect(result.inventoryUpdates).toBeDefined();
    const eggsInv = result.inventoryUpdates?.find((i) => i.name.toLowerCase().includes('huevo'));
    expect(eggsInv?.status).toBe('tengo');
  });

  // Test AS
  it('AS: Consulta de aprendizaje para "¿Qué aprendiste de mí?"', () => {
    const result = conversationService.processMessage(
      '¿Qué aprendiste de mí?',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.message.payload?.hypotheses).toBeDefined();
    expect(result.message.text).toContain('Prioridad por almuerzos rápidos');
  });

  // Test AT
  it('AT: Corrige o descarta aprendizaje ("Eso no es así")', () => {
    const result = conversationService.processMessage(
      'Eso no es así, descartar hipótesis',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.dismissedHypothesisId).toBe('hypo_quick_lunch');
    expect(result.affinityProfileUpdate?.hypotheses?.find((h) => h.id === 'hypo_quick_lunch')?.status).toBe(
      'dismissed_by_user'
    );
    expect(result.message.text.toLowerCase()).toContain('descarté');
  });

  // Test AU
  it('AU: Distingue con precisión Restricción Estricta, Rechazo Permanente y Rechazo Contextual', () => {
    // 1. Restricción Estricta (Alergia / Intolerancia)
    const resHard = conversationService.processMessage(
      'No puedo comer maní, tengo alergia',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );
    expect(resHard.dietaryRestrictionsUpdate).toBeDefined();
    expect(resHard.dietaryRestrictionsUpdate?.some((r) => r.ingredientOrCategory.includes('mani'))).toBe(true);
    expect(resHard.affinityProfileUpdate?.avoidedIngredients).toContain('mani');

    // 2. Rechazo Permanente (Dislike)
    const resDislike = conversationService.processMessage(
      'No me gusta el cilantro',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );
    expect(resDislike.affinityProfileUpdate?.avoidedIngredients).toContain('cilantro');

    // 3. Rechazo Contextual (Solo hoy)
    const resContextual = conversationService.processMessage(
      'Hoy no quiero pescado',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );
    // Should not add permanent dislike to avoidedIngredients
    expect(resContextual.affinityProfileUpdate?.avoidedIngredients.includes('pescado')).toBeFalsy();
    expect(resContextual.message.text).toContain('esta sesión');
  });

  // Test AV
  it('AV: Garantiza que la conversación consume y actualiza el Cerebro Compartido (Single Source of Truth)', () => {
    // 1. Update context via conversational message
    const step1 = conversationService.processMessage(
      'Tengo 15 minutos',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    const updatedContext: UserContext = {
      ...BASE_CONTEXT,
      ...step1.contextPatch,
    };

    // 2. Recommendations requested afterwards reflect the patched context
    const step2 = conversationService.processMessage(
      '¿Qué puedo comer?',
      updatedContext,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    const topRec = step2.message.payload?.recommendations?.[0];
    expect(topRec).toBeDefined();
    // In 15 min, top recommendation must have low prep time
    expect(topRec!.recipe.prepTimeMinutes).toBeLessThanOrEqual(15);
  });

  // Fallback test
  it('Fallback: Entrada desconocida responde de forma segura sin corromper el estado', () => {
    const result = conversationService.processMessage(
      'abracadabra 1234 xyz',
      BASE_CONTEXT,
      INITIAL_INVENTORY_ITEMS,
      INITIAL_RECIPES,
      INITIAL_RECENT_MEALS,
      INITIAL_PLANNED_MEALS,
      INITIAL_SHOPPING_ITEMS,
      BASE_AFFINITY
    );

    expect(result.message.intent?.type).toBe('fallback_unknown');
    expect(result.contextPatch).toBeUndefined();
    expect(result.inventoryUpdates).toBeUndefined();
    expect(result.mealEvent).toBeUndefined();
    expect(result.message.text).toContain('No estoy seguro de haber entendido');
  });
});
