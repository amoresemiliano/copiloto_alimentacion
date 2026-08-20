import React from 'react';
import { useApp } from '../context/AppContext';
import { Compass, UtensilsCrossed, History, Activity } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { currentTab, setTab } = useApp();

  const tabs: { id: 'ahora' | 'cocina' | 'historial' | 'mas'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'ahora', label: 'Ahora', icon: Compass },
    { id: 'cocina', label: 'Mi Cocina', icon: UtensilsCrossed },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'mas', label: 'Telemetría', icon: Activity },
  ];

  return (
    <>
      {/* Top Brand Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E5E5E3]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <span className="text-[#FF6321] text-base">✦</span>
            </div>
            <div>
              <span className="font-bold text-sm text-[#1A1A1A] tracking-tight block leading-tight">
                Copiloto de Alimentación
              </span>
              <span className="text-[11px] font-medium text-[#8C8C8C] block leading-tight">
                Fase 1 · ¿Qué como ahora?
              </span>
            </div>
          </div>

          {/* Desktop Tab Selector */}
          <nav className="hidden sm:flex items-center gap-1.5 bg-[#F0F0F0] p-1 rounded-full border border-[#E5E5E3]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-desktop-${tab.id}`}
                  onClick={() => setTab(tab.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1A1A1A] text-white shadow-xs'
                      : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5E3] px-3 py-2 safe-area-pb">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-mobile-${tab.id}`}
                onClick={() => setTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
                  isActive
                    ? 'text-[#1A1A1A] font-bold bg-[#F0F0F0]'
                    : 'text-[#8C8C8C] hover:text-[#1A1A1A]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-[#1A1A1A]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] font-bold mt-0.5 uppercase tracking-tighter">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
