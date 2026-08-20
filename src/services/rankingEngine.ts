import {
  Recipe,
  UserContext,
  InventoryItem,
  MealEvent,
  Recommendation,
  RecommendationFactors,
} from '../types/domain';

export interface RankingWeights {
  momentFit: number;
  timeFit: number;
  effortFit: number;
  hungerFit: number;
  inventoryFit: number;
  recentVarietyFit: number;
  utilizationFit: number;
}

export const BASE_WEIGHTS: RankingWeights = {
  momentFit: 0.22,
  timeFit: 0.18,
  effortFit: 0.14,
  hungerFit: 0.10,
  inventoryFit: 0.18,
  recentVarietyFit: 0.10,
  utilizationFit: 0.08,
};

export function getDynamicWeights(context: UserContext): RankingWeights {
  const weights = { ...BASE_WEIGHTS };

  switch (context.priority) {
    case 'rapido':
      weights.timeFit = 0.32;
      weights.effortFit = 0.20;
      weights.inventoryFit = 0.15;
      weights.momentFit = 0.15;
      weights.utilizationFit = 0.06;
      weights.recentVarietyFit = 0.06;
      weights.hungerFit = 0.06;
      break;

    case 'aprovechar_primero':
      weights.utilizationFit = 0.30;
      weights.inventoryFit = 0.25;
      weights.momentFit = 0.15;
      weights.timeFit = 0.10;
      weights.effortFit = 0.08;
      weights.hungerFit = 0.06;
      weights.recentVarietyFit = 0.06;
      break;

    case 'usar_lo_que_tengo':
      weights.inventoryFit = 0.35;
      weights.utilizationFit = 0.18;
      weights.momentFit = 0.15;
      weights.timeFit = 0.12;
      weights.effortFit = 0.08;
      weights.hungerFit = 0.06;
      weights.recentVarietyFit = 0.06;
      break;

    case 'mas_saludable':
      weights.momentFit = 0.20;
      weights.hungerFit = 0.15;
      weights.inventoryFit = 0.15;
      weights.timeFit = 0.15;
      weights.effortFit = 0.10;
      weights.recentVarietyFit = 0.13;
      weights.utilizationFit = 0.12;
      break;

    case 'economico':
      weights.inventoryFit = 0.28;
      weights.utilizationFit = 0.22;
      weights.momentFit = 0.18;
      weights.timeFit = 0.12;
      weights.effortFit = 0.08;
      weights.hungerFit = 0.06;
      weights.recentVarietyFit = 0.06;
      break;

    case 'algo_rico':
    case 'automatico':
    default:
      // standard balanced weights
      break;
  }

  // Normalize to sum = 1.0
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const normalized: RankingWeights = {
    momentFit: weights.momentFit / sum,
    timeFit: weights.timeFit / sum,
    effortFit: weights.effortFit / sum,
    hungerFit: weights.hungerFit / sum,
    inventoryFit: weights.inventoryFit / sum,
    recentVarietyFit: weights.recentVarietyFit / sum,
    utilizationFit: weights.utilizationFit / sum,
  };

  return normalized;
}

export function scoreMomentFit(recipe: Recipe, context: UserContext): number {
  if (recipe.mealMoments.includes(context.moment)) {
    return 1.0;
  }
  // Soft degradation if dish could potentially be eaten in adjacent moments
  return 0.15;
}

export function scoreTimeFit(recipe: Recipe, context: UserContext): number {
  const time = recipe.prepTimeMinutes;

  if (context.timeLimit === '15min') {
    if (time <= 10) return 1.0;
    if (time <= 15) return 0.95;
    if (time <= 20) return 0.65;
    if (time <= 30) return 0.30;
    return 0.05; // heavy penalty for >30m
  }

  if (context.timeLimit === '30min') {
    if (time <= 20) return 1.0;
    if (time <= 30) return 0.95;
    if (time <= 40) return 0.50;
    return 0.15;
  }

  // tengo_tiempo
  if (time > 30) return 1.0;
  if (time >= 15) return 0.90;
  return 0.80; // fast dishes are still okay even if user has time
}

