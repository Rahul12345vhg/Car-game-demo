import React, { useState } from 'react';
import { Pause, Camera, Navigation, Coins, ShieldAlert, Timer, Maximize2, Minimize2, Volume2, VolumeX, Map } from 'lucide-react';
import { CameraView, InGameTelemetry, MissionDefinition, TrafficViolation } from '../types/game';
import { Minimap } from './Minimap';
import { sound } from '../services/audio';

interface GameHUDProps {
  telemetry: InGameTelemetry;
  mission: MissionDefinition | null;
  cameraView: CameraView;
  onTogglePause: () => void;
  onCycleCamera: () => void;
  onOpenFullMap?: () => void;
  violations: TrafficViolation[];
}

export const GameHUD: React.FC<GameHUDProps> = ({
  telemetry,
  mission,
  cameraView,
  onTogglePause,
  onCycleCamera,
  onOpenFullMap,
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
    if (dmg < 25) return 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.7)]';
    if (dmg < 60) return 'bg-[#FF8A00] shadow-[0_0_8px_rgba(255,138,0,0.7)]';
    return 'bg-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse';
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
        {/* Top Left: Interactive Minimap & Stats */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {onOpenFullMap && (
            <Minimap
              playerMapPos={telemetry.playerMapPos}
              navigationRoute={telemetry.navigationRoute}
              onOpenFullMap={onOpenFullMap}
            />
          )}

          <div className="flex items-center gap-1.5">
            {/* Coins Counter */}
            <div className="glass-panel rounded-xl px-2.5 py-1 border border-[#FFD43B]/40 bg-[#172554]/80 flex items-center gap-1.5 shadow-md">
              <Coins className="w-3.5 h-3.5 text-[#FFD43B]" />
              <span className="text-xs sm:text-sm font-tech font-black text-[#FFD43B]">
                +{telemetry.coinsCollectedInSession}
              </span>
            </div>

            {/* Score Counter */}
            <div className="glass-panel rounded-xl px-2.5 py-1 border border-white/20 bg-[#172554]/80 hidden md:flex items-center gap-1.5">
              <span className="text-[9px] font-tech text-sky-300 uppercase font-bold">SCORE</span>
              <span className="text-xs sm:text-sm font-tech font-black text-white">{telemetry.currentScore}</span>
            </div>
          </div>
        </div>

        {/* Top Center: Mission Objective & Timer */}
        {mission && (
          <div className="flex-1 max-w-sm sm:max-w-md mx-1 sm:mx-2 pointer-events-auto">
            <div className="glass-panel rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2 border border-[#00CFFF]/40 bg-[#172554]/85 flex items-center justify-between shadow-2xl">
              <div className="truncate pr-1.5">
                <div className="text-[9px] sm:text-[10px] font-tech font-bold text-[#00CFFF] uppercase tracking-wider truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00CFFF] animate-ping" />
                  MISSION: {mission.title}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-white truncate">
                  {mission.objectiveText}
                </div>
              </div>

              {telemetry.timeRemaining !== undefined && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-tech font-black text-xs sm:text-sm border ${
                  telemetry.timeRemaining <= 15
                    ? 'bg-[#EF4444]/30 border-[#EF4444] text-[#EF4444] animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                    : 'bg-[#0b1329]/80 border-white/20 text-[#FFD43B]'
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

        {/* Top Right: Full Map Button, Camera Toggle, Sound, Fullscreen & Pause */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Open Full Map Button */}
          {onOpenFullMap && (
            <button
              id="btn-hud-open-map"
              onClick={onOpenFullMap}
              className="glass-panel bg-[#1677FF]/40 hover:bg-[#1677FF]/60 rounded-xl px-2.5 sm:px-3 h-9 sm:h-10 flex items-center gap-1.5 border border-[#00CFFF]/50 text-[11px] sm:text-xs font-tech font-black text-white active:scale-95 transition-transform shadow-lg"
              title="Open Full City Map"
            >
              <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00CFFF]" />
              <span className="hidden sm:inline">MAP</span>
            </button>
          )}

          {/* Camera View Switcher */}
          <button
            id="btn-camera-view-toggle"
            onClick={onCycleCamera}
            className="glass-panel bg-[#7C3AED]/40 hover:bg-[#7C3AED]/60 rounded-xl px-2.5 sm:px-3 h-9 sm:h-10 flex items-center gap-1.5 border border-[#EC4899]/50 text-[11px] sm:text-xs font-tech font-bold text-white active:scale-95 transition-transform shadow-lg"
            title="Change Camera Angle (Chase, Sport, Hood, Bird)"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EC4899]" />
            <span className="hidden sm:inline">{cameraNames[cameraView]}</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-hud-sound"
            onClick={toggleMute}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-btn flex items-center justify-center text-white active:scale-95 transition-transform hidden sm:flex"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-[#EF4444]" /> : <Volume2 className="w-4 h-4 text-[#00CFFF]" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="btn-hud-fullscreen"
            onClick={toggleFullscreen}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-btn flex items-center justify-center text-white active:scale-95 transition-transform hidden sm:flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Pause Button */}
          <button
            id="btn-pause-game"
            onClick={onTogglePause}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl glass-panel bg-[#FF8A00]/30 hover:bg-[#FF8A00]/50 flex items-center justify-center border border-[#FFD43B]/50 text-white active:scale-95 transition-transform shadow-lg"
            title="Pause Game"
          >
            <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFD43B]" />
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
                ? 'bg-[#22C55E]/90 text-neutral-950 border-[#22C55E] emerald-text-glow'
                : 'bg-[#EF4444]/90 text-white border-[#EF4444] danger-text-glow'
            }`}
          >
            {v.message}
          </div>
        ))}
      </div>

      {/* Speedometer: positioned cleanly above left controls on mobile and bottom-left on desktop */}
      <div className="fixed bottom-26 sm:bottom-4 left-3 sm:left-5 pointer-events-auto z-25">
        <div className="glass-panel-glow rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-[#00CFFF]/50 shadow-2xl flex items-center gap-3 sm:gap-5 bg-[#0b1329]/85">
          {/* Digital Speedometer */}
          <div className="flex flex-col items-center min-w-[65px] sm:min-w-[80px]">
            <span className="text-3xl sm:text-5xl font-speed font-black text-white leading-none hud-text-glow">
              {telemetry.speedKmh}
            </span>
            <span className="text-[9px] sm:text-[10px] font-tech font-extrabold text-[#00CFFF] uppercase tracking-widest -mt-0.5">
              KM / H
            </span>

            {/* Gear Indicator */}
            <div className="flex items-center gap-1.5 mt-1 bg-[#172554]/90 px-2 py-0.5 rounded-md border border-white/20 font-tech font-extrabold text-[10px] sm:text-xs shadow-inner">
              <span className={telemetry.gear === 'P' ? 'text-[#FF8A00] font-black drop-shadow' : 'text-white/30'}>P</span>
              <span className={telemetry.gear === 'R' ? 'text-[#EF4444] font-black drop-shadow' : 'text-white/30'}>R</span>
              <span className={telemetry.gear === 'N' ? 'text-[#38BDF8] font-black drop-shadow' : 'text-white/30'}>N</span>
              <span className={telemetry.gear === 'D' ? 'text-[#22C55E] font-black drop-shadow' : 'text-white/30'}>D</span>
            </div>
          </div>

          {/* Vertical Gauges: RPM & Vehicle Health/Damage */}
          <div className="flex flex-col gap-2 w-20 sm:w-28">
            {/* RPM Gauge */}
            <div>
              <div className="flex justify-between text-[8px] sm:text-[9px] font-tech text-sky-200 uppercase font-bold mb-0.5">
                <span>RPM</span>
                <span className="text-[#00CFFF]">{Math.round(telemetry.rpm * 7500)}</span>
              </div>
              <div className="w-full h-2 bg-[#0b1329] rounded-full overflow-hidden border border-white/20 p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-[#00CFFF] via-[#22C55E] to-[#EF4444]"
                  style={{ width: `${Math.min(100, telemetry.rpm * 100)}%` }}
                />
              </div>
            </div>

            {/* Damage / Durability Gauge */}
            <div>
              <div className="flex justify-between text-[8px] sm:text-[9px] font-tech text-sky-200 uppercase font-bold mb-0.5">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-2.5 h-2.5 text-[#FF8A00]" />
                  DMG
                </span>
                <span className={telemetry.damagePercent > 50 ? 'text-[#EF4444]' : 'text-[#22C55E]'}>
                  {telemetry.damagePercent}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#0b1329] rounded-full overflow-hidden border border-white/20 p-0.5">
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
          <div className="inline-block mt-1.5 glass-panel px-2.5 py-1 rounded-xl border border-[#EF4444] bg-[#EF4444]/30 text-[#EF4444] font-tech font-black text-[10px] sm:text-xs animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)]">
            (P) HANDBRAKE ACTIVE
          </div>
        )}
      </div>
    </div>
  );
};
