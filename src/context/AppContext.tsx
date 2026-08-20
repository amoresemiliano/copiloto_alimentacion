import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserContext,
  InventoryItem,
  MealEvent,
  Recipe,
  Recommendation,
  RejectionFeedback,
  TelemetryEvent,
  PlannedMeal,
  ShoppingItem,
  ShoppingNeed,
  PurchaseEvent,
  PlanDay,
  MealMoment,
  ShoppingItemStatus,
} from '../types/domain';
import { storageService } from '../services/storageService';
import { telemetryService } from '../services/telemetryService';
import { rankRecipes } from '../services/rankingEngine';
import { calculateShoppingNeeds } from '../services/shoppingNeedsService';
import { shoppingService } from '../services/shoppingService';
import { inventoryMergeService, InventoryMergeResult } from '../services/inventoryMergeService';
import { planningService } from '../services/planningService';
import {
  INITIAL_INVENTORY_ITEMS,
  INITIAL_RECIPES,
  INITIAL_RECENT_MEALS,
  INITIAL_USER_CONTEXT,
  INITIAL_PLANNED_MEALS,
  INITIAL_SHOPPING_ITEMS,
  INITIAL_PURCHASE_HISTORY,
} from '../data/fixtures';

export type AppTab = 'ahora' | 'plan' | 'compras' | 'cocina' | 'historial' | 'mas';

interface AppContextType {
  // Core state
  context: UserContext;
  inventory: InventoryItem[];
  recentMeals: MealEvent[];
  recipes: Recipe[];
  recommendations: Recommendation[];
  allRankedRecommendations: Recommendation[];
  activeChosenRecommendation: Recommendation | null;
  rejectedRecipeIds: string[];
  currentTab: AppTab;
  telemetryEvents: TelemetryEvent[];
  
  // Phase 2: Utilization focus
  utilizationFilterIngredient: string | null;
  setUtilizationFilterIngredient: (ingredientName: string | null) => void;
  focusUtilizationIngredient: (ingredientName: string) => void;

  // Phase 3: Planning & Shopping State
  plannedMeals: PlannedMeal[];
  shoppingItems: ShoppingItem[];
  shoppingNeeds: ShoppingNeed[];
  purchaseHistory: PurchaseEvent[];
  isShoppingActiveMode: boolean;
  setIsShoppingActiveMode: (active: boolean) => void;

  // UI & modal state
  detailRecommendation: Recommendation | null;
  rejectionTargetRecommendation: Recommendation | null;
  isLogMealModalOpen: boolean;
  logMealPrefill: { recipe?: Recipe; suggested: boolean; plannedMealId?: string } | null;
  planMealPrefillRecipe: Recipe | null;
  isPlanMealModalOpen: boolean;

  // Actions
  setTab: (tab: AppTab) => void;
  updateContext: (partial: Partial<UserContext>) => void;
  selectRecommendation: (rec: Recommendation) => void;
  clearChosenRecommendation: () => void;
  openDetailModal: (rec: Recommendation) => void;
  closeDetailModal: () => void;
  openRejectionModal: (rec: Recommendation) => void;
  closeRejectionModal: () => void;
  confirmRejection: (feedback: Omit<RejectionFeedback, 'timestamp'>) => void;
  openLogMealModal: (prefill?: { recipe?: Recipe; suggested: boolean; plannedMealId?: string }) => void;
  closeLogMealModal: () => void;
  logRealMeal: (params: {
    mealMoment: UserContext['moment'];
    selectedRecipeId?: string;
    recipeName?: string;
    customText?: string;
    wasSuggested: boolean;
    plannedMealId?: string;
  }) => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => void;
  removeInventoryItem: (id: string) => void;
  updateInventoryItemStatus: (id: string, status: InventoryItem['status']) => void;
  updateInventoryItemPriority: (id: string, priority: InventoryItem['priority']) => void;
  updateInventoryItemDetails: (id: string, updates: Partial<InventoryItem>) => void;
  resetAllFixtures: () => void;
  refreshTelemetry: () => void;
  clearRejectedList: () => void;