export function scoreEffortFit(recipe: Recipe, context: UserContext): number {
  const complexity = recipe.complexity;
  const isLowEnergy = context.energy === 'baja';
  const isLowMotivation = context.motivation === 'minimas';
  const isHighEnergy = context.energy === 'alta';
  const isHighMotivation = context.motivation === 'tengo_ganas';

  if (isLowEnergy && isLowMotivation) {
    if (complexity === 'muy_baja') return 1.0;
    if (complexity === 'baja') return 0.70;
    if (complexity === 'media') return 0.25;
    return 0.05;
  }

  if (isLowEnergy || isLowMotivation) {
    if (complexity === 'muy_baja') return 1.0;
    if (complexity === 'baja') return 0.85;
    if (complexity === 'media') return 0.45;
    return 0.15;
  }

  if (isHighEnergy && isHighMotivation) {
    if (complexity === 'alta') return 1.0;
    if (complexity === 'media') return 0.95;
    if (complexity === 'baja') return 0.85;
    return 0.75;
  }

  // Normal energy and motivation
  if (complexity === 'muy_baja' || complexity === 'baja') return 1.0;
  if (complexity === 'media') return 0.85;
  return 0.40;
}

export function scoreHungerFit(recipe: Recipe, context: UserContext): number {
  const satiety = recipe.satiety;

  if (context.hunger === 'mucha') {
    if (satiety === 'contundente') return 1.0;
    if (satiety === 'medio') return 0.80;
    return 0.35; // ligero is not satisfying enough
  }

  if (context.hunger === 'poca') {
    if (satiety === 'ligero') return 1.0;
    if (satiety === 'medio') return 0.75;
    return 0.30; // too heavy
  }

  // hunger === 'normal'
  if (satiety === 'medio') return 1.0;
  if (satiety === 'ligero') return 0.85;
  return 0.80;
}

export interface InventoryCheckResult {
  score: number;
  missingCoreIngredients: string[];
  priorityIngredientsUsed: string[];
  utilizationScore: number;
}

export function evaluateInventoryAndUtilization(
  recipe: Recipe,
  inventory: InventoryItem[]
): InventoryCheckResult {
  const inventoryMap = new Map<string, InventoryItem>();
  inventory.forEach((item) => {
    inventoryMap.set(item.id, item);
    // Also index by normalized name for fuzzy resilience
    inventoryMap.set(item.name.toLowerCase(), item);
  });

  const coreIngredients = recipe.ingredients.filter((i) => i.isCore);
  const optionalIngredients = recipe.ingredients.filter((i) => !i.isCore);

  const missingCore: string[] = [];
  const priorityUsed: string[] = [];
  let availableCorePoints = 0;
  let availableOptionalPoints = 0;
  let utilizationPoints = 0;

  for (const ing of coreIngredients) {
    const item = (ing.inventoryItemId && inventoryMap.get(ing.inventoryItemId)) ||
                 inventoryMap.get(ing.name.toLowerCase());

    if (!item || item.status === 'no_tengo') {
      missingCore.push(ing.name);
    } else if (item.status === 'tengo') {
      availableCorePoints += 1.0;
    } else if (item.status === 'queda_poco') {
      availableCorePoints += 0.75;
    }

    if (item && item.status !== 'no_tengo') {
      if (item.priority === 'prioritario') {
        priorityUsed.push(item.name);
        utilizationPoints += 1.0;
      } else if (item.priority === 'consumir_pronto') {
        priorityUsed.push(item.name);
        utilizationPoints += 0.65;
      }
    }
  }

  for (const ing of optionalIngredients) {
    const item = (ing.inventoryItemId && inventoryMap.get(ing.inventoryItemId)) ||
                 inventoryMap.get(ing.name.toLowerCase());

    if (item && item.status !== 'no_tengo') {
      availableOptionalPoints += item.status === 'tengo' ? 1.0 : 0.75;
      if (item.priority === 'prioritario') {
        priorityUsed.push(item.name);
        utilizationPoints += 0.75;
      } else if (item.priority === 'consumir_pronto') {
        priorityUsed.push(item.name);
        utilizationPoints += 0.5;
      }
    }
  }

  const coreRatio = coreIngredients.length > 0
    ? availableCorePoints / coreIngredients.length
    : 1.0;

  const optionalRatio = optionalIngredients.length > 0
    ? availableOptionalPoints / optionalIngredients.length
    : 1.0;

  // Severe penalty if any core ingredient is completely missing
  let inventoryScore = coreRatio * 0.85 + optionalRatio * 0.15;
  if (missingCore.length > 0) {
    inventoryScore = Math.max(0.05, inventoryScore * Math.pow(0.4, missingCore.length));
  }

  // Utilization normalized score (0 to 1)
  const utilizationScore = Math.min(1.0, Math.max(0.1, utilizationPoints * 0.5));

  return {
    score: inventoryScore,
    missingCoreIngredients: missingCore,
    priorityIngredientsUsed: Array.from(new Set(priorityUsed)),
    utilizationScore,
  };
}

