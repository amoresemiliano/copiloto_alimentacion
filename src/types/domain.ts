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
  quantityNumeric?: number;
  unit?: string;
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
  affinityFit?: number;     // 0 to 1 (0.5 = neutral, >0.5 positive learned affinity, <0.5 penalized)
  contextualPreferenceFit?: number; // 0 to 1
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
  wasPlanned?: boolean;
  plannedMealId?: string;
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

// ----------------------------------------------------
// FASE 3: Planificación + Compras Inteligentes
// ----------------------------------------------------

export type PlannedMealStatus = 'planned' | 'completed' | 'skipped' | 'replaced';
export type PlannedMealSource = 'manual' | 'recommendation_save' | 'suggestion';
export type PlanDay = 'hoy' | 'manana' | 'proximos_dias';

export interface PlannedMeal {
  id: string;
  day: PlanDay;
  dateLabel?: string;
  mealMoment: MealMoment;
  recipeId?: string;
  recipeName: string;
  servings: number;
  status: PlannedMealStatus;
  source: PlannedMealSource;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NeedSuggestedAction = 'comprar' | 'probablemente_comprar' | 'revisar_en_casa' | 'cubierto';

export interface ShoppingNeed {
  id: string;
  ingredientName: string;
  inventoryItemId?: string;
  totalRequiredQuantity?: number;
  unit?: string;
  formattedRequired?: string;
  inventoryStatus: IngredientAvailability;
  inventoryQuantity?: number;
  inventoryQuantityRaw?: string;
  inventoryPriority?: IngredientPriority;
  suggestedAction: NeedSuggestedAction;
  reason: string;
  plannedMealIds: string[];
  plannedMealTitles: string[];
  suggestedQuantity?: number;
  suggestedQuantityText?: string;
}

export type ShoppingItemOrigin = 'suggested' | 'manual';
export type ShoppingItemStatus = 'pending' | 'marked_have' | 'purchased';

export interface ShoppingItem {
  id: string;
  name: string;
  category?: InventoryItem['category'];
  suggestedQuantity?: number;
  finalPlannedQuantity?: number;
  purchasedQuantity?: number;
  unit?: string;
  quantityText?: string;
  reason: string;
  origin: ShoppingItemOrigin;
  status: ShoppingItemStatus;
  needLevel?: NeedSuggestedAction;
  inventoryItemId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseEvent {
  id: string;
  timestamp: string;
  items: ShoppingItem[];
  appliedChangesSummary: string[];
  source: 'shopping_purchase';
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
  | 'fixtures_reset'
  // Phase 3 events
  | 'planned_meal_added'
  | 'planned_meal_removed'
  | 'planned_meal_replaced'
  | 'servings_changed'
  | 'shopping_list_generated'
  | 'shopping_item_added'
  | 'shopping_item_removed'
  | 'shopping_quantity_changed'
  | 'shopping_item_marked_have'
  | 'shopping_item_purchased'
  | 'shopping_session_started'
  | 'shopping_completed'
  | 'purchase_applied_to_inventory'
  // Phase 4 events
  | 'signal_recorded'
  | 'hypothesis_generated'
  | 'hypothesis_confirmed'
  | 'hypothesis_dismissed'
  | 'hypothesis_paused'
  | 'hypothesis_updated'
  | 'preference_updated'
  | 'favorite_ingredient_toggled'
  | 'avoided_ingredient_toggled'
  | 'affinity_profile_updated'
  | 'learning_profile_reset'
  // Phase 5 events
  | 'conversation_started'
  | 'conversation_message_sent'
  | 'conversation_intent_detected'
  | 'conversation_intent_corrected'
  | 'conversation_action_executed'
  | 'conversation_clarification_requested'
  | 'conversation_fallback'
  | 'conversation_recommendation_selected'
  | 'conversation_meal_logged'
  | 'conversation_inventory_updated'
  | 'conversation_purchase_updated'
  | 'conversation_preference_updated'
  | 'conversation_hypothesis_updated';

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  eventName: TelemetryEventName;
  payload: Record<string, unknown>;
}

// ----------------------------------------------------
// FASE 4: Historial + Aprendizaje Comportamental
// ----------------------------------------------------

export type BehavioralSignalType =
  | 'recipe_selected'
  | 'recipe_rejected'
  | 'recipe_planned'
  | 'plan_completed'
  | 'plan_skipped'
  | 'meal_logged_spontaneous'
  | 'favorite_ingredient_added'
  | 'avoided_ingredient_added'
  | 'explicit_preference_set'
  | 'manual_time_override';

export interface BehavioralSignal {
  id: string;
  type: BehavioralSignalType;
  source: 'explicit' | 'implicit';
  timestamp: string;
  recipeId?: string;
  recipeName?: string;
  tags?: string[];
  ingredientNames?: string[];
  mealMoment?: MealMoment;
  rejectionReason?: RejectionFeedback['reason'];
  contextSnapshot?: Partial<UserContext>;
  weight: number; // 0.1 to 1.0 based on signal strength and recency
  metadata?: Record<string, unknown>;
}

export type HypothesisCategory =
  | 'time_preference'
  | 'effort_preference'
  | 'ingredient_affinity'
  | 'tag_affinity'
  | 'moment_pattern'
  | 'planning_adherence';

export type HypothesisConfidence = 'baja' | 'media' | 'alta';
export type HypothesisStatus = 'active' | 'confirmed_by_user' | 'dismissed_by_user' | 'paused';

export interface LearningHypothesis {
  id: string;
  category: HypothesisCategory;
  title: string;
  description: string;
  evidenceCount: number;
  confidence: HypothesisConfidence;
  status: HypothesisStatus;
  createdAt: string;
  updatedAt: string;
  ruleKey: string;
  impactDescription: string;
  targetMoment?: MealMoment;
  targetTag?: string;
  targetIngredient?: string;
  weightBonus: number; // e.g., +0.08 or -0.15
}

export interface MomentPreferenceLearned {
  maxPreferredTime?: number;
  preferredComplexity?: DishComplexity;
  preferredSatiety?: SatietyLevel;
  topPreferredTags?: string[];
}

export interface AffinityProfile {
  favoriteIngredients: string[];
  avoidedIngredients: string[];
  tagAffinities: Record<string, number>; // -1.0 to +1.0
  recipeAffinities: Record<string, number>; // recipeId -> score bias -0.3 to +0.3
  momentPreferences: {
    almuerzo?: MomentPreferenceLearned;
    cena?: MomentPreferenceLearned;
    desayuno?: MomentPreferenceLearned;
    merienda?: MomentPreferenceLearned;
  };
  energyPatterns: {
    whenLowEnergyPrefersQuick: boolean;
    whenLowEnergyPrefersSimple: boolean;
  };
  hypotheses: LearningHypothesis[];
  signalsCount: number;
  lastCalculatedAt: string;
}

// ----------------------------------------------------
// FASE 5: Interfaz Conversacional sobre Cerebro Compartido
// ----------------------------------------------------

export interface DietaryRestriction {
  id: string;
  type: 'allergy' | 'intolerance' | 'strict_exclusion';
  ingredientOrCategory: string;
  notes?: string;
  createdAt: string;
}

export type ConversationRole = 'user' | 'assistant' | 'system';

export type ConversationIntentType =
  | 'get_recommendations'
  | 'update_context'
  | 'query_inventory'
  | 'update_inventory'
  | 'log_real_meal'
  | 'query_planning'
  | 'plan_meal'
  | 'query_shopping'
  | 'update_shopping'
  | 'query_learning'
  | 'correct_learning'
  | 'set_preference'
  | 'explain_recommendation'
  | 'fallback_unknown';

export interface ConversationIngredientEntity {
  name: string;
  action?: 'add' | 'remove' | 'set_status' | 'consume_soon';
  status?: IngredientAvailability;
  priority?: IngredientPriority;
  quantityText?: string;
  confidence?: ConfidenceLevel;
  notes?: string;
}

export interface ConversationIntentEntities {
  moment?: MealMoment;
  hunger?: HungerLevel;
  energy?: EnergyLevel;
  timeLimit?: CookingTimeLimit;
  motivation?: CookingMotivation;
  priority?: UserPriority;
  ingredients?: ConversationIngredientEntity[];
  mealText?: string;
  recipeName?: string;
  recipeId?: string;
  planDay?: PlanDay;
  preferenceType?: 'permanent_dislike' | 'contextual_dislike' | 'hard_restriction' | 'favorite';
  preferenceValue?: string;
  hypothesisFeedback?: 'confirm' | 'dismiss' | 'reassess';
  hypothesisId?: string;
  shoppingItemNames?: string[];
  queryTarget?: 'general' | 'expiring_soon' | 'fridge' | 'pantry';
  uncertainty?: boolean;
}

export interface ConversationIntent {
  type: ConversationIntentType;
  confidence: number; // 0 to 1
  rawMessage: string;
  entities: ConversationIntentEntities;
  clarificationNeeded?: boolean;
  clarificationPrompt?: string;
  proposedActionSummary?: string;
}

export type ConversationActionType =
  | 'UPDATE_CONTEXT'
  | 'FETCH_RECOMMENDATIONS'
  | 'UPDATE_INVENTORY_ITEMS'
  | 'LOG_REAL_MEAL'
  | 'PLAN_MEAL'
  | 'UPDATE_SHOPPING_ITEMS'
  | 'APPLY_PURCHASE'
  | 'SET_PREFERENCE'
  | 'UPDATE_HYPOTHESIS'
  | 'SHOW_INSIGHTS'
  | 'EXPLAIN_RECOMMENDATION'
  | 'REQUEST_CLARIFICATION'
  | 'FALLBACK';

export interface ConversationAction {
  type: ConversationActionType;
  payload: Record<string, unknown>;
  status: 'executed' | 'pending_confirmation' | 'cancelled';
  description: string;
}

export interface ConversationExplanation {
  recipeId: string;
  recipeName: string;
  matchPercentage: number;
  totalScore: number;
  positiveReasons: string[];
  penalties: string[];
  factors: RecommendationFactors;
  missingIngredients: string[];
}

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  text: string;
  timestamp: string;
  intent?: ConversationIntent;
  actions?: ConversationAction[];
  payload?: {
    recommendations?: Recommendation[];
    inventoryItems?: InventoryItem[];
    plannedMeals?: PlannedMeal[];
    shoppingItems?: ShoppingItem[];
    hypotheses?: LearningHypothesis[];
    explanation?: ConversationExplanation;
    suggestedReplies?: string[];
    appliedChangesSummary?: string[];
    dietaryRestrictions?: DietaryRestriction[];
  };
}
