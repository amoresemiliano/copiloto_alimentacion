import {
  ConversationIntent,
  ConversationMessage,
  ConversationAction,
  ConversationExplanation,
  UserContext,
  InventoryItem,
  Recipe,
  MealEvent,
  PlannedMeal,
  ShoppingItem,
  ShoppingNeed,
  AffinityProfile,
  LearningHypothesis,
  DietaryRestriction,
  Recommendation,
  PlanDay,
  MealMoment,
} from '../types/domain';
import { ConversationInterpreter, localConversationInterpreter } from './conversationInterpreter';
import { rankRecipes } from './rankingEngine';
import { learningService } from './learningService';
import { shoppingNeedsService } from './shoppingNeedsService';
import { inventoryMergeService } from './inventoryMergeService';

export interface ConversationExecutionResult {
  message: ConversationMessage;
  contextPatch?: Partial<UserContext>;
  inventoryUpdates?: InventoryItem[];
  mealEvent?: MealEvent;
  plannedMeal?: PlannedMeal;
  shoppingItemsUpdate?: ShoppingItem[];
  affinityProfileUpdate?: AffinityProfile;
  dietaryRestrictionsUpdate?: DietaryRestriction[];
  dismissedHypothesisId?: string;
  confirmedHypothesisId?: string;
}

export class ConversationService {
  private interpreter: ConversationInterpreter;

  constructor(interpreter: ConversationInterpreter = localConversationInterpreter) {
    this.interpreter = interpreter;
  }

  public setInterpreter(interpreter: ConversationInterpreter): void {
    this.interpreter = interpreter;
  }

  public getInterpreter(): ConversationInterpreter {
    return this.interpreter;
  }

  public processMessage(
    userText: string,
    currentContext: UserContext,
    inventory: InventoryItem[],
    recipes: Recipe[],
    recentMeals: MealEvent[],
    plannedMeals: PlannedMeal[],
    shoppingItems: ShoppingItem[],
    affinityProfile: AffinityProfile,
    dietaryRestrictions: DietaryRestriction[] = [],
    rejectedRecipeIds: string[] = []
  ): ConversationExecutionResult {
    const timestamp = new Date().toISOString();
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Interpret user intent
    const intent = this.interpreter.interpret(
      userText,
      currentContext,
      inventory,
      recipes,
      affinityProfile.hypotheses || [],
      dietaryRestrictions
    );

    // 2. Dispatch to specific handler based on intent type
    switch (intent.type) {
      case 'get_recommendations':
        return this.handleGetRecommendations(
          intent,
          messageId,
          timestamp,
          currentContext,
          inventory,
          recipes,
          recentMeals,
          affinityProfile,
          rejectedRecipeIds
        );

      case 'update_context':
        return this.handleUpdateContext(
          intent,
          messageId,
          timestamp,
          currentContext,
          inventory,
          recipes,
          recentMeals,
          affinityProfile,
          rejectedRecipeIds
        );

      case 'query_inventory':
        return this.handleQueryInventory(intent, messageId, timestamp, inventory);

      case 'update_inventory':
        return this.handleUpdateInventory(intent, messageId, timestamp, inventory);

      case 'log_real_meal':
        return this.handleLogRealMeal(intent, messageId, timestamp, currentContext, plannedMeals, recipes);

      case 'query_planning':
        return this.handleQueryPlanning(intent, messageId, timestamp, plannedMeals);

      case 'plan_meal':
        return this.handlePlanMeal(intent, messageId, timestamp, recipes);

      case 'query_shopping':
        return this.handleQueryShopping(intent, messageId, timestamp, plannedMeals, inventory, shoppingItems);

      case 'update_shopping':
        return this.handleUpdateShopping(intent, messageId, timestamp, shoppingItems, inventory);

      case 'query_learning':
        return this.handleQueryLearning(intent, messageId, timestamp, affinityProfile, recentMeals);

      case 'correct_learning':
        return this.handleCorrectLearning(intent, messageId, timestamp, affinityProfile);

      case 'set_preference':
        return this.handleSetPreference(intent, messageId, timestamp, affinityProfile, dietaryRestrictions);

      case 'explain_recommendation':
        return this.handleExplainRecommendation(
          intent,
          messageId,
          timestamp,
          currentContext,
          inventory,
          recipes,
          recentMeals,
          affinityProfile,
          rejectedRecipeIds
        );

      case 'fallback_unknown':
      default:
        return this.handleFallback(intent, messageId, timestamp);
    }
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  private handleGetRecommendations(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    currentContext: UserContext,
    inventory: InventoryItem[],
    recipes: Recipe[],
    recentMeals: MealEvent[],
    affinityProfile: AffinityProfile,
    rejectedRecipeIds: string[]
  ): ConversationExecutionResult {
    // Merge any contextual entities in the query
    const updatedContext: UserContext = {
      ...currentContext,
      ...(intent.entities.moment ? { moment: intent.entities.moment } : {}),
      ...(intent.entities.hunger ? { hunger: intent.entities.hunger } : {}),
      ...(intent.entities.energy ? { energy: intent.entities.energy } : {}),
      ...(intent.entities.timeLimit ? { timeLimit: intent.entities.timeLimit } : {}),
      ...(intent.entities.motivation ? { motivation: intent.entities.motivation } : {}),
      ...(intent.entities.priority ? { priority: intent.entities.priority } : {}),
      lastUpdated: timestamp,
    };

    const ranked = rankRecipes(
      recipes,
      updatedContext,
      inventory,
      recentMeals,
      rejectedRecipeIds,
      affinityProfile
    );

    const top3 = ranked.slice(0, 3);
    const primary = top3[0];

    let responseText = '';
    if (top3.length === 0) {
      responseText = 'No encontré recetas compatibles con los filtros actuales.';
    } else {
      const listText = top3
        .map((rec, i) => `${i + 1}. **${rec.recipe.name}** (${rec.recipe.prepTimeMinutes} min) — Match ${rec.matchPercentage}%`)
        .join('\n');

      const primaryReason =
        primary.positiveReasons.length > 0
          ? `\n\n*${primary.recipe.name}* lidera porque ${primary.positiveReasons[0].toLowerCase()}.`
          : '';

      responseText = `Te propongo estas opciones para tu ${updatedContext.moment}:\n\n${listText}${primaryReason}`;
    }

    const action: ConversationAction = {
      type: 'FETCH_RECOMMENDATIONS',
      payload: { count: top3.length, moment: updatedContext.moment },
      status: 'executed',
      description: `Generadas ${top3.length} recomendaciones usando el ranking determinístico`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        recommendations: top3,
        suggestedReplies: [
          `Elegir ${primary ? primary.recipe.name : 'opción 1'}`,
          '¿Por qué me recomendás esto?',
          'Tengo poco tiempo',
        ],
      },
    };

    return {
      message,
      contextPatch: updatedContext,
    };
  }

