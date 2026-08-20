import { describe, it, expect } from 'vitest';
import { learningService } from '../services/learningService';
import { rankRecipes } from '../services/rankingEngine';
import { INITIAL_RECIPES, INITIAL_INVENTORY_ITEMS } from '../data/fixtures';
import { MealEvent, UserContext, AffinityProfile, LearningHypothesis } from '../types/domain';

const BASE_CONTEXT: UserContext = {
  moment: 'almuerzo',
  hunger: 'normal',
  energy: 'normal',
  timeLimit: '30min',
  motivation: 'normales',
  priority: 'automatico',
  lastUpdated: new Date().toISOString(),
};

describe('Fase 4 - Motor de Aprendizaje Comportamental e Inteligencia de Hábitos', () => {
  it('Deriva señales positivas de comidas consumidas y calcula afinidades de etiquetas', () => {
    const mealHistory: MealEvent[] = [
      {
        id: 'm1',
        timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        mealMoment: 'almuerzo',
        selectedRecipeId: 'rec_tortilla_zucchini',
        recipeName: 'Tortilla rápida de zucchini y queso',
        wasSuggested: true,
      },
      {
        id: 'm2',
        timestamp: new Date(Date.now() - 3600 * 1000 * 28).toISOString(),
        mealMoment: 'almuerzo',
        selectedRecipeId: 'rec_tortilla_zucchini',
        recipeName: 'Tortilla rápida de zucchini y queso',
        wasSuggested: true,
      },
    ];

    const signals = learningService.deriveSignalsFromHistory(mealHistory, [], [], INITIAL_RECIPES);
    expect(signals.length).toBeGreaterThan(0);

    const profile = learningService.calculateAffinityProfile(signals, {}, INITIAL_RECIPES);
    expect(profile.recipeAffinities['rec_tortilla_zucchini']).toBeGreaterThan(0);
  });

  it('Genera hipótesis determinística de "Almuerzos ágiles" ante elecciones reiteradas de poco tiempo', () => {
    const quickMealHistory: MealEvent[] = [
      {
        id: 'm1',
        timestamp: new Date().toISOString(),
        mealMoment: 'almuerzo',
        selectedRecipeId: 'rec_tortilla_zucchini', // 14 min
        recipeName: 'Tortilla',
        wasSuggested: true,
      },
      {
        id: 'm2',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        mealMoment: 'almuerzo',
        selectedRecipeId: 'rec_bowl_arroz_atun_palta', // 10 min
        recipeName: 'Bowl de atún',
        wasSuggested: true,
      },
      {
        id: 'm3',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        mealMoment: 'almuerzo',
        selectedRecipeId: 'rec_pasta_tomate_queso', // 16 min
        recipeName: 'Pasta simple',
        wasSuggested: true,
      },
    ];

    const signals = learningService.deriveSignalsFromHistory(quickMealHistory, [], [], INITIAL_RECIPES);
    const hypotheses = learningService.generateHypotheses(signals);

    const quickLunchHypothesis = hypotheses.find((h) => h.category === 'time_preference' && h.targetMoment === 'almuerzo');
    expect(quickLunchHypothesis).toBeDefined();
    expect(quickLunchHypothesis?.status).toBe('active');
    expect(quickLunchHypothesis?.evidenceCount).toBeGreaterThanOrEqual(2);
  });

  it('Cold Start (Arranque en frío): Con 0 señales, la afinidad es neutra (0.5) y no distorsiona el ranking', () => {
    const emptyProfile = learningService.calculateAffinityProfile([], {}, INITIAL_RECIPES);
    expect(emptyProfile.signalsCount).toBe(0);

    const testRecipe = INITIAL_RECIPES[0];
    const affinityFit = learningService.calculateAffinityFit(testRecipe, emptyProfile);
    expect(affinityFit.score).toBe(0.5);

    const rankingsWithoutProfile = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, INITIAL_INVENTORY_ITEMS, []);
    const rankingsWithEmptyProfile = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, INITIAL_INVENTORY_ITEMS, [], [], emptyProfile);

    // Top ranked recipe must remain identical
    expect(rankingsWithEmptyProfile[0].recipe.id).toBe(rankingsWithoutProfile[0].recipe.id);
    expect(Math.abs(rankingsWithEmptyProfile[0].totalScore - rankingsWithoutProfile[0].totalScore)).toBeLessThan(0.01);
  });

  it('Ingredientes preferidos otorgan bonificación en el ranking y agregan explicación positiva', () => {
    const baseProfile = learningService.calculateAffinityProfile([], {}, INITIAL_RECIPES);
    const profileWithFavorites = learningService.toggleFavoriteIngredient(baseProfile, 'Atún en lata');

    const tunaRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_bowl_arroz_atun_palta')!;
    const affinityResult = learningService.calculateAffinityFit(tunaRecipe, profileWithFavorites);

    expect(affinityResult.score).toBeGreaterThan(0.5);
    expect(affinityResult.reasons.some((r) => r.toLowerCase().includes('preferidos'))).toBe(true);

    const ranks = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, INITIAL_INVENTORY_ITEMS, [], [], profileWithFavorites);
    const tunaRank = ranks.find((r) => r.recipe.id === tunaRecipe.id)!;
    expect(tunaRank.positiveReasons.some((r) => r.toLowerCase().includes('preferidos') || r.toLowerCase().includes('gustan'))).toBe(true);
  });

  it('Ingredientes evitados penalizan severamente la receta e incluyen advertencia en penalizaciones', () => {
    const baseProfile = learningService.calculateAffinityProfile([], {}, INITIAL_RECIPES);
    const profileWithAvoided = learningService.toggleAvoidedIngredient(baseProfile, 'Zucchini / Calabacín');

    const zucchiniRecipe = INITIAL_RECIPES.find((r) => r.id === 'rec_tortilla_zucchini')!;
    const affinityResult = learningService.calculateAffinityFit(zucchiniRecipe, profileWithAvoided);

    expect(affinityResult.score).toBeLessThanOrEqual(0.3);
    expect(affinityResult.penalties.some((p) => p.toLowerCase().includes('evitar'))).toBe(true);

    const ranks = rankRecipes(INITIAL_RECIPES, BASE_CONTEXT, INITIAL_INVENTORY_ITEMS, [], [], profileWithAvoided);
    const zucchiniRank = ranks.find((r) => r.recipe.id === zucchiniRecipe.id)!;
    expect(zucchiniRank.penalties.some((p) => p.toLowerCase().includes('evitar'))).toBe(true);
  });

  it('Confirmación o descarte de hipótesis por parte del usuario prevalece sobre la inferencia determinística', () => {
    const dismissedHypo: LearningHypothesis = {
      id: 'hyp_lunch_quick',
      category: 'time_preference',
      title: 'Almuerzos ágiles',
      description: 'Test',
      evidenceCount: 5,
      confidence: 'baja',
      status: 'dismissed_by_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ruleKey: 'hyp_lunch_quick_preference',
      impactDescription: 'Impulso al almuerzo rápido',
      targetMoment: 'almuerzo',
      weightBonus: 0.15,
    };

    const hypoDismissed: AffinityProfile = {
      ...learningService.calculateAffinityProfile([], {}, INITIAL_RECIPES),
      hypotheses: [dismissedHypo],
    };

    const fastRecipe = INITIAL_RECIPES.find((r) => r.prepTimeMinutes <= 15)!;
    const fitDismissed = learningService.calculateContextualPreferenceFit(fastRecipe, hypoDismissed, BASE_CONTEXT);

    // Dismissed hypothesis should not apply bonus
    expect(fitDismissed.score).toBe(0.5);
  });
});
