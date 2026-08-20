export type MealMoment = 'desayuno' | 'almuerzo' | 'merienda' | 'cena';

export type HungerLevel = 'poca' | 'normal' | 'mucha';

export type EnergyLevel = 'baja' | 'normal' | 'alta';

export type CookingTimeLimit = '15min' | '30min' | 'tengo_tiempo';

export type CookingMotivation = 'minimas' | 'normales' | 'tengo_ganas';

export type UserPriority = 
  | 'automatico'
  | 'rapido'
  | 'algo_rico'
  | 'mas_saludable'
  | 'economico'
  | 'usar_lo_que_tengo'
  | 'aprovechar_primero';

export interface UserContext {
  moment: MealMoment;
  hunger: HungerLevel;
  energy: EnergyLevel;
  timeLimit: CookingTimeLimit;
  motivation: CookingMotivation;
  priority: UserPriority;
  lastUpdated: string;
}

export type IngredientAvailability =
  | 'tengo'
  | 'queda_poco'
  | 'no_tengo'
  | 'desconocido'
  | 'available'
  | 'low'
  | 'unavailable'
  | 'unknown';

export type IngredientPriority =
  | 'normal'
  | 'consumir_pronto'
  | 'prioritario'
  | 'consumeSoon'
  | 'consume_soon'
  | 'priority';

export type StorageLocation = 'heladera' | 'freezer' | 'despensa' | 'frutas_verduras' | 'otra';

export type ConfidenceLevel = 'confirmed' | 'likely' | 'uncertain';

export interface InventoryItem {
  id: string;
  name: string;
  category: 'verduras' | 'lacteos_huevos' | 'carnes_proteinas' | 'despensa' | 'frutas' | 'otros';
  status: IngredientAvailability;
  priority: IngredientPriority;
  approximateQuantity?: string;
  unit?: string;
  location?: StorageLocation;
  purchaseDate?: string;
  openedDate?: string;
  declaredExpiryDate?: string;
  confidence?: ConfidenceLevel;
  source?: 'manual' | 'fixture' | 'recipe_deduction';
  notes?: string;
  unitDemo?: string;
  quantityDemo?: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  name: string;
  inventoryItemId?: string;
  quantityDemo?: string;
  isCore: boolean;
  optional?: boolean;
}

export type DishComplexity = 'muy_baja' | 'baja' | 'media' | 'alta';
export type SatietyLevel = 'ligero' | 'medio' | 'contundente';

export interface Recipe {
  id: string;
  name: string;
  description: string;
  mealMoments: MealMoment[];
  prepTimeMinutes: number;
  complexity: DishComplexity;
  satiety: SatietyLevel;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  photoUrl?: string;
  costCategory?: 'economico' | 'medio' | 'alto';
  syntheticMeta: {
    isDemo: boolean;
    nutritionNote: string;
    demoCaloriesApprox?: number;
  };
}

export interface RecommendationFactors {
  momentFit: number;        // 0 to 1
  timeFit: number;          // 0 to 1
  effortFit: number;        // 0 to 1
  hungerFit: number;        // 0 to 1
  inventoryFit: number;     // 0 to 1
  recentVarietyFit: number; // 0 to 1 (1 = fresh/varied, lower if repeated)
  priorityFit: number;      // 0 to 1
  utilizationFit: number;   // 0 to 1 (bonus for priority/consumir pronto ingredients)
}

export interface Recommendation {
  id: string;
  recipe: Recipe;
  totalScore: number;
  matchPercentage: number;
  rank: number;
  factors: RecommendationFactors;
  positiveReasons: string[];
  penalties: string[];
  missingCoreIngredients: string[];
  priorityIngredientsUsed: string[];
  dataQuality: 'complete' | 'partial';
}

export interface MealEvent {
  id: string;
  timestamp: string;
  mealMoment: MealMoment;
  selectedRecipeId?: string;
  recipeName?: string;
  customText?: string;
  wasSuggested: boolean;
  contextSnapshot?: Partial<UserContext>;
  reasonsSnapshot?: string[];
}

export interface RejectionFeedback {
  recommendationId: string;
  recipeId: string;
  reason: 'mucho_tiempo' | 'no_tengo_ganas' | 'no_me_apetece' | 'falta_ingrediente' | 'otro';
  notes?: string;
  timestamp: string;
}

export type TelemetryEventName =
  | 'session_started'
  | 'context_changed'
  | 'recommendations_generated'
  | 'recommendation_viewed'
  | 'recommendation_selected'
  | 'recommendation_rejected'
  | 'recommendation_reranked'
  | 'meal_logged'
  | 'inventory_changed'
  | 'priority_ingredient_changed'
  | 'inventory_item_added'
  | 'inventory_status_changed'
  | 'inventory_quantity_changed'
  | 'utilization_status_changed'
  | 'inventory_item_removed'
  | 'utilization_recommendations_viewed'
  | 'utilization_recipe_selected'
  | 'telemetry_inspected'
  | 'fixtures_reset';

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  eventName: TelemetryEventName;
  payload: Record<string, unknown>;
}
