import React from 'react';
import { CheckCircle2, Navigation2 } from 'lucide-react';
import { ParkingState } from '../types/game';

interface ParkingGuideHUDProps {
  parkingState: ParkingState;
}

export const ParkingGuideHUD: React.FC<ParkingGuideHUDProps> = ({ parkingState }) => {
  if (!parkingState.isActive || parkingState.distance > 25) return null;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 85) return 'text-emerald-400 border-emerald-500 bg-emerald-950/70';
    if (acc >= 65) return 'text-amber-400 border-amber-500 bg-amber-950/70';
    return 'text-red-400 border-red-500 bg-red-950/70';
  };

  const holdProgress = Math.min(100, (parkingState.holdTime / 1.5) * 100);

  return (
    <div id="parking-guide-hud" className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
      <div className="glass-panel rounded-3xl p-3 sm:p-4 border border-sky-500/40 shadow-2xl flex items-center gap-4 sm:gap-6 min-w-[280px] sm:min-w-[340px]">
        {/* Alignment Radar & Distance */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-sky-500/30 flex items-center justify-center relative overflow-hidden">
            <Navigation2
              className="w-6 h-6 text-sky-400 transition-transform duration-100"
              style={{ transform: `rotate(${parkingState.angleDiff}deg)` }}
            />
            {parkingState.isWithinBounds && (
              <div className="absolute inset-0 border-2 border-emerald-400 rounded-2xl animate-ping opacity-40 pointer-events-none" />
            )}
          </div>

          <div>
            <div className="text-[10px] font-tech uppercase text-neutral-400 font-bold">PARKING BAY</div>
            <div className="text-sm font-tech font-extrabold text-neutral-100">
              {parkingState.distance.toFixed(1)}m away
            </div>
            <div className="text-[10px] font-medium text-neutral-400">
              Angle: {Math.round(parkingState.angleDiff)}° off
            </div>
          </div>
        </div>

        {/* Accuracy Gauge & Hold Timer */}
        <div className="flex-1 flex flex-col items-end">
          <div className={`px-2.5 py-0.5 rounded-lg border text-xs font-tech font-black mb-1.5 ${getAccuracyColor(parkingState.accuracy)}`}>
            {parkingState.accuracy}% ACCURACY
          </div>

          {/* Hold Stationary Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between text-[9px] font-tech text-neutral-400 uppercase font-bold mb-0.5">
              <span>HOLD STEADY</span>
              <span className="text-sky-400">{(1.5 - parkingState.holdTime).toFixed(1)}s</span>
            </div>
            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-white/10 p-0.5">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                style={{ width: `${holdProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Big Parking Complete Banner */}
      {parkingState.completed && (
        <div className="mt-3 px-6 py-2 rounded-2xl bg-emerald-500 text-neutral-950 font-tech font-black text-lg shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-neutral-950" />
          PARKING COMPLETE!
        </div>
      )}
    </div>
  );
};
