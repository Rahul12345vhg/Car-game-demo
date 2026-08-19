import React from 'react';
import { Play, RotateCcw, Settings, Home } from 'lucide-react';
import { sound } from '../services/audio';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onExitToHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenSettings,
  onExitToHome,
}) => {
  return (
    <div id="pause-modal-backdrop" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="glass-panel-glow w-full max-w-sm rounded-3xl p-6 sm:p-8 border border-sky-500/40 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-3xl font-tech font-black text-neutral-100 uppercase tracking-widest mb-1 hud-text-glow">
          GAME PAUSED
        </h2>
        <p className="text-xs text-neutral-400 font-medium mb-6">Engine on standby</p>

        <div className="space-y-3">
          {/* Resume */}
          <button
            id="btn-pause-resume"
            onClick={() => { sound.playButtonClick(); onResume(); }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-neutral-950 font-tech font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            RESUME DRIVING
          </button>

          {/* Restart */}
          <button
            id="btn-pause-restart"
            onClick={() => { sound.playButtonClick(); onRestart(); }}
            className="w-full py-3.5 rounded-2xl glass-panel hover:bg-neutral-800/90 text-neutral-200 font-tech font-bold text-sm uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            RESTART MISSION
          </button>

          {/* Settings */}
          <button
            id="btn-pause-settings"
            onClick={() => { sound.playButtonClick(); onOpenSettings(); }}
            className="w-full py-3.5 rounded-2xl glass-panel hover:bg-neutral-800/90 text-neutral-200 font-tech font-bold text-sm uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            SETTINGS & AUDIO
          </button>

          {/* Exit */}
          <button
            id="btn-pause-exit"
            onClick={() => { sound.playButtonClick(); onExitToHome(); }}
            className="w-full py-3.5 rounded-2xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-tech font-bold text-sm uppercase tracking-wider border border-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            EXIT TO HOME
          </button>
        </div>
      </div>
    </div>
  );
};