export function scoreRecentVariety(
  recipe: Recipe,
  recentMeals: MealEvent[]
): { score: number; isRepeatedRecently: boolean; hoursSinceLastEaten?: number } {
  if (!recentMeals || recentMeals.length === 0) {
    return { score: 1.0, isRepeatedRecently: false };
  }

  const now = Date.now();
  let mostRecentMatch: MealEvent | null = null;
  let minHours = Infinity;

  for (const meal of recentMeals) {
    const matchesRecipe = meal.selectedRecipeId === recipe.id ||
      (meal.recipeName && meal.recipeName.toLowerCase() === recipe.name.toLowerCase());

    if (matchesRecipe) {
      const mealTime = new Date(meal.timestamp).getTime();
      const hoursAgo = (now - mealTime) / (1000 * 3600);
      if (hoursAgo < minHours) {
        minHours = hoursAgo;
        mostRecentMatch = meal;
      }
    }
  }

  if (!mostRecentMatch) {
    return { score: 1.0, isRepeatedRecently: false };
  }

  if (minHours < 24) {
    // Eaten today or last 24h: strong variety penalty
    return { score: 0.15, isRepeatedRecently: true, hoursSinceLastEaten: minHours };
  }

  if (minHours < 48) {
    // Eaten yesterday: moderate variety penalty
    return { score: 0.45, isRepeatedRecently: true, hoursSinceLastEaten: minHours };
  }

  if (minHours < 72) {
    return { score: 0.75, isRepeatedRecently: false, hoursSinceLastEaten: minHours };
  }

  return { score: 1.0, isRepeatedRecently: false, hoursSinceLastEaten: minHours };
}

