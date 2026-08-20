import React from 'react';
import { CheckCircle2, Navigation2 } from 'lucide-react';
import { ParkingState } from '../types/game';

interface ParkingGuideHUDProps {
  parkingState: ParkingState;
}

export const ParkingGuideHUD: React.FC<ParkingGuideHUDProps> = ({ parkingState }) => {
  if (!parkingState.isActive || parkingState.distance > 25) return null;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 85) return 'text-[#22C55E] border-[#22C55E] bg-[#22C55E]/20 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
    if (acc >= 65) return 'text-[#FF8A00] border-[#FF8A00] bg-[#FF8A00]/20 shadow-[0_0_10px_rgba(255,138,0,0.4)]';
    return 'text-[#EF4444] border-[#EF4444] bg-[#EF4444]/20 shadow-[0_0_10px_rgba(239,68,68,0.4)]';
  };

  const holdProgress = Math.min(100, (parkingState.holdTime / 1.5) * 100);

  return (
    <div id="parking-guide-hud" className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
      <div className="glass-panel-glow rounded-3xl p-3 sm:p-4 border border-[#00CFFF]/50 bg-[#0b1329]/95 shadow-2xl flex items-center gap-4 sm:gap-6 min-w-[280px] sm:min-w-[340px]">
        {/* Alignment Radar & Distance */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#172554] border border-[#00CFFF]/40 flex items-center justify-center relative overflow-hidden shadow-inner">
            <Navigation2
              className="w-6 h-6 text-[#00CFFF] transition-transform duration-100 drop-shadow"
              style={{ transform: `rotate(${parkingState.angleDiff}deg)` }}
            />
            {parkingState.isWithinBounds && (
              <div className="absolute inset-0 border-2 border-[#22C55E] rounded-2xl animate-ping opacity-60 pointer-events-none" />
            )}
          </div>

          <div>
            <div className="text-[10px] font-tech uppercase text-[#00CFFF] font-extrabold">PARKING BAY</div>
            <div className="text-sm font-tech font-black text-white">
              {parkingState.distance.toFixed(1)}m away
            </div>
            <div className="text-[10px] font-semibold text-sky-200">
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
            <div className="flex justify-between text-[9px] font-tech text-sky-200 uppercase font-bold mb-0.5">
              <span>HOLD STEADY</span>
              <span className="text-[#FFD43B]">{(1.5 - parkingState.holdTime).toFixed(1)}s</span>
            </div>
            <div className="w-full h-2.5 bg-[#172554] rounded-full overflow-hidden border border-white/20 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#22C55E] to-[#00CFFF] rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                style={{ width: `${holdProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Big Parking Complete Banner */}
      {parkingState.completed && (
        <div className="mt-3 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#00CFFF] text-neutral-950 font-tech font-black text-lg shadow-[0_0_25px_rgba(34,197,94,0.7)] flex items-center gap-2 animate-bounce border border-white">
          <CheckCircle2 className="w-6 h-6 text-neutral-950" />
          PARKING COMPLETE!
        </div>
      )}
    </div>
  );
};