  private handleUpdateContext(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    currentContext: UserContext,
    inventory: InventoryItem[],
    recipes: Recipe[],
    recentMeals: MealEvent[],
    affinityProfile: AffinityProfile,
    rejectedRecipeIds: string[]
  ): ConversationExecutionResult {
    const patch: Partial<UserContext> = {};
    const changes: string[] = [];

    if (intent.entities.moment) {
      patch.moment = intent.entities.moment;
      changes.push(`momento: ${intent.entities.moment}`);
    }
    if (intent.entities.hunger) {
      patch.hunger = intent.entities.hunger;
      changes.push(`hambre: ${intent.entities.hunger}`);
    }
    if (intent.entities.energy) {
      patch.energy = intent.entities.energy;
      changes.push(`energía: ${intent.entities.energy}`);
    }
    if (intent.entities.timeLimit) {
      patch.timeLimit = intent.entities.timeLimit;
      changes.push(`tiempo límite: ${intent.entities.timeLimit}`);
    }
    if (intent.entities.motivation) {
      patch.motivation = intent.entities.motivation;
      changes.push(`ganas de cocinar: ${intent.entities.motivation}`);
    }
    if (intent.entities.priority) {
      patch.priority = intent.entities.priority;
      changes.push(`prioridad: ${intent.entities.priority}`);
    }

    const newContext: UserContext = {
      ...currentContext,
      ...patch,
      lastUpdated: timestamp,
    };

    const ranked = rankRecipes(
      recipes,
      newContext,
      inventory,
      recentMeals,
      rejectedRecipeIds,
      affinityProfile
    );

    const top3 = ranked.slice(0, 3);
    const primary = top3[0];

    const changesText = changes.join(', ');
    let responseText = `Actualicé tu contexto (${changesText}).\n\n`;

    if (primary) {
      responseText += `Tu mejor opción ahora es **${primary.recipe.name}** (${primary.recipe.prepTimeMinutes} min).`;
      if (primary.positiveReasons.length > 0) {
        responseText += `\n*Motivo:* ${primary.positiveReasons[0]}.`;
      }
    }

    const action: ConversationAction = {
      type: 'UPDATE_CONTEXT',
      payload: patch,
      status: 'executed',
      description: `Contexto actualizado: ${changesText}`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        recommendations: top3,
        suggestedReplies: [
          `Cocinar ${primary ? primary.recipe.name : 'esto'}`,
          'Ver otras opciones',
          '¿Qué me falta comprar?',
        ],
      },
    };

