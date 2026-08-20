import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, Lightbulb, AlertTriangle, Disc } from 'lucide-react';
import { ControlInputs } from '../game/CarController';
import { sound } from '../services/audio';

interface MobileControlsProps {
  inputs: ControlInputs;
  onInputChange: (inputs: Partial<ControlInputs>) => void;
  onToggleLights: () => void;
  onToggleLeftSignal: () => void;
  onToggleRightSignal: () => void;
  onToggleHazard: () => void;
  onHonk: () => void;
  headlightsOn: boolean;
  leftSignalOn: boolean;
  rightSignalOn: boolean;
  hazardOn: boolean;
  gear: 'P' | 'R' | 'N' | 'D';
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onInputChange,
  onToggleLights,
  onToggleLeftSignal,
  onToggleRightSignal,
  onToggleHazard,
  onHonk,
  headlightsOn,
  leftSignalOn,
  rightSignalOn,
  hazardOn,
  gear,
}) => {
  const [isReverseMode, setIsReverseMode] = useState(false);

  const handleGasStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (isReverseMode) {
      onInputChange({ reverse: true, throttle: 1, brake: 0 });
    } else {
      onInputChange({ throttle: 1, brake: 0, reverse: false });
    }
  };

  const handleGasEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onInputChange({ throttle: 0, reverse: false });
  };

  const handleBrakeStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onInputChange({ brake: 1, throttle: 0 });
  };

  const handleBrakeEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onInputChange({ brake: 0 });
  };

  const handleSteerLeftStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onInputChange({ steer: -1 });
  };

  const handleSteerRightStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onInputChange({ steer: 1 });
  };

  const handleSteerEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onInputChange({ steer: 0 });
  };

  const handleHandbrakeStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    sound.playButtonClick();
    onInputChange({ handbrake: true });
  };

  const handleHandbrakeEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onInputChange({ handbrake: false });
  };

  const toggleReverseMode = () => {
    const next = !isReverseMode;
    setIsReverseMode(next);
    sound.playGearShift();
    onInputChange({ reverse: next });
  };

  const handleLeftSignal = () => {
    sound.playTurnIndicator();
    onToggleLeftSignal();
  };

  const handleRightSignal = () => {
    sound.playTurnIndicator();
    onToggleRightSignal();
  };

  const handleHazard = () => {
    sound.playTurnIndicator();
    onToggleHazard();
  };

  const handleLights = () => {
    sound.playButtonClick();
    onToggleLights();
  };

  return (
    <div id="mobile-controls-overlay" className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-2.5 sm:p-4 select-none safe-pb safe-pl safe-pr">
      {/* Top Secondary Controls (Turn Signals, Lights, Horn) */}
      <div className="flex justify-between items-start pointer-events-auto mt-14 sm:mt-16 px-1">
        {/* Signals and Horn */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="btn-signal-left"
            onClick={handleLeftSignal}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-sm border transition-all ${
              leftSignalOn
                ? 'bg-[#FF8A00] text-neutral-950 border-[#FFD43B] shadow-[0_0_18px_rgba(255,138,0,0.8)] animate-pulse'
                : 'glass-panel text-white/80 border-white/20 hover:border-white/40 active:scale-95'
            }`}
            title="Left Turn Signal"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            id="btn-signal-right"
            onClick={handleRightSignal}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-sm border transition-all ${
              rightSignalOn
                ? 'bg-[#FF8A00] text-neutral-950 border-[#FFD43B] shadow-[0_0_18px_rgba(255,138,0,0.8)] animate-pulse'
                : 'glass-panel text-white/80 border-white/20 hover:border-white/40 active:scale-95'
            }`}
            title="Right Turn Signal"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            id="btn-hazard-lights"
            onClick={handleHazard}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-sm border transition-all ${
              hazardOn
                ? 'bg-[#EF4444] text-white border-white shadow-[0_0_18px_rgba(239,68,68,0.8)] animate-pulse'
                : 'glass-panel text-white/80 border-white/20 active:scale-95'
            }`}
            title="Hazard Lights"
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFD43B]" />
          </button>
        </div>

        {/* Headlights & Horn */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="btn-headlights"
            onClick={handleLights}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border transition-all ${
              headlightsOn
                ? 'bg-gradient-to-br from-[#1677FF] to-[#00CFFF] text-white border-white shadow-[0_0_18px_rgba(0,207,255,0.7)]'
                : 'glass-panel text-white/80 border-white/20 active:scale-95'
            }`}
            title="Headlights"
          >
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="btn-horn"
            onPointerDown={onHonk}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl glass-panel flex items-center justify-center border border-white/20 active:bg-[#FF8A00]/40 text-white active:scale-95 shadow-md"
            title="Horn"
          >
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#00CFFF]" />
          </button>
        </div>
      </div>

      {/* Bottom Main Controls (Steering on Left, Pedals on Right) */}
      <div className="flex justify-between items-end pb-1 sm:pb-3 px-1 pointer-events-auto w-full">
        {/* Left: Directional Steering Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-steer-left"
            onTouchStart={handleSteerLeftStart}
            onTouchEnd={handleSteerEnd}
            onTouchCancel={handleSteerEnd}
            onMouseDown={handleSteerLeftStart}
            onMouseUp={handleSteerEnd}
            onMouseLeave={handleSteerEnd}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1677FF]/40 to-[#00CFFF]/40 flex flex-col items-center justify-center border-2 border-[#00CFFF]/60 active:border-white active:bg-[#1677FF]/70 active:scale-95 shadow-[0_0_15px_rgba(0,207,255,0.3)] transition-transform cursor-pointer backdrop-blur-md"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow" />
            <span className="text-[9px] sm:text-[10px] font-tech font-extrabold uppercase tracking-wider text-sky-200">LEFT</span>
          </button>

          <button
            id="btn-steer-right"
            onTouchStart={handleSteerRightStart}
            onTouchEnd={handleSteerEnd}
            onTouchCancel={handleSteerEnd}
            onMouseDown={handleSteerRightStart}
            onMouseUp={handleSteerEnd}
            onMouseLeave={handleSteerEnd}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1677FF]/40 to-[#00CFFF]/40 flex flex-col items-center justify-center border-2 border-[#00CFFF]/60 active:border-white active:bg-[#1677FF]/70 active:scale-95 shadow-[0_0_15px_rgba(0,207,255,0.3)] transition-transform cursor-pointer backdrop-blur-md"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow" />
            <span className="text-[9px] sm:text-[10px] font-tech font-extrabold uppercase tracking-wider text-sky-200">RIGHT</span>
          </button>
        </div>

        {/* Center: Handbrake Button */}
        <div className="flex flex-col items-center mb-1">
          <button
            id="btn-handbrake"
            onTouchStart={handleHandbrakeStart}
            onTouchEnd={handleHandbrakeEnd}
            onTouchCancel={handleHandbrakeEnd}
            onMouseDown={handleHandbrakeStart}
            onMouseUp={handleHandbrakeEnd}
            onMouseLeave={handleHandbrakeEnd}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#EF4444]/30 to-[#FF8A00]/30 flex flex-col items-center justify-center border-2 border-[#EF4444]/80 active:bg-[#EF4444] active:scale-90 shadow-lg text-[#EF4444] cursor-pointer backdrop-blur-md"
          >
            <Disc className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] font-tech font-black uppercase tracking-tight text-white">BRAKE</span>
          </button>
        </div>

        {/* Right: Pedals & Gear Toggle */}
        <div className="flex items-end gap-2 sm:gap-3">
          {/* Gear / Reverse Switch */}
          <button
            id="btn-reverse-toggle"
            onClick={toggleReverseMode}
            className={`w-11 h-14 sm:w-14 sm:h-18 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-lg cursor-pointer backdrop-blur-md ${
              isReverseMode
                ? 'bg-[#FF8A00] border-[#FFD43B] text-neutral-950 font-black shadow-[0_0_18px_rgba(255,138,0,0.7)]'
                : 'glass-panel border-white/25 text-white active:scale-95'
            }`}
          >
            <span className="text-[10px] font-tech font-bold uppercase text-sky-200 mb-0.5">GEAR</span>
            <span className="text-lg sm:text-2xl font-tech font-extrabold">{gear}</span>
            <span className="text-[8px] sm:text-[9px] font-bold opacity-90">{isReverseMode ? 'REV' : 'DRV'}</span>
          </button>

          {/* Brake Pedal */}
          <button
            id="btn-brake-pedal"
            onTouchStart={handleBrakeStart}
            onTouchEnd={handleBrakeEnd}
            onTouchCancel={handleBrakeEnd}
            onMouseDown={handleBrakeStart}
            onMouseUp={handleBrakeEnd}
            onMouseLeave={handleBrakeEnd}
            className="w-14 h-22 sm:w-18 sm:h-28 rounded-2xl bg-gradient-to-t from-[#EF4444] to-[#b91c1c] border-2 border-red-400 active:border-white active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.5)] flex flex-col items-center justify-center text-white cursor-pointer"
          >
            <div className="w-6 sm:w-8 h-1.5 bg-white/70 rounded-full mb-1"></div>
            <span className="text-sm sm:text-lg font-tech font-black tracking-wider text-white drop-shadow">BRAKE</span>
            <span className="text-[8px] sm:text-[9px] text-red-100 uppercase font-tech font-bold mt-0.5">STOP</span>
          </button>

          {/* Gas / Accelerator Pedal */}
          <button
            id="btn-gas-pedal"
            onTouchStart={handleGasStart}
            onTouchEnd={handleGasEnd}
            onTouchCancel={handleGasEnd}
            onMouseDown={handleGasStart}
            onMouseUp={handleGasEnd}
            onMouseLeave={handleGasEnd}
            className={`w-16 h-28 sm:w-20 sm:h-34 rounded-2xl border-2 active:scale-95 shadow-[0_0_25px_rgba(34,197,94,0.5)] flex flex-col items-center justify-center text-white transition-transform cursor-pointer ${
              isReverseMode
                ? 'bg-gradient-to-t from-[#FF8A00] to-[#c2410c] border-[#FFD43B]'
                : 'bg-gradient-to-t from-[#22C55E] to-[#15803d] border-[#86efac]'
            }`}
          >
            <div className="flex flex-col gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 opacity-80">
              <div className="w-7 sm:w-9 h-1.5 bg-white rounded-full"></div>
              <div className="w-7 sm:w-9 h-1.5 bg-white rounded-full"></div>
              <div className="w-7 sm:w-9 h-1.5 bg-white rounded-full"></div>
            </div>
            <span className="text-base sm:text-xl font-tech font-black tracking-wider text-white drop-shadow">
              {isReverseMode ? 'REV' : 'GAS'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-emerald-100 uppercase font-tech font-bold tracking-widest mt-0.5">DRIVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