export function deriveExplanationsAndPenalties(
  recipe: Recipe,
  context: UserContext,
  factors: RecommendationFactors,
  missingCore: string[],
  priorityUsed: string[]
): { positiveReasons: string[]; penalties: string[] } {
  const positiveReasons: string[] = [];
  const penalties: string[] = [];

  // Priority Ingredients Utilization
  if (priorityUsed.length > 0) {
    if (priorityUsed.length === 1) {
      positiveReasons.push(`Aprovecha ${priorityUsed[0]} que conviene utilizar pronto.`);
    } else {
      positiveReasons.push(`Aprovecha ingredientes prioritarios: ${priorityUsed.slice(0, 2).join(' y ')}.`);
    }
  }

  // Time fit
  if (context.timeLimit === '15min' && recipe.prepTimeMinutes <= 15) {
    positiveReasons.push(`Entra dentro de tus 15 min (${recipe.prepTimeMinutes} min de preparación).`);
  } else if (context.timeLimit === '30min' && recipe.prepTimeMinutes <= 25) {
    positiveReasons.push(`Listo en ${recipe.prepTimeMinutes} min con preparación simple.`);
  }

  // Effort & Energy
  if ((context.energy === 'baja' || context.motivation === 'minimas') && (recipe.complexity === 'muy_baja' || recipe.complexity === 'baja')) {
    positiveReasons.push('Requiere muy poco esfuerzo para cuando la energía está baja.');
  }

  // Hunger fit
  if (context.hunger === 'mucha' && recipe.satiety === 'contundente') {
    positiveReasons.push('Plato sustancioso ideal para tu nivel de hambre.');
  } else if (context.hunger === 'poca' && recipe.satiety === 'ligero') {
    positiveReasons.push('Opción liviana y digestiva acorde a poco apetito.');
  }

  // Inventory fit
  if (missingCore.length === 0 && factors.inventoryFit >= 0.9) {
    positiveReasons.push('Tenés todos los ingredientes principales disponibles.');
  }

  // Variety
  if (factors.recentVarietyFit >= 0.95) {
    positiveReasons.push('Aporta variedad a lo que comiste en los últimos días.');
  }

  // Fallback if no specific positive reason caught
  if (positiveReasons.length === 0) {
    positiveReasons.push(`Buena combinación para ${context.moment} según tus preferencias.`);
  }

  // Penalties
  if (missingCore.length > 0) {
    penalties.push(`Faltan ingredientes principales: ${missingCore.join(', ')}.`);
  }
  if (context.timeLimit === '15min' && recipe.prepTimeMinutes > 25) {
    penalties.push(`Requiere ${recipe.prepTimeMinutes} min (supera tu tiempo deseado).`);
  }
  if (factors.recentVarietyFit < 0.5) {
    penalties.push('Ya consumiste este plato o algo similar muy recientemente.');
  }
  if ((context.energy === 'baja' || context.motivation === 'minimas') && recipe.complexity === 'alta') {
    penalties.push('Preparación más elaborada de la deseada para tu nivel de energía.');
  }

  return {
    positiveReasons: positiveReasons.slice(0, 3), // Keep scannable & concise
    penalties,
  };
}

export function rankRecipes(
  recipes: Recipe[],
  context: UserContext,
  inventory: InventoryItem[],
  recentMeals: MealEvent[],
  rejectedRecipeIds: string[] = []
): Recommendation[] {
  const weights = getDynamicWeights(context);

  const scoredList = recipes
    .filter((recipe) => !rejectedRecipeIds.includes(recipe.id))
    .map((recipe) => {
      const momentFit = scoreMomentFit(recipe, context);
      const timeFit = scoreTimeFit(recipe, context);
      const effortFit = scoreEffortFit(recipe, context);
      const hungerFit = scoreHungerFit(recipe, context);

      const invResult = evaluateInventoryAndUtilization(recipe, inventory);
      const varietyResult = scoreRecentVariety(recipe, recentMeals);

      const factors: RecommendationFactors = {
        momentFit,
        timeFit,
        effortFit,
        hungerFit,
        inventoryFit: invResult.score,
        recentVarietyFit: varietyResult.score,
        priorityFit: 1.0, // calculated within weights
        utilizationFit: invResult.utilizationScore,
      };

      // Weighted score
      const rawScore =
        factors.momentFit * weights.momentFit +
        factors.timeFit * weights.timeFit +
        factors.effortFit * weights.effortFit +
        factors.hungerFit * weights.hungerFit +
        factors.inventoryFit * weights.inventoryFit +
        factors.recentVarietyFit * weights.recentVarietyFit +
        factors.utilizationFit * weights.utilizationFit;

      // Bound between 0.05 and 0.99
      const totalScore = Math.max(0.05, Math.min(0.99, rawScore));
      const matchPercentage = Math.round(totalScore * 100);

      const { positiveReasons, penalties } = deriveExplanationsAndPenalties(
        recipe,
        context,
        factors,
        invResult.missingCoreIngredients,
        invResult.priorityIngredientsUsed
      );

      const recommendation: Recommendation = {
        id: `rec_${recipe.id}_${Date.now()}`,
        recipe,
        totalScore,
        matchPercentage,
        rank: 0,
        factors,
        positiveReasons,
        penalties,
        missingCoreIngredients: invResult.missingCoreIngredients,
        priorityIngredientsUsed: invResult.priorityIngredientsUsed,
        dataQuality: 'complete',
      };

      return recommendation;
    });

  // Sort descending by totalScore
  scoredList.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  scoredList.forEach((item, index) => {
    item.rank = index + 1;
  });

  return scoredList;
}
