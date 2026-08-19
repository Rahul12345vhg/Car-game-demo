import React, { useState } from 'react';
import { Pause, Camera, Navigation, Coins, ShieldAlert, Timer, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { CameraView, InGameTelemetry, MissionDefinition, TrafficViolation } from '../types/game';
import { sound } from '../services/audio';

interface GameHUDProps {
  telemetry: InGameTelemetry;
  mission: MissionDefinition | null;
  cameraView: CameraView;
  onTogglePause: () => void;
  onCycleCamera: () => void;
  violations: TrafficViolation[];
}

export const GameHUD: React.FC<GameHUDProps> = ({
  telemetry,
  mission,
  cameraView,
  onTogglePause,
  onCycleCamera,
  violations,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleFullscreen = () => {
    sound.playButtonClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    sound.playButtonClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted, nextMuted, nextMuted);
  };

  // Damage gauge color
  const getDamageColor = (dmg: number) => {
    if (dmg < 25) return 'bg-emerald-500 text-emerald-400';
    if (dmg < 60) return 'bg-amber-500 text-amber-400';
    return 'bg-red-500 text-red-400 animate-pulse';
  };

  const cameraNames: Record<CameraView, string> = {
    CHASE: 'CHASE',
    CLOSE: 'SPORT',
    HOOD: 'HOOD',
    TOP_DOWN: 'BIRD',
  };

  return (
    <div id="game-hud-root" className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-2.5 sm:p-5 select-none safe-pt safe-pb safe-pl safe-pr">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-2 w-full">
        {/* Top Left: Waypoint Mini-Radar / Distance & Score */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <div className="glass-panel rounded-2xl p-2 sm:p-2.5 flex items-center gap-2.5 border border-white/15 shadow-xl">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-950/80 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Navigation className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-[9px] sm:text-[10px] font-tech uppercase tracking-wider text-neutral-400">TARGET</div>
              <div className="text-xs sm:text-base font-tech font-black text-sky-300">
                {telemetry.distanceToObjective > 0 ? `${telemetry.distanceToObjective}m` : 'REACHED'}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl px-2.5 py-1.5 border border-white/10 hidden md:flex flex-col">
            <span className="text-[9px] font-tech text-neutral-400 uppercase">SCORE</span>
            <span className="text-sm font-tech font-black text-neutral-100">{telemetry.currentScore}</span>
          </div>

          <div className="glass-panel rounded-2xl px-2.5 py-1.5 border border-white/10 flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs sm:text-sm font-tech font-black text-amber-300">
              +{telemetry.coinsCollectedInSession}
            </span>
          </div>
        </div>

        {/* Top Center: Mission Objective & Timer */}
        {mission && (
          <div className="flex-1 max-w-sm sm:max-w-md mx-1 sm:mx-2 pointer-events-auto">
            <div className="glass-panel rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2 border border-sky-500/30 flex items-center justify-between shadow-2xl">
              <div className="truncate pr-1.5">
                <div className="text-[9px] sm:text-[10px] font-tech font-bold text-sky-400 uppercase tracking-wider truncate">
                  MISSION: {mission.title}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-neutral-100 truncate">
                  {mission.objectiveText}
                </div>
              </div>

              {telemetry.timeRemaining !== undefined && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-tech font-black text-xs sm:text-sm border ${
                  telemetry.timeRemaining <= 15
                    ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse'
                    : 'bg-neutral-900/80 border-white/10 text-neutral-200'
                }`}>
                  <Timer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>
                    {Math.floor(telemetry.timeRemaining / 60)}:
                    {(Math.floor(telemetry.timeRemaining) % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Right: Camera Toggle, Sound, Fullscreen & Pause */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Camera View Switcher */}
          <button
            id="btn-camera-view-toggle"
            onClick={onCycleCamera}
            className="glass-panel hover:bg-neutral-800/80 rounded-xl px-2.5 sm:px-3 h-9 sm:h-10 flex items-center gap-1 border border-white/15 text-[11px] sm:text-xs font-tech font-bold text-neutral-200 active:scale-95 transition-transform"
            title="Change Camera Angle (Chase, Sport, Hood, Bird)"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
            <span className="hidden sm:inline">{cameraNames[cameraView]}</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-hud-sound"
            onClick={toggleMute}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-panel hover:bg-neutral-800/80 flex items-center justify-center border border-white/15 text-neutral-200 active:scale-95 transition-transform hidden sm:flex"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="btn-hud-fullscreen"
            onClick={toggleFullscreen}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-panel hover:bg-neutral-800/80 flex items-center justify-center border border-white/15 text-neutral-200 active:scale-95 transition-transform hidden sm:flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Pause Button */}
          <button
            id="btn-pause-game"
            onClick={onTogglePause}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-panel hover:bg-neutral-800/80 flex items-center justify-center border border-white/15 text-neutral-200 active:scale-95 transition-transform"
            title="Pause Game"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Floating Traffic Violations / Bonus Toast Stack */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-40 pointer-events-none">
        {violations.slice(-3).map(v => (
          <div
            key={v.id}
            className={`px-3.5 py-1 rounded-full text-xs font-tech font-black shadow-2xl border backdrop-blur-md transition-all animate-bounce ${
              v.isBonus
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400 emerald-text-glow'
                : 'bg-red-950/90 text-red-300 border-red-500 danger-text-glow'
            }`}
          >
            {v.message}
          </div>
        ))}
      </div>

      {/* Speedometer: positioned cleanly above left controls on mobile and bottom-left on desktop */}
      <div className="fixed bottom-26 sm:bottom-4 left-3 sm:left-5 pointer-events-auto z-25">
        <div className="glass-panel-glow rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-sky-500/40 shadow-2xl flex items-center gap-3 sm:gap-5">
          {/* Digital Speedometer */}
          <div className="flex flex-col items-center min-w-[65px] sm:min-w-[80px]">
            <span className="text-3xl sm:text-5xl font-speed font-black text-neutral-50 leading-none hud-text-glow">
              {telemetry.speedKmh}
            </span>
            <span className="text-[9px] sm:text-[10px] font-tech font-extrabold text-sky-400 uppercase tracking-widest -mt-0.5">
              KM / H
            </span>

            {/* Gear Indicator */}
            <div className="flex items-center gap-1 mt-1 bg-neutral-950/80 px-2 py-0.5 rounded-md border border-white/10 font-tech font-extrabold text-[10px] sm:text-xs">
              <span className={telemetry.gear === 'P' ? 'text-red-400 font-black' : 'text-neutral-600'}>P</span>
              <span className={telemetry.gear === 'R' ? 'text-amber-400 font-black' : 'text-neutral-600'}>R</span>
              <span className={telemetry.gear === 'N' ? 'text-neutral-300 font-black' : 'text-neutral-600'}>N</span>
              <span className={telemetry.gear === 'D' ? 'text-emerald-400 font-black' : 'text-neutral-600'}>D</span>
            </div>
          </div>

          {/* Vertical Gauges: RPM & Vehicle Health/Damage */}
          <div className="flex flex-col gap-2 w-20 sm:w-28">
            {/* RPM Gauge */}
            <div>
              <div className="flex justify-between text-[8px] sm:text-[9px] font-tech text-neutral-400 uppercase font-bold mb-0.5">
                <span>RPM</span>
                <span className="text-sky-400">{Math.round(telemetry.rpm * 7500)}</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-sky-500 via-emerald-400 to-red-500"
                  style={{ width: `${Math.min(100, telemetry.rpm * 100)}%` }}
                />
              </div>
            </div>

            {/* Damage / Durability Gauge */}
            <div>
              <div className="flex justify-between text-[8px] sm:text-[9px] font-tech text-neutral-400 uppercase font-bold mb-0.5">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
                  DMG
                </span>
                <span className={telemetry.damagePercent > 50 ? 'text-red-400' : 'text-emerald-400'}>
                  {telemetry.damagePercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${getDamageColor(telemetry.damagePercent)}`}
                  style={{ width: `${Math.min(100, telemetry.damagePercent)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Handbrake Warning Pill */}
        {telemetry.handbrake && (
          <div className="inline-block mt-1.5 glass-panel px-2.5 py-1 rounded-xl border border-red-500/60 bg-red-950/80 text-red-300 font-tech font-black text-[10px] sm:text-xs animate-pulse">
            (P) HANDBRAKE ACTIVE
          </div>
        )}
      </div>
    </div>
  );
};
