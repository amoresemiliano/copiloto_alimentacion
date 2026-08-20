import { TelemetryEvent, TelemetryEventName } from '../types/domain';

const TELEMETRY_STORAGE_KEY = 'copiloto_telemetry_events_v1';
const SESSION_ID_KEY = 'copiloto_session_id_v1';

class TelemetryService {
  private sessionId: string;
  private inMemoryEvents: TelemetryEvent[] = [];

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.loadFromStorage();
  }

  private getOrCreateSessionId(): string {
    try {
      const stored = localStorage.getItem(SESSION_ID_KEY);
      if (stored) return stored;
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(SESSION_ID_KEY, newId);
      return newId;
    } catch {
      return `session_${Date.now()}`;
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      if (raw) {
        this.inMemoryEvents = JSON.parse(raw);
      }
    } catch {
      this.inMemoryEvents = [];
    }
  }

  private saveToStorage() {
    try {
      // Keep last 250 events to prevent unbounded storage growth
      const toPersist = this.inMemoryEvents.slice(-250);
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(toPersist));
    } catch {
      // safe fallback
    }
  }

  public track(eventName: TelemetryEventName, payload: Record<string, unknown> = {}): TelemetryEvent {
    const event: TelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      eventName,
      payload,
    };

    this.inMemoryEvents.push(event);
    this.saveToStorage();

    // Log to console for development visibility
    if (typeof window !== 'undefined' && (window as unknown as { __COPILOTO_DEBUG__?: boolean }).__COPILOTO_DEBUG__) {
      console.log(`[Copiloto Telemetry] ${eventName}:`, payload);
    }

    return event;
  }

  public getEvents(): TelemetryEvent[] {
    return [...this.inMemoryEvents].reverse(); // newest first
  }

  public clearEvents() {
    this.inMemoryEvents = [];
    try {
      localStorage.removeItem(TELEMETRY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  public calculateMetrics() {
    const events = this.inMemoryEvents;
    const selections = events.filter((e) => e.eventName === 'recommendation_selected');
    const rejections = events.filter((e) => e.eventName === 'recommendation_rejected');
    const mealLogs = events.filter((e) => e.eventName === 'meal_logged');
    const generated = events.filter((e) => e.eventName === 'recommendations_generated');
    const utilizationViews = events.filter((e) => e.eventName === 'utilization_recommendations_viewed');
    const inventoryUpdates = events.filter(
      (e) =>
        e.eventName === 'inventory_status_changed' ||
        e.eventName === 'inventory_changed' ||
        e.eventName === 'utilization_status_changed' ||
        e.eventName === 'priority_ingredient_changed' ||
        e.eventName === 'inventory_quantity_changed'
    );
    const itemsAdded = events.filter((e) => e.eventName === 'inventory_item_added');

    const deviations = mealLogs.filter((e) => e.payload?.wasSuggested === false);
    const suggestedLogged = mealLogs.filter((e) => e.payload?.wasSuggested === true);

    const ranksChosen = selections
      .map((e) => Number(e.payload?.rank))
      .filter((n) => !isNaN(n) && n > 0);

    const avgRankChosen = ranksChosen.length > 0
      ? (ranksChosen.reduce((a, b) => a + b, 0) / ranksChosen.length).toFixed(1)
      : 'N/A';

    // H5 metric: Selections of dishes that use priority/consume-soon items
    const utilizationSelections = selections.filter((e) => {
      const used = e.payload?.priorityIngredientsUsed;
      return Array.isArray(used) && used.length > 0;
    });

    // Phase 3 H7 signals
    const plannedMealsAdded = events.filter((e) => e.eventName === 'planned_meal_added');
    const shoppingPurchased = events.filter((e) => e.eventName === 'shopping_item_purchased');
    const shoppingMarkedHave = events.filter((e) => e.eventName === 'shopping_item_marked_have');
    const shoppingManualAdded = events.filter((e) => e.eventName === 'shopping_item_added');
    const shoppingQtyEdited = events.filter((e) => e.eventName === 'shopping_quantity_changed');
    const purchasesApplied = events.filter((e) => e.eventName === 'purchase_applied_to_inventory');

    return {
      totalEvents: events.length,
      generationsCount: generated.length,
      selectionsCount: selections.length,
      rejectionsCount: rejections.length,
      mealsLoggedCount: mealLogs.length,
      suggestedLoggedCount: suggestedLogged.length,
      spontaneousDeviationsCount: deviations.length,
      averageRankChosen: avgRankChosen,
      // Phase 2 H5 & H6 signals
      utilizationViewsCount: utilizationViews.length,
      utilizationSelectionsCount: utilizationSelections.length,
      inventoryUpdatesCount: inventoryUpdates.length,
      inventoryItemsAddedCount: itemsAdded.length,
      // Phase 3 H7 signals
      plannedMealsAddedCount: plannedMealsAdded.length,
      shoppingPurchasedCount: shoppingPurchased.length,
      shoppingMarkedHaveCount: shoppingMarkedHave.length,
      shoppingManualAddedCount: shoppingManualAdded.length,
      shoppingQtyEditedCount: shoppingQtyEdited.length,
      purchasesAppliedCount: purchasesApplied.length,
    };
  }
}

export const telemetryService = new TelemetryService();