  // Phase 3 Planning actions
  addPlannedMeal: (params: {
    day: PlanDay;
    mealMoment: MealMoment;
    recipe?: Recipe;
    recipeName?: string;
    servings?: number;
    notes?: string;
  }) => void;
  removePlannedMeal: (id: string) => void;
  updatePlannedMealServings: (id: string, servings: number) => void;
  replacePlannedMealRecipe: (id: string, newRecipe: Recipe) => void;
  openPlanMealModal: (recipe?: Recipe) => void;
  closePlanMealModal: () => void;

  // Phase 3 Shopping actions
  addManualShoppingItem: (params: {
    name: string;
    quantityText?: string;
    category?: InventoryItem['category'];
  }) => void;
  removeShoppingItem: (id: string) => void;
  updateShoppingItemStatus: (id: string, status: ShoppingItemStatus) => void;
  updateShoppingItemQuantity: (id: string, quantityText: string, numeric?: number) => void;
  syncShoppingList: () => void;
  finalizePurchase: () => InventoryMergeResult;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<UserContext>(() => storageService.getContext());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => storageService.getInventory());
  const [recentMeals, setRecentMeals] = useState<MealEvent[]>(() => storageService.getRecentMeals());
  const [recipes] = useState<Recipe[]>(() => storageService.getRecipes());
  const [rejectedRecipeIds, setRejectedRecipeIds] = useState<string[]>(() => storageService.getRejectedRecipeIds());
  const [chosenRecipeId, setChosenRecipeId] = useState<string | null>(() => storageService.getChosenRecipeId());
  const [currentTab, setCurrentTab] = useState<AppTab>('ahora');
  const [utilizationFilterIngredient, setUtilizationFilterIngredient] = useState<string | null>(null);

  // Phase 3 State
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>(() => storageService.getPlannedMeals());
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => storageService.getShoppingItems());
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseEvent[]>(() => storageService.getPurchaseHistory());
  const [isShoppingActiveMode, setIsShoppingActiveMode] = useState<boolean>(false);

  // Modals
  const [detailRecommendation, setDetailRecommendation] = useState<Recommendation | null>(null);
  const [rejectionTargetRecommendation, setRejectionTargetRecommendation] = useState<Recommendation | null>(null);
  const [isLogMealModalOpen, setIsLogMealModalOpen] = useState(false);
  const [logMealPrefill, setLogMealPrefill] = useState<{ recipe?: Recipe; suggested: boolean; plannedMealId?: string } | null>(null);
  const [isPlanMealModalOpen, setIsPlanMealModalOpen] = useState(false);
  const [planMealPrefillRecipe, setPlanMealPrefillRecipe] = useState<Recipe | null>(null);

  const [telemetryEvents, setTelemetryEvents] = useState<TelemetryEvent[]>(() => telemetryService.getEvents());

  // Track session start once
  useEffect(() => {
    telemetryService.track('session_started', {
      moment: context.moment,
      priority: context.priority,
      hunger: context.hunger,
      energy: context.energy,
    });
    setTelemetryEvents(telemetryService.getEvents());
  }, []);

  // Compute recommendations deterministically whenever inputs change
  const allRankedRecommendations = useMemo(() => {
    return rankRecipes(recipes, context, inventory, recentMeals, rejectedRecipeIds);
  }, [recipes, context, inventory, recentMeals, rejectedRecipeIds]);

  // Limit to top 4 recommendations for the main view to reduce decision fatigue (or filtered by utilization focus)
  const visibleRecommendations = useMemo(() => {
    if (utilizationFilterIngredient) {
      const filtered = allRankedRecommendations.filter((rec) =>
        rec.recipe.ingredients.some(
          (ing) =>
            ing.name.toLowerCase().includes(utilizationFilterIngredient.toLowerCase()) ||
            utilizationFilterIngredient.toLowerCase().includes(ing.name.toLowerCase())
        )
      );
      return filtered.slice(0, 4);
    }
    return allRankedRecommendations.slice(0, 4);
  }, [allRankedRecommendations, utilizationFilterIngredient]);

  // Compute ingredient needs deterministically from active planned meals and inventory
  const shoppingNeeds = useMemo(() => {
    return calculateShoppingNeeds(plannedMeals, recipes, inventory);
  }, [plannedMeals, recipes, inventory]);

  // Automatically synchronize shopping list with current needs whenever needs or inventory change
  useEffect(() => {
    setShoppingItems((prevList) => {
      const synced = shoppingService.generateShoppingListFromNeeds(shoppingNeeds, prevList, inventory);
      storageService.saveShoppingItems(synced);
      return synced;
    });
  }, [shoppingNeeds, inventory]);

  // Track recommendation generation
  useEffect(() => {
    if (visibleRecommendations.length > 0) {
      telemetryService.track('recommendations_generated', {
        count: visibleRecommendations.length,
        topRecipeIds: visibleRecommendations.map((r) => r.recipe.id),
        topScores: visibleRecommendations.map((r) => r.totalScore),
        utilizationFilter: utilizationFilterIngredient,
        contextSnapshot: {
          moment: context.moment,
          hunger: context.hunger,
          energy: context.energy,
          timeLimit: context.timeLimit,
          priority: context.priority,
        },
      });
      setTelemetryEvents(telemetryService.getEvents());
    }
  }, [visibleRecommendations, context, utilizationFilterIngredient]);

  // Focus on a specific utilization ingredient from Mi Cocina
  const focusUtilizationIngredient = useCallback((ingredientName: string) => {
    setUtilizationFilterIngredient(ingredientName);
    setCurrentTab('ahora');
    telemetryService.track('utilization_recommendations_viewed', {
      ingredientName,
    });
    setTelemetryEvents(telemetryService.getEvents());
  }, []);

  // Active chosen recommendation instance
  const activeChosenRecommendation = useMemo(() => {
    if (!chosenRecipeId) return null;
    const foundInRanked = allRankedRecommendations.find((r) => r.recipe.id === chosenRecipeId);
    if (foundInRanked) return foundInRanked;
    const recipe = recipes.find((r) => r.id === chosenRecipeId);
    if (!recipe) return null;
    return {
      id: `chosen_${recipe.id}`,
      recipe,
      totalScore: 0.9,
      matchPercentage: 90,
      rank: 1,
      factors: {
        momentFit: 1,
        timeFit: 1,
        effortFit: 1,
        hungerFit: 1,
        inventoryFit: 1,
        recentVarietyFit: 1,
        priorityFit: 1,
        utilizationFit: 1,
      },
      positiveReasons: ['Elección actual en curso.'],
      penalties: [],
      missingCoreIngredients: [],
      priorityIngredientsUsed: [],
      dataQuality: 'complete',
    };
  }, [chosenRecipeId, allRankedRecommendations, recipes]);

  const updateContext = useCallback((partial: Partial<UserContext>) => {
    setContext((prev) => {
      const next: UserContext = {
        ...prev,
        ...partial,
        lastUpdated: new Date().toISOString(),
      };
      storageService.saveContext(next);
      telemetryService.track('context_changed', {
        changedKeys: Object.keys(partial),
        newContext: next,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const selectRecommendation = useCallback((rec: Recommendation) => {
    setChosenRecipeId(rec.recipe.id);
    storageService.saveChosenRecipeId(rec.recipe.id);

    if (utilizationFilterIngredient || rec.priorityIngredientsUsed.length > 0) {
      telemetryService.track('utilization_recipe_selected', {
        recipeId: rec.recipe.id,
        recipeName: rec.recipe.name,
        rank: rec.rank,
        utilizationFilter: utilizationFilterIngredient,
        priorityIngredientsUsed: rec.priorityIngredientsUsed,
      });
    }

    telemetryService.track('recommendation_selected', {
      recommendationId: rec.id,
      recipeId: rec.recipe.id,
      recipeName: rec.recipe.name,
      rank: rec.rank,
      score: rec.totalScore,
      matchPercentage: rec.matchPercentage,
      priorityIngredientsUsed: rec.priorityIngredientsUsed,
      contextSnapshot: context,
    });
    setTelemetryEvents(telemetryService.getEvents());
    if (detailRecommendation) {
      setDetailRecommendation(null);
    }
  }, [context, detailRecommendation, utilizationFilterIngredient]);

  const clearChosenRecommendation = useCallback(() => {
    setChosenRecipeId(null);
    storageService.saveChosenRecipeId(null);
  }, []);

  const openDetailModal = useCallback((rec: Recommendation) => {
    setDetailRecommendation(rec);
    telemetryService.track('recommendation_viewed', {
      recommendationId: rec.id,
      recipeId: rec.recipe.id,
      rank: rec.rank,
      score: rec.totalScore,
    });
    setTelemetryEvents(telemetryService.getEvents());
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailRecommendation(null);
  }, []);

  const openRejectionModal = useCallback((rec: Recommendation) => {
    setRejectionTargetRecommendation(rec);
  }, []);

  const closeRejectionModal = useCallback(() => {
    setRejectionTargetRecommendation(null);
  }, []);

  const confirmRejection = useCallback((feedback: Omit<RejectionFeedback, 'timestamp'>) => {
    const nextRejected = [...rejectedRecipeIds, feedback.recipeId];
    setRejectedRecipeIds(nextRejected);
    storageService.saveRejectedRecipeIds(nextRejected);

    if (chosenRecipeId === feedback.recipeId) {
      setChosenRecipeId(null);
      storageService.saveChosenRecipeId(null);
    }

    telemetryService.track('recommendation_rejected', {
      ...feedback,
      contextSnapshot: context,
    });
    setTelemetryEvents(telemetryService.getEvents());
    setRejectionTargetRecommendation(null);
  }, [rejectedRecipeIds, chosenRecipeId, context]);

  const clearRejectedList = useCallback(() => {
    setRejectedRecipeIds([]);
    storageService.saveRejectedRecipeIds([]);
  }, []);

  const openLogMealModal = useCallback((prefill?: { recipe?: Recipe; suggested: boolean; plannedMealId?: string }) => {
    setLogMealPrefill(
      prefill ||
        (activeChosenRecommendation ? { recipe: activeChosenRecommendation.recipe, suggested: true } : null)
    );
    setIsLogMealModalOpen(true);
  }, [activeChosenRecommendation]);

  const closeLogMealModal = useCallback(() => {
    setIsLogMealModalOpen(false);
    setLogMealPrefill(null);
  }, []);

  const logRealMeal = useCallback((params: {
    mealMoment: UserContext['moment'];
    selectedRecipeId?: string;
    recipeName?: string;
    customText?: string;
    wasSuggested: boolean;
    plannedMealId?: string;
  }) => {
    const newMeal: MealEvent = {
      id: `meal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      mealMoment: params.mealMoment,
      selectedRecipeId: params.selectedRecipeId,
      recipeName: params.recipeName,
      customText: params.customText,
      wasSuggested: params.wasSuggested,
      wasPlanned: !!params.plannedMealId,
      plannedMealId: params.plannedMealId,
      contextSnapshot: {
        moment: params.mealMoment,
        hunger: context.hunger,
        energy: context.energy,
        timeLimit: context.timeLimit,
        priority: context.priority,
      },
    };

    const nextMeals = [newMeal, ...recentMeals];
    setRecentMeals(nextMeals);
    storageService.saveRecentMeals(nextMeals);

    // If a planned meal was completed, link it and update status
    if (params.plannedMealId) {
      setPlannedMeals((prev) => {
        const next = planningService.markCompleted(params.plannedMealId!, prev);
        storageService.savePlannedMeals(next);
        return next;
      });
    }

    // Clear active selection since it has been consumed
    setChosenRecipeId(null);
    storageService.saveChosenRecipeId(null);
    setIsLogMealModalOpen(false);
    setLogMealPrefill(null);

    telemetryService.track('meal_logged', {
      mealId: newMeal.id,
      mealMoment: newMeal.mealMoment,
      recipeId: newMeal.selectedRecipeId,
      recipeName: newMeal.recipeName,
      customText: newMeal.customText,
      wasSuggested: newMeal.wasSuggested,
      wasPlanned: newMeal.wasPlanned,
      plannedMealId: newMeal.plannedMealId,
    });
    setTelemetryEvents(telemetryService.getEvents());
  }, [context, recentMeals]);

  const addInventoryItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'updatedAt'>) => {
    setInventory((prev) => {
      const newItem: InventoryItem = {
        ...itemData,
        id: `inv_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        updatedAt: new Date().toISOString(),
      };
      const next = [newItem, ...prev];
      storageService.saveInventory(next);
      telemetryService.track('inventory_item_added', {
        itemId: newItem.id,
        name: newItem.name,
        category: newItem.category,
        status: newItem.status,
        priority: newItem.priority,
        location: newItem.location,
        approximateQuantity: newItem.approximateQuantity,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const removeInventoryItem = useCallback((id: string) => {
    setInventory((prev) => {
      const target = prev.find((i) => i.id === id);
      const next = prev.filter((i) => i.id !== id);
      storageService.saveInventory(next);
      telemetryService.track('inventory_item_removed', {
        itemId: id,
        name: target?.name,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const updateInventoryItemStatus = useCallback((id: string, status: InventoryItem['status']) => {
    setInventory((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
      storageService.saveInventory(next);
      telemetryService.track('inventory_status_changed', { itemId: id, newStatus: status });
      telemetryService.track('inventory_changed', { itemId: id, newStatus: status });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const updateInventoryItemPriority = useCallback((id: string, priority: InventoryItem['priority']) => {
    setInventory((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, priority, updatedAt: new Date().toISOString() } : item));
      storageService.saveInventory(next);
      telemetryService.track('utilization_status_changed', { itemId: id, newPriority: priority });
      telemetryService.track('priority_ingredient_changed', { itemId: id, newPriority: priority });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const updateInventoryItemDetails = useCallback((id: string, updates: Partial<InventoryItem>) => {
    setInventory((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item));
      storageService.saveInventory(next);
      if (updates.approximateQuantity !== undefined) {
        telemetryService.track('inventory_quantity_changed', { itemId: id, approximateQuantity: updates.approximateQuantity });
      } else {
        telemetryService.track('inventory_changed', { itemId: id, updates });
      }
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  // ----------------------------------------------------
  // Phase 3: Planning Actions
  // ----------------------------------------------------

  const addPlannedMeal = useCallback((params: {
    day: PlanDay;
    mealMoment: MealMoment;
    recipe?: Recipe;
    recipeName?: string;
    servings?: number;
    notes?: string;
  }) => {
    const newPlanned = planningService.createPlannedMeal(params);
    setPlannedMeals((prev) => {
      const next = [...prev, newPlanned];
      storageService.savePlannedMeals(next);
      return next;
    });
    telemetryService.track('planned_meal_added', {
      id: newPlanned.id,
      day: newPlanned.day,
      mealMoment: newPlanned.mealMoment,
      recipeId: newPlanned.recipeId,
      recipeName: newPlanned.recipeName,
      servings: newPlanned.servings,
      source: newPlanned.source,
    });
    setTelemetryEvents(telemetryService.getEvents());
  }, []);

  const removePlannedMeal = useCallback((id: string) => {
    setPlannedMeals((prev) => {
      const target = prev.find((m) => m.id === id);
      const next = planningService.removePlannedMeal(id, prev);
      storageService.savePlannedMeals(next);
      telemetryService.track('planned_meal_removed', {
        id,
        recipeName: target?.recipeName,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const updatePlannedMealServings = useCallback((id: string, servings: number) => {
    setPlannedMeals((prev) => {
      const next = planningService.updateServings(id, servings, prev);
      storageService.savePlannedMeals(next);
      telemetryService.track('servings_changed', {
        id,
        servings,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const replacePlannedMealRecipe = useCallback((id: string, newRecipe: Recipe) => {
    setPlannedMeals((prev) => {
      const next = planningService.replaceRecipe(id, newRecipe, prev);
      storageService.savePlannedMeals(next);
      telemetryService.track('planned_meal_replaced', {
        id,
        newRecipeId: newRecipe.id,
        newRecipeName: newRecipe.name,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const openPlanMealModal = useCallback((recipe?: Recipe) => {
    setPlanMealPrefillRecipe(recipe || null);
    setIsPlanMealModalOpen(true);
  }, []);

  const closePlanMealModal = useCallback(() => {
    setIsPlanMealModalOpen(false);
    setPlanMealPrefillRecipe(null);
  }, []);

  // ----------------------------------------------------
  // Phase 3: Shopping Actions
  // ----------------------------------------------------

  const addManualShoppingItem = useCallback((params: {
    name: string;
    quantityText?: string;
    category?: InventoryItem['category'];
  }) => {
    const newItem = shoppingService.createManualItem(params);
    setShoppingItems((prev) => {
      const next = [newItem, ...prev];
      storageService.saveShoppingItems(next);
      return next;
    });
    telemetryService.track('shopping_item_added', {
      id: newItem.id,
      name: newItem.name,
      quantityText: newItem.quantityText,
      origin: 'manual',
    });
    setTelemetryEvents(telemetryService.getEvents());
  }, []);

  const removeShoppingItem = useCallback((id: string) => {
    setShoppingItems((prev) => {
      const target = prev.find((i) => i.id === id);
      const next = prev.filter((i) => i.id !== id);
      storageService.saveShoppingItems(next);
      telemetryService.track('shopping_item_removed', {
        id,
        name: target?.name,
        origin: target?.origin,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const updateShoppingItemStatus = useCallback((id: string, status: ShoppingItemStatus) => {
    setShoppingItems((prev) => {
      const target = prev.find((i) => i.id === id);
      const next = prev.map((item) =>
        item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item
      );
      storageService.saveShoppingItems(next);

      if (status === 'purchased') {
        telemetryService.track('shopping_item_purchased', {
          id,
          name: target?.name,
          suggestedQuantity: target?.suggestedQuantity,
          finalPlannedQuantity: target?.finalPlannedQuantity,
        });
      } else if (status === 'marked_have') {
        telemetryService.track('shopping_item_marked_have', {
          id,
          name: target?.name,
        });
      }
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const updateShoppingItemQuantity = useCallback((id: string, quantityText: string, numeric?: number) => {
    setShoppingItems((prev) => {
      const target = prev.find((i) => i.id === id);
      const next = prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantityText,
              finalPlannedQuantity: numeric !== undefined ? numeric : item.finalPlannedQuantity,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      storageService.saveShoppingItems(next);
      telemetryService.track('shopping_quantity_changed', {
        id,
        name: target?.name,
        oldQuantity: target?.quantityText,
        newQuantity: quantityText,
        suggestedQuantity: target?.suggestedQuantity,
        finalPlannedQuantity: numeric,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const syncShoppingList = useCallback(() => {
    setShoppingItems((prevList) => {
      const synced = shoppingService.generateShoppingListFromNeeds(shoppingNeeds, prevList, inventory);
      storageService.saveShoppingItems(synced);
      telemetryService.track('shopping_list_generated', {
        needsCount: shoppingNeeds.length,
        itemsCount: synced.length,
      });
      setTelemetryEvents(telemetryService.getEvents());
      return synced;
    });
  }, [shoppingNeeds, inventory]);

  const finalizePurchase = useCallback((): InventoryMergeResult => {
    const result = inventoryMergeService.applyPurchaseToInventory(shoppingItems, inventory);
    
    // Save updated inventory
    setInventory(result.updatedInventory);
    storageService.saveInventory(result.updatedInventory);

    // Record purchase event in history
    const purchasedOnly = shoppingItems.filter((i) => i.status === 'purchased' || i.status === 'marked_have');
    if (purchasedOnly.length > 0) {
      const purchaseEvent: PurchaseEvent = {
        id: `purch_${Date.now()}`,
        timestamp: new Date().toISOString(),
        items: purchasedOnly,
        appliedChangesSummary: result.appliedSummary,
        source: 'shopping_purchase',
      };
      const nextHistory = [purchaseEvent, ...purchaseHistory];
      setPurchaseHistory(nextHistory);
      storageService.savePurchaseHistory(nextHistory);
    }

    // Remove purchased items from active shopping list (keep pending)
    const remainingPending = shoppingItems.filter((i) => i.status === 'pending');
    setShoppingItems(remainingPending);
    storageService.saveShoppingItems(remainingPending);

    // Track telemetry
    telemetryService.track('shopping_completed', {
      itemsPurchasedCount: result.itemsAppliedCount,
      summary: result.appliedSummary,
    });
    telemetryService.track('purchase_applied_to_inventory', {
      itemsAppliedCount: result.itemsAppliedCount,
      updatedInventoryCount: result.updatedInventory.length,
    });
    setTelemetryEvents(telemetryService.getEvents());

    return result;
  }, [shoppingItems, inventory, purchaseHistory]);

  const resetAllFixtures = useCallback(() => {
    storageService.resetAllToFixtures();
    setContext({ ...INITIAL_USER_CONTEXT });
    setInventory([...INITIAL_INVENTORY_ITEMS]);
    setRecentMeals([...INITIAL_RECENT_MEALS]);
    setPlannedMeals([...INITIAL_PLANNED_MEALS]);
    setShoppingItems([...INITIAL_SHOPPING_ITEMS]);
    setPurchaseHistory([...INITIAL_PURCHASE_HISTORY]);
    setRejectedRecipeIds([]);
    setChosenRecipeId(null);
    setUtilizationFilterIngredient(null);
    setIsShoppingActiveMode(false);
    telemetryService.track('fixtures_reset', {});
    setTelemetryEvents(telemetryService.getEvents());
  }, []);

  const refreshTelemetry = useCallback(() => {
    setTelemetryEvents(telemetryService.getEvents());
  }, []);

  const value: AppContextType = {
    context,
    inventory,
    recentMeals,
    recipes,
    recommendations: visibleRecommendations,
    allRankedRecommendations,
    activeChosenRecommendation,
    rejectedRecipeIds,
    currentTab,
    telemetryEvents,
    utilizationFilterIngredient,
    setUtilizationFilterIngredient,
    focusUtilizationIngredient,
    plannedMeals,
    shoppingItems,
    shoppingNeeds,
    purchaseHistory,
    isShoppingActiveMode,
    setIsShoppingActiveMode,
    detailRecommendation,
    rejectionTargetRecommendation,
    isLogMealModalOpen,
    logMealPrefill,
    isPlanMealModalOpen,
    planMealPrefillRecipe,

    setTab: setCurrentTab,
    updateContext,
    selectRecommendation,
    clearChosenRecommendation,
    openDetailModal,
    closeDetailModal,
    openRejectionModal,
    closeRejectionModal,
    confirmRejection,
    openLogMealModal,
    closeLogMealModal,
    logRealMeal,
    addInventoryItem,
    removeInventoryItem,
    updateInventoryItemStatus,
    updateInventoryItemPriority,
    updateInventoryItemDetails,
    resetAllFixtures,
    refreshTelemetry,
    clearRejectedList,

    // Phase 3 Actions
    addPlannedMeal,
    removePlannedMeal,
    updatePlannedMealServings,
    replacePlannedMealRecipe,
    openPlanMealModal,
    closePlanMealModal,
    addManualShoppingItem,
    removeShoppingItem,
    updateShoppingItemStatus,
    updateShoppingItemQuantity,
    syncShoppingList,
    finalizePurchase,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
};
