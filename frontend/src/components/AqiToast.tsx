'use client';

import React from 'react';
import { TrendingUp, TrendingDown, X, Bell } from 'lucide-react';
import { AqiChangeNotification } from '@/lib/aqiAdvisor';

interface AqiToastProps {
  alerts: AqiChangeNotification[];
  onDismiss: (id: string) => void;
}

export default function AqiToast({ alerts, onDismiss }: AqiToastProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Real-time AQI change notifications"
      className="fixed top-4 right-4 z-[90] flex flex-col gap-3 max-w-sm w-[calc(100vw-2rem)] font-sans pointer-events-none"
    >
      {alerts.map((alert) => {
        const isIncrease = alert.direction === 'increased';
        return (
          <div
            key={alert.id}
            role={isIncrease ? 'alert' : 'status'}
            className={`pointer-events-auto rounded-xl border p-4 shadow-2xl backdrop-blur-md animate-fade-in transition-all ${
              isIncrease
                ? 'bg-[#2a1612]/95 border-rose-500/60 text-rose-50'
                : 'bg-[#12291e]/95 border-emerald-500/60 text-emerald-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  aria-hidden="true"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    isIncrease
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  {isIncrease ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold">
                    <Bell aria-hidden="true" className="w-3 h-3" />
                    <span>{isIncrease ? 'AQI Spike Alert' : 'AQI Improvement Alert'}</span>
                    <span className="opacity-75">• {alert.timestamp}</span>
                  </div>

                  <h4 className="text-xs font-bold leading-snug">{alert.headline}</h4>

                  <p className="text-[11px] leading-relaxed opacity-90">{alert.actionTip}</p>

                  <div className="pt-1 flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-black/30 border border-white/10">
                      Prev: {alert.previousAqi}
                    </span>
                    <span aria-hidden="true">→</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        isIncrease
                          ? 'bg-rose-500/25 border-rose-400/40 text-rose-200'
                          : 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200'
                      }`}
                    >
                      Now: {alert.currentAqi} ({alert.delta > 0 ? `+${alert.delta}` : alert.delta})
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(alert.id)}
                aria-label={`Dismiss AQI notification for ${alert.city}`}
                className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
