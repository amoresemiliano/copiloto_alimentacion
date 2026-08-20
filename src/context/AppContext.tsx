import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  UserContext,
  InventoryItem,
  MealEvent,
  Recipe,
  Recommendation,
  RejectionFeedback,
  TelemetryEvent,
} from '../types/domain';
import { storageService } from '../services/storageService';
import { telemetryService } from '../services/telemetryService';
import { rankRecipes } from '../services/rankingEngine';
import { INITIAL_INVENTORY_ITEMS, INITIAL_RECIPES, INITIAL_RECENT_MEALS, INITIAL_USER_CONTEXT } from '../data/fixtures';

interface AppContextType {
  // Core state
  context: UserContext;
  inventory: InventoryItem[];
  recentMeals: MealEvent[];
  recipes: Recipe[];
  recommendations: Recommendation[];
  activeChosenRecommendation: Recommendation | null;
  rejectedRecipeIds: string[];
  currentTab: 'ahora' | 'cocina' | 'historial' | 'mas';
  telemetryEvents: TelemetryEvent[];
  
  // UI & modal state
  detailRecommendation: Recommendation | null;
  rejectionTargetRecommendation: Recommendation | null;
  isLogMealModalOpen: boolean;
  logMealPrefill: { recipe?: Recipe; suggested: boolean } | null;

  // Actions
  setTab: (tab: 'ahora' | 'cocina' | 'historial' | 'mas') => void;
  updateContext: (partial: Partial<UserContext>) => void;
  selectRecommendation: (rec: Recommendation) => void;
  clearChosenRecommendation: () => void;
  openDetailModal: (rec: Recommendation) => void;
  closeDetailModal: () => void;
  openRejectionModal: (rec: Recommendation) => void;
  closeRejectionModal: () => void;
  confirmRejection: (feedback: Omit<RejectionFeedback, 'timestamp'>) => void;
  openLogMealModal: (prefill?: { recipe?: Recipe; suggested: boolean }) => void;
  closeLogMealModal: () => void;
  logRealMeal: (params: {
    mealMoment: UserContext['moment'];
    selectedRecipeId?: string;
    recipeName?: string;
    customText?: string;
    wasSuggested: boolean;
  }) => void;
  updateInventoryItemStatus: (id: string, status: InventoryItem['status']) => void;
  updateInventoryItemPriority: (id: string, priority: InventoryItem['priority']) => void;
  resetAllFixtures: () => void;
  refreshTelemetry: () => void;
  clearRejectedList: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<UserContext>(() => storageService.getContext());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => storageService.getInventory());
  const [recentMeals, setRecentMeals] = useState<MealEvent[]>(() => storageService.getRecentMeals());
  const [recipes] = useState<Recipe[]>(() => storageService.getRecipes());
  const [rejectedRecipeIds, setRejectedRecipeIds] = useState<string[]>(() => storageService.getRejectedRecipeIds());
  const [chosenRecipeId, setChosenRecipeId] = useState<string | null>(() => storageService.getChosenRecipeId());
  const [currentTab, setCurrentTab] = useState<'ahora' | 'cocina' | 'historial' | 'mas'>('ahora');

  // Modals
  const [detailRecommendation, setDetailRecommendation] = useState<Recommendation | null>(null);
  const [rejectionTargetRecommendation, setRejectionTargetRecommendation] = useState<Recommendation | null>(null);
  const [isLogMealModalOpen, setIsLogMealModalOpen] = useState(false);
  const [logMealPrefill, setLogMealPrefill] = useState<{ recipe?: Recipe; suggested: boolean } | null>(null);
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

  // Limit to top 4 recommendations for the main view to reduce decision fatigue
  const visibleRecommendations = useMemo(() => {
    return allRankedRecommendations.slice(0, 4);
  }, [allRankedRecommendations]);

  // Track recommendation generation
  useEffect(() => {
    if (visibleRecommendations.length > 0) {
      telemetryService.track('recommendations_generated', {
        count: visibleRecommendations.length,
        topRecipeIds: visibleRecommendations.map((r) => r.recipe.id),
        topScores: visibleRecommendations.map((r) => r.totalScore),
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
  }, [visibleRecommendations, context]);

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
    telemetryService.track('recommendation_selected', {
      recommendationId: rec.id,
      recipeId: rec.recipe.id,
      recipeName: rec.recipe.name,
      rank: rec.rank,
      score: rec.totalScore,
      matchPercentage: rec.matchPercentage,
      contextSnapshot: context,
    });
    setTelemetryEvents(telemetryService.getEvents());
    if (detailRecommendation) {
      setDetailRecommendation(null);
    }
  }, [context, detailRecommendation]);

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

  const openLogMealModal = useCallback((prefill?: { recipe?: Recipe; suggested: boolean }) => {
    setLogMealPrefill(prefill || (activeChosenRecommendation ? { recipe: activeChosenRecommendation.recipe, suggested: true } : null));
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
  }) => {
    const newMeal: MealEvent = {
      id: `meal_${Date.now()}`,
      timestamp: new Date().toISOString(),
      mealMoment: params.mealMoment,
      selectedRecipeId: params.selectedRecipeId,
      recipeName: params.recipeName,
      customText: params.customText,
      wasSuggested: params.wasSuggested,
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
    });
    setTelemetryEvents(telemetryService.getEvents());
  }, [context, recentMeals]);

  const updateInventoryItemStatus = useCallback((id: string, status: InventoryItem['status']) => {
    setInventory((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
      storageService.saveInventory(next);
      telemetryService.track('inventory_changed', { itemId: id, newStatus: status });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const updateInventoryItemPriority = useCallback((id: string, priority: InventoryItem['priority']) => {
    setInventory((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, priority, updatedAt: new Date().toISOString() } : item));
      storageService.saveInventory(next);
      telemetryService.track('priority_ingredient_changed', { itemId: id, newPriority: priority });
      setTelemetryEvents(telemetryService.getEvents());
      return next;
    });
  }, []);

  const resetAllFixtures = useCallback(() => {
    storageService.resetAllToFixtures();
    setContext({ ...INITIAL_USER_CONTEXT });
    setInventory([...INITIAL_INVENTORY_ITEMS]);
    setRecentMeals([...INITIAL_RECENT_MEALS]);
    setRejectedRecipeIds([]);
    setChosenRecipeId(null);
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
    activeChosenRecommendation,
    rejectedRecipeIds,
    currentTab,
    telemetryEvents,
    detailRecommendation,
    rejectionTargetRecommendation,
    isLogMealModalOpen,
    logMealPrefill,

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
    updateInventoryItemStatus,
    updateInventoryItemPriority,
    resetAllFixtures,
    refreshTelemetry,
    clearRejectedList,
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
