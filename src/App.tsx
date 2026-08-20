import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { NowScreen } from './components/NowScreen';
import { ConversationView } from './components/ConversationView';
import { PlanningScreen } from './components/PlanningScreen';
import { ShoppingScreen } from './components/ShoppingScreen';
import { KitchenScreen } from './components/KitchenScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { TelemetryView } from './components/TelemetryView';
import { DishDetailModal } from './components/DishDetailModal';
import { RejectionModal } from './components/RejectionModal';
import { MealLogModal } from './components/MealLogModal';
import { PlanMealModal } from './components/PlanMealModal';

const MainContent: React.FC = () => {
  const { currentTab } = useApp();

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#2D2D2D] flex flex-col font-sans antialiased selection:bg-[#FF6321]/20 selection:text-[#1A1A1A]">
      <Navigation />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-5 pb-24 sm:pb-14">
        {currentTab === 'ahora' && <NowScreen />}
        {currentTab === 'copiloto' && <ConversationView />}
        {currentTab === 'plan' && <PlanningScreen />}
        {currentTab === 'compras' && <ShoppingScreen />}
        {currentTab === 'cocina' && <KitchenScreen />}
        {currentTab === 'historial' && <HistoryScreen />}
        {currentTab === 'mas' && <TelemetryView />}
      </main>

      {/* Global Modals */}
      <DishDetailModal />
      <RejectionModal />
      <MealLogModal />
      <PlanMealModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