    return {
      message,
      contextPatch: patch,
    };
  }

  private handleQueryInventory(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    inventory: InventoryItem[]
  ): ConversationExecutionResult {
    let responseText = '';
    const queriedIngredient = intent.entities.ingredients?.[0]?.name;

    if (queriedIngredient) {
      const match = inventory.find(
        (i) => i.name.toLowerCase().includes(queriedIngredient.toLowerCase()) ||
               queriedIngredient.toLowerCase().includes(i.name.toLowerCase())
      );

      if (match) {
        const statusLabel =
          match.status === 'tengo' || match.status === 'available'
            ? 'disponible'
            : match.status === 'queda_poco' || match.status === 'low'
            ? 'quedando poco'
            : 'no disponible';

        responseText = `Sí, tenés **${match.name}** registrado (${statusLabel}${match.priority === 'consumir_pronto' || match.priority === 'consumeSoon' ? ' · prioritario para consumir pronto' : ''}).`;
      } else {
        responseText = `No encontré **${queriedIngredient}** en tu inventario actual. ¿Querés que lo agregue como disponible o a la lista de compras?`;
      }
    } else if (intent.entities.queryTarget === 'expiring_soon') {
      const expiring = inventory.filter(
        (i) =>
          (i.status === 'tengo' || i.status === 'available' || i.status === 'queda_poco' || i.status === 'low') &&
          (i.priority === 'consumir_pronto' || i.priority === 'consumeSoon' || i.priority === 'prioritario')
      );

      if (expiring.length > 0) {
        const itemsList = expiring.map((i) => `• **${i.name}** (${i.location || 'cocina'})`).join('\n');
        responseText = `Tenés ${expiring.length} ingredientes prioritarios para aprovechar pronto:\n${itemsList}\n\nPodemos buscar recetas que los aprovechen primero.`;
      } else {
        responseText = 'No tenés ningún ingrediente marcado en estado crítico o por vencer pronto.';
      }
    } else {
      const available = inventory.filter(
        (i) => i.status === 'tengo' || i.status === 'available' || i.status === 'queda_poco' || i.status === 'low'
      );
      responseText = `Tenés **${available.length}** ingredientes disponibles en casa. Algunos destacados: ${available
        .slice(0, 6)
        .map((i) => i.name)
        .join(', ')}.`;
    }

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      payload: {
        inventoryItems: inventory,
        suggestedReplies: ['¿Qué puedo cocinar con lo que tengo?', '¿Qué tengo que comprar?'],
      },
    };

    return { message };
  }

  private handleUpdateInventory(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    inventory: InventoryItem[]
  ): ConversationExecutionResult {
    const rawEntities = intent.entities.ingredients || [];
    if (rawEntities.length === 0) {
      return this.handleFallback(intent, messageId, timestamp);
    }

    const isUncertain = intent.entities.uncertainty === true;
    const updatedInventory = [...inventory];
    const appliedSummary: string[] = [];

    for (const ent of rawEntities) {
      const existingIndex = updatedInventory.findIndex(
        (i) =>
          i.name.toLowerCase().trim() === ent.name.toLowerCase().trim() ||
          i.name.toLowerCase().includes(ent.name.toLowerCase()) ||
          ent.name.toLowerCase().includes(i.name.toLowerCase())
      );

      const targetStatus = ent.status || 'tengo';
      const targetPriority = ent.priority || 'normal';
      const targetConfidence = isUncertain ? 'uncertain' : (ent.confidence || 'confirmed');

      if (existingIndex >= 0) {
        const item = updatedInventory[existingIndex];
        updatedInventory[existingIndex] = {
          ...item,
          status: targetStatus,
          priority: ent.priority ? targetPriority : item.priority,
          confidence: targetConfidence,
          updatedAt: timestamp,
        };
        appliedSummary.push(`${item.name} (${targetStatus})`);
      } else {
        const newItem: InventoryItem = {
          id: `inv_conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: ent.name.charAt(0).toUpperCase() + ent.name.slice(1),
          category: 'despensa',
          status: targetStatus,
          priority: targetPriority,
          confidence: targetConfidence,
          source: 'manual',
          updatedAt: timestamp,
        };
        updatedInventory.push(newItem);
        appliedSummary.push(`${newItem.name} (${targetStatus})`);
      }
    }

    let responseText = '';
    if (isUncertain) {
      responseText = `Registré con estado tentativo: ${appliedSummary.join(', ')}. No asumiré certeza absoluta al rankear recetas.`;
    } else {
      responseText = `Listo, actualicé tu cocina con ${appliedSummary.length} ingrediente${appliedSummary.length > 1 ? 's' : ''}: ${appliedSummary.join(', ')}.`;
    }

    const action: ConversationAction = {
      type: 'UPDATE_INVENTORY_ITEMS',
      payload: { items: appliedSummary, isUncertain },
      status: 'executed',
      description: `Inventario actualizado (${appliedSummary.length} ítems)`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        appliedChangesSummary: appliedSummary,
        inventoryItems: updatedInventory,
        suggestedReplies: ['¿Qué puedo cocinar ahora?', 'Ver inventario'],
      },
    };

    return {
      message,
      inventoryUpdates: updatedInventory,
    };
  }

  private handleLogRealMeal(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    currentContext: UserContext,
    plannedMeals: PlannedMeal[],
    recipes: Recipe[]
  ): ConversationExecutionResult {
    const mealText = intent.entities.mealText || 'Comida libre';
    const moment: MealMoment = intent.entities.moment || currentContext.moment || 'almuerzo';

    // Match recipe if possible
    const matchedRecipe = recipes.find(
      (r) =>
        r.name.toLowerCase().includes(mealText.toLowerCase()) ||
        mealText.toLowerCase().includes(r.name.toLowerCase())
    );

    // Check if there was a planned meal for today at this moment
    const plannedForMoment = plannedMeals.find(
      (p) => p.day === 'hoy' && p.mealMoment === moment && p.status === 'planned'
    );

    const mealEvent: MealEvent = {
      id: `meal_conv_${Date.now()}`,
      timestamp,
      mealMoment: moment,
      selectedRecipeId: matchedRecipe?.id,
      recipeName: matchedRecipe ? matchedRecipe.name : mealText,
      customText: mealText,
      wasSuggested: false,
      wasPlanned: !!plannedForMoment,
      plannedMealId: plannedForMoment?.id,
      contextSnapshot: { ...currentContext },
    };

    let responseText = `Listo, registré que comiste **${mealEvent.recipeName}** (${moment}).`;
    if (plannedForMoment && plannedForMoment.recipeName.toLowerCase() !== mealText.toLowerCase()) {
      responseText += `\n*Nota:* Mantengo tu plan original de "${plannedForMoment.recipeName}" intacto para registrar el desvío de forma neutral.`;
    }

    const action: ConversationAction = {
      type: 'LOG_REAL_MEAL',
      payload: { mealEvent },
      status: 'executed',
      description: `Comida registrada en historial: ${mealEvent.recipeName}`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        suggestedReplies: ['¿Qué hay para cenar hoy?', 'Ver historial'],
      },
    };

    return {
      message,
      mealEvent,
    };
  }

  private handleQueryPlanning(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    plannedMeals: PlannedMeal[]
  ): ConversationExecutionResult {
    const targetDay = intent.entities.planDay || 'manana';
    const filtered = plannedMeals.filter((p) => p.day === targetDay && p.status === 'planned');

    let responseText = '';
    if (filtered.length > 0) {
      const itemsList = filtered
        .map((p) => `• **${p.mealMoment.toUpperCase()}**: ${p.recipeName} (${p.servings} porciones)`)
        .join('\n');
      responseText = `Planificado para **${targetDay}**:\n${itemsList}`;
    } else {
      responseText = `No tenés comidas planificadas para **${targetDay}** todavía. Podés decirme qué te gustaría comer o pedirme una propuesta.`;
    }

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      payload: {
        plannedMeals: filtered,
        suggestedReplies: ['Planificar pasta para mañana', '¿Qué me falta comprar?'],
      },
    };

    return { message };
  }

  private handlePlanMeal(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    recipes: Recipe[]
  ): ConversationExecutionResult {
    const recipeName = intent.entities.recipeName || 'Comida planificada';
    const day: PlanDay = intent.entities.planDay || 'manana';
    const moment: MealMoment = intent.entities.moment || 'almuerzo';

    const matchedRecipe = recipes.find(
      (r) =>
        r.name.toLowerCase().includes(recipeName.toLowerCase()) ||
        recipeName.toLowerCase().includes(r.name.toLowerCase())
    );

    const plannedMeal: PlannedMeal = {
      id: `plan_conv_${Date.now()}`,
      day,
      mealMoment: moment,
      recipeId: matchedRecipe?.id,
      recipeName: matchedRecipe ? matchedRecipe.name : recipeName,
      servings: 2,
      status: 'planned',
      source: 'manual',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const responseText = `Listo, agendé **${plannedMeal.recipeName}** para el **${moment}** de **${day}** (2 porciones).`;

    const action: ConversationAction = {
      type: 'PLAN_MEAL',
      payload: { plannedMeal },
      status: 'executed',
      description: `Planificada comida: ${plannedMeal.recipeName} (${day})`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        plannedMeals: [plannedMeal],
        suggestedReplies: ['¿Qué me falta comprar para esto?', 'Ver plan semanal'],
      },
    };

    return {
      message,
      plannedMeal,
    };
  }

  private handleQueryShopping(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    plannedMeals: PlannedMeal[],
    inventory: InventoryItem[],
    shoppingItems: ShoppingItem[]
  ): ConversationExecutionResult {
    const pendingItems = shoppingItems.filter((i) => i.status === 'pending');
    let responseText = '';

    if (pendingItems.length > 0) {
      const itemsList = pendingItems
        .map((i) => `• **${i.name}**${i.quantityText ? ` (${i.quantityText})` : ''}`)
        .join('\n');
      responseText = `Tenés **${pendingItems.length}** ítems pendientes en tu lista de compras:\n${itemsList}`;
    } else {
      responseText = 'No tenés ningún ítem pendiente en tu lista de compras. Todo lo necesario para tu plan está cubierto con tu inventario.';
    }

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      payload: {
        shoppingItems: pendingItems,
        suggestedReplies: ['Ya compré todo', '¿Qué cocino hoy?'],
      },
    };

    return { message };
  }

  private handleUpdateShopping(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    shoppingItems: ShoppingItem[],
    inventory: InventoryItem[]
  ): ConversationExecutionResult {
    const itemNames = intent.entities.shoppingItemNames || [];
    const updatedShopping = [...shoppingItems];
    const updatedInventory = [...inventory];
    const appliedSummary: string[] = [];

    // Mark items as purchased in shopping list
    for (const name of itemNames) {
      const existingShopping = updatedShopping.find(
        (s) => s.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(s.name.toLowerCase())
      );

      if (existingShopping) {
        existingShopping.status = 'purchased';
        existingShopping.updatedAt = timestamp;
      }

      // Also merge purchase into inventory using real inventory update
      const existingInv = updatedInventory.find(
        (i) => i.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(i.name.toLowerCase())
      );

      if (existingInv) {
        existingInv.status = 'tengo';
        existingInv.confidence = 'confirmed';
        existingInv.updatedAt = timestamp;
      } else {
        updatedInventory.push({
          id: `inv_purch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          category: 'despensa',
          status: 'tengo',
          priority: 'normal',
          confidence: 'confirmed',
          source: 'manual',
          updatedAt: timestamp,
        });
      }
      appliedSummary.push(name);
    }

    const responseText = `Excelente. Registré la compra de: **${appliedSummary.join(', ')}** y actualicé automáticamente tu inventario disponible.`;

    const action: ConversationAction = {
      type: 'APPLY_PURCHASE',
      payload: { items: appliedSummary },
      status: 'executed',
      description: `Compra registrada y transferida a cocina: ${appliedSummary.join(', ')}`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        appliedChangesSummary: appliedSummary,
        shoppingItems: updatedShopping,
        inventoryItems: updatedInventory,
        suggestedReplies: ['¿Qué puedo cenar hoy?', 'Ver mi cocina'],
      },
    };

    return {
      message,
      shoppingItemsUpdate: updatedShopping,
      inventoryUpdates: updatedInventory,
    };
  }

  private handleQueryLearning(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    affinityProfile: AffinityProfile,
    recentMeals: MealEvent[]
  ): ConversationExecutionResult {
    const activeHypotheses = (affinityProfile.hypotheses || []).filter(
      (h) => h.status !== 'dismissed_by_user'
    );

    let responseText = '';
    if (activeHypotheses.length > 0) {
      const list = activeHypotheses
        .map((h) => `• **${h.title}** (confianza ${h.confidence}): ${h.description}`)
        .join('\n');
      responseText = `Tengo detectados estos patrones de tus hábitos:\n\n${list}\n\nPodés decirme si alguno es correcto o descartarlo.`;
    } else {
      responseText = `Aún estoy acumulando señales de tus comidas para inferir patrones con prudencia (${recentMeals.length} registradas).`;
    }

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      payload: {
        hypotheses: activeHypotheses,
        suggestedReplies: ['Eso no es así', 'Sí, es correcto', '¿Qué cocino hoy?'],
      },
    };

    return { message };
  }

  private handleCorrectLearning(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    affinityProfile: AffinityProfile
  ): ConversationExecutionResult {
    const feedback = intent.entities.hypothesisFeedback || 'dismiss';
    const targetHypoId = intent.entities.hypothesisId;

    const hypotheses = [...(affinityProfile.hypotheses || [])];
    const target = targetHypoId
      ? hypotheses.find((h) => h.id === targetHypoId)
      : hypotheses.find((h) => h.status === 'active' || (feedback === 'dismiss' && h.status === 'confirmed_by_user'));

    let responseText = '';
    let updatedHypotheses = hypotheses;

    if (target) {
      if (feedback === 'dismiss') {
        target.status = 'dismissed_by_user';
        target.updatedAt = timestamp;
        responseText = `Entendido. Descarté la hipótesis **"${target.title}"**. No aplicará bonificaciones en tus recomendaciones.`;
      } else {
        target.status = 'confirmed_by_user';
        target.updatedAt = timestamp;
        responseText = `Confirmado. Priorizaré la hipótesis **"${target.title}"** en las recomendaciones futuras.`;
      }
    } else {
      responseText = feedback === 'dismiss'
        ? 'No encontré una hipótesis activa específica para descartar, pero registré tu indicación.'
        : 'Hipótesis confirmada.';
    }

    const updatedProfile: AffinityProfile = {
      ...affinityProfile,
      hypotheses: updatedHypotheses,
      lastCalculatedAt: timestamp,
    };

    const action: ConversationAction = {
      type: 'UPDATE_HYPOTHESIS',
      payload: { hypothesisId: target?.id, feedback },
      status: 'executed',
      description: `Hipótesis ${target?.title || ''} actualizada a ${feedback === 'dismiss' ? 'descartada' : 'confirmada'}`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        hypotheses: updatedHypotheses,
        suggestedReplies: ['¿Qué aprendiste de mí?', '¿Qué ceno hoy?'],
      },
    };

    return {
      message,
      affinityProfileUpdate: updatedProfile,
      dismissedHypothesisId: feedback === 'dismiss' ? target?.id : undefined,
      confirmedHypothesisId: feedback === 'confirm' ? target?.id : undefined,
    };
  }

  private handleSetPreference(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    affinityProfile: AffinityProfile,
    dietaryRestrictions: DietaryRestriction[]
  ): ConversationExecutionResult {
    const prefType = intent.entities.preferenceType || 'permanent_dislike';
    const value = intent.entities.preferenceValue || '';

    if (!value) {
      return this.handleFallback(intent, messageId, timestamp);
    }

    let responseText = '';
    let updatedProfile = { ...affinityProfile };
    let updatedRestrictions = [...dietaryRestrictions];

    if (prefType === 'hard_restriction') {
      const newRestriction: DietaryRestriction = {
        id: `restr_${Date.now()}`,
        type: 'allergy',
        ingredientOrCategory: value,
        createdAt: timestamp,
      };
      updatedRestrictions.push(newRestriction);
      // Also add to avoided ingredients for safety
      updatedProfile = learningService.toggleAvoidedIngredient(updatedProfile, value);
      responseText = `Registré **"${value}"** como **restricción estricta**. Queda completamente excluida de tus opciones.`;
    } else if (prefType === 'permanent_dislike') {
      updatedProfile = learningService.toggleAvoidedIngredient(updatedProfile, value);
      responseText = `Entendido. Agregué **"${value}"** a tus ingredientes no preferidos. Recibirá penalización fuerte en el ranking.`;
    } else if (prefType === 'favorite') {
      updatedProfile = learningService.toggleFavoriteIngredient(updatedProfile, value);
      responseText = `Excelente. Agregué **"${value}"** a tus ingredientes favoritos (+15% en el ranking).`;
    } else if (prefType === 'contextual_dislike') {
      responseText = `Anotado. En esta sesión puntual excluiré opciones con **"${value}"**.`;
    }

    const action: ConversationAction = {
      type: 'SET_PREFERENCE',
      payload: { prefType, value },
      status: 'executed',
      description: `Preferencia registrada: ${prefType} -> ${value}`,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        dietaryRestrictions: updatedRestrictions,
        suggestedReplies: ['¿Qué opciones me quedan?', 'Ver preferencias'],
      },
    };

    return {
      message,
      affinityProfileUpdate: updatedProfile,
      dietaryRestrictionsUpdate: updatedRestrictions,
    };
  }

  private handleExplainRecommendation(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string,
    currentContext: UserContext,
    inventory: InventoryItem[],
    recipes: Recipe[],
    recentMeals: MealEvent[],
    affinityProfile: AffinityProfile,
    rejectedRecipeIds: string[]
  ): ConversationExecutionResult {
    const ranked = rankRecipes(
      recipes,
      currentContext,
      inventory,
      recentMeals,
      rejectedRecipeIds,
      affinityProfile
    );

    const targetRecipeId = intent.entities.recipeId;
    const targetRec = targetRecipeId
      ? ranked.find((r) => r.recipe.id === targetRecipeId) || ranked[0]
      : ranked[0];

    if (!targetRec) {
      return this.handleFallback(intent, messageId, timestamp);
    }

    const reasons = targetRec.positiveReasons.slice(0, 3);
    const reasonsText = reasons.map((r) => `• ${r}`).join('\n');

    let responseText = `Recomiendo **${targetRec.recipe.name}** (Match ${targetRec.matchPercentage}%) por:\n\n${reasonsText}`;

    if (targetRec.penalties.length > 0) {
      responseText += `\n\n*A tener en cuenta:* ${targetRec.penalties[0]}`;
    }

    const explanation: ConversationExplanation = {
      recipeId: targetRec.recipe.id,
      recipeName: targetRec.recipe.name,
      matchPercentage: targetRec.matchPercentage,
      totalScore: targetRec.totalScore,
      positiveReasons: targetRec.positiveReasons,
      penalties: targetRec.penalties,
      factors: targetRec.factors,
      missingIngredients: targetRec.missingCoreIngredients,
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      payload: {
        explanation,
        recommendations: [targetRec],
        suggestedReplies: [`Cocinar ${targetRec.recipe.name}`, 'Ver otra opción'],
      },
    };

    return { message };
  }

  private handleFallback(
    intent: ConversationIntent,
    messageId: string,
    timestamp: string
  ): ConversationExecutionResult {
    const responseText =
      'No estoy seguro de haber entendido tu pedido. Podés pedirme ideas para comer ("¿Qué ceno rápido?"), actualizar tu stock ("Tengo pollo y huevos"), planificar ("Mañana quiero pasta") o revisar compras ("¿Qué me falta?").';

    const action: ConversationAction = {
      type: 'FALLBACK',
      payload: { raw: intent.rawMessage },
      status: 'executed',
      description: 'Intención no resuelta, fallback seguro presentado',
    };

    const message: ConversationMessage = {
      id: messageId,
      role: 'assistant',
      text: responseText,
      timestamp,
      intent,
      actions: [action],
      payload: {
        suggestedReplies: [
          '¿Qué puedo comer ahora?',
          'Tengo 15 minutos',
          '¿Qué tengo para usar pronto?',
          '¿Qué me falta comprar?',
        ],
      },
    };

    return { message };
  }
}

export const conversationService = new ConversationService();
