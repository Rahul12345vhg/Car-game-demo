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
                ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse'
                : 'glass-panel text-neutral-300 border-white/10 hover:border-white/20 active:scale-95'
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
                ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse'
                : 'glass-panel text-neutral-300 border-white/10 hover:border-white/20 active:scale-95'
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
                ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse'
                : 'glass-panel text-neutral-300 border-white/10 active:scale-95'
            }`}
            title="Hazard Lights"
          >
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </button>
        </div>

        {/* Headlights & Horn */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="btn-headlights"
            onClick={handleLights}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border transition-all ${
              headlightsOn
                ? 'bg-sky-500 text-neutral-950 border-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.6)]'
                : 'glass-panel text-neutral-300 border-white/10 active:scale-95'
            }`}
            title="Headlights"
          >
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="btn-horn"
            onPointerDown={onHonk}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl glass-panel flex items-center justify-center border border-white/10 active:bg-amber-500/30 text-neutral-200 active:scale-95"
            title="Horn"
          >
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
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
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-panel flex flex-col items-center justify-center border-2 border-white/20 active:border-sky-400 active:bg-sky-600/30 active:scale-95 shadow-xl transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-neutral-100" />
            <span className="text-[9px] sm:text-[10px] font-tech font-bold uppercase tracking-wider text-neutral-400">LEFT</span>
          </button>

          <button
            id="btn-steer-right"
            onTouchStart={handleSteerRightStart}
            onTouchEnd={handleSteerEnd}
            onTouchCancel={handleSteerEnd}
            onMouseDown={handleSteerRightStart}
            onMouseUp={handleSteerEnd}
            onMouseLeave={handleSteerEnd}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl glass-panel flex flex-col items-center justify-center border-2 border-white/20 active:border-sky-400 active:bg-sky-600/30 active:scale-95 shadow-xl transition-transform cursor-pointer"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-neutral-100" />
            <span className="text-[9px] sm:text-[10px] font-tech font-bold uppercase tracking-wider text-neutral-400">RIGHT</span>
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
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full glass-panel flex flex-col items-center justify-center border border-red-500/40 active:bg-red-600/40 active:scale-90 shadow-lg text-red-400 cursor-pointer"
          >
            <Disc className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[8px] sm:text-[9px] font-tech font-extrabold uppercase tracking-tight text-red-300">HANDBRAKE</span>
          </button>
        </div>

        {/* Right: Pedals & Gear Toggle */}
        <div className="flex items-end gap-2 sm:gap-3">
          {/* Gear / Reverse Switch */}
          <button
            id="btn-reverse-toggle"
            onClick={toggleReverseMode}
            className={`w-11 h-14 sm:w-14 sm:h-18 rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-lg cursor-pointer ${
              isReverseMode
                ? 'bg-amber-600 border-amber-300 text-neutral-950 font-black shadow-[0_0_15px_rgba(217,119,6,0.6)]'
                : 'glass-panel border-white/20 text-neutral-200 active:scale-95'
            }`}
          >
            <span className="text-[10px] font-tech font-bold uppercase text-neutral-400 mb-0.5">GEAR</span>
            <span className="text-lg sm:text-2xl font-tech font-extrabold">{gear}</span>
            <span className="text-[8px] sm:text-[9px] font-medium opacity-80">{isReverseMode ? 'REV' : 'DRV'}</span>
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
            className="w-14 h-22 sm:w-18 sm:h-28 rounded-2xl bg-gradient-to-t from-red-950/90 to-red-800/90 border-2 border-red-500/60 active:border-red-400 active:bg-red-700 active:scale-95 shadow-xl flex flex-col items-center justify-center text-white cursor-pointer"
          >
            <div className="w-6 sm:w-8 h-1 bg-red-400/60 rounded-full mb-1"></div>
            <span className="text-sm sm:text-lg font-tech font-black tracking-wider text-red-100">BRAKE</span>
            <span className="text-[8px] sm:text-[9px] text-red-300 uppercase font-tech mt-0.5">STOP</span>
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
            className={`w-16 h-28 sm:w-20 sm:h-34 rounded-2xl border-2 active:scale-95 shadow-2xl flex flex-col items-center justify-center text-white transition-transform cursor-pointer ${
              isReverseMode
                ? 'bg-gradient-to-t from-amber-950/90 to-amber-700/90 border-amber-500/70 active:bg-amber-600'
                : 'bg-gradient-to-t from-emerald-950/90 to-emerald-700/90 border-emerald-500/70 active:bg-emerald-600'
            }`}
          >
            <div className="flex flex-col gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 opacity-60">
              <div className="w-7 sm:w-9 h-1 bg-white rounded-full"></div>
              <div className="w-7 sm:w-9 h-1 bg-white rounded-full"></div>
              <div className="w-7 sm:w-9 h-1 bg-white rounded-full"></div>
            </div>
            <span className="text-base sm:text-xl font-tech font-black tracking-wider text-emerald-100">
              {isReverseMode ? 'REV' : 'GAS'}
            </span>
            <span className="text-[9px] sm:text-[10px] text-neutral-200 uppercase font-tech tracking-widest mt-0.5">DRIVE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
