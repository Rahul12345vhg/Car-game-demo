import React, { useState } from 'react';
import { X, Volume2, VolumeX, Smartphone, Monitor, RotateCcw, ShieldAlert } from 'lucide-react';
import { GameSettings, UserProfile, GraphicsQuality } from '../types/game';
import { StorageService } from '../services/storage';
import { sound } from '../services/audio';

interface SettingsModalProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  onUpdateProfile,
  onClose,
}) => {
  const [settings, setSettings] = useState<GameSettings>(profile.settings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    sound.playButtonClick();
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    const updatedProfile = StorageService.saveProfile({ settings: updated });
    onUpdateProfile(updatedProfile);

    sound.setMuted(!updated.soundEnabled, !updated.musicEnabled, !updated.engineSoundEnabled);
  };

  const handleResetData = () => {
    sound.playFailure();
    const resetProf = StorageService.resetProgress();
    onUpdateProfile(resetProf);
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div id="settings-modal-backdrop" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="glass-panel-glow w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-sky-500/30 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div>
            <h2 className="text-2xl font-tech font-black text-neutral-100 uppercase tracking-wider">
              GAME SETTINGS
            </h2>
            <p className="text-xs text-neutral-400 font-medium">Audio, Visual Quality & Input Preferences</p>
          </div>

          <button
            id="btn-close-settings-modal"
            onClick={() => { sound.playButtonClick(); onClose(); }}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Audio Section */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
            <h3 className="text-xs font-tech font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              AUDIO CONTROLS
            </h3>

            {/* Sound FX Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-200">Sound Effects</div>
                <div className="text-[11px] text-neutral-400">Crash, squeals, horns & clicks</div>
              </div>
              <button
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                  settings.soundEnabled
                    ? 'bg-sky-500 text-neutral-950 border-sky-300'
                    : 'bg-neutral-800 text-neutral-400 border-white/10'
                }`}
              >
                {settings.soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Engine Sound Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-200">Vehicle Engine Audio</div>
                <div className="text-[11px] text-neutral-400">Multi-cylinder dynamic exhaust rumble</div>
              </div>
              <button
                onClick={() => updateSetting('engineSoundEnabled', !settings.engineSoundEnabled)}
                className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                  settings.engineSoundEnabled
                    ? 'bg-sky-500 text-neutral-950 border-sky-300'
                    : 'bg-neutral-800 text-neutral-400 border-white/10'
                }`}
              >
                {settings.engineSoundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Ambient Audio Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-200">Ambient City Sounds</div>
                <div className="text-[11px] text-neutral-400">City atmosphere and background hum</div>
              </div>
              <button
                onClick={() => updateSetting('musicEnabled', !settings.musicEnabled)}
                className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                  settings.musicEnabled
                    ? 'bg-sky-500 text-neutral-950 border-sky-300'
                    : 'bg-neutral-800 text-neutral-400 border-white/10'
                }`}
              >
                {settings.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2.5">
            <h3 className="text-xs font-tech font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              GRAPHICS QUALITY
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map(qual => (
                <button
                  key={qual}
                  onClick={() => updateSetting('graphicsQuality', qual)}
                  className={`py-2.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                    settings.graphicsQuality === qual
                      ? 'bg-sky-500 text-neutral-950 border-sky-300 shadow-md font-black'
                      : 'bg-neutral-900/60 text-neutral-400 border-white/10 hover:text-white'
                  }`}
                >
                  {qual}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-400">
              LOW: Optimized for budget Android phones. HIGH: Full dynamic shadows & streetlamp illumination.
            </p>
          </div>

          {/* Vibration Haptic Feedback */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                Vibration Feedback
              </div>
              <div className="text-[11px] text-neutral-400">Haptic rumble on collisions and curbs</div>
            </div>
            <button
              onClick={() => updateSetting('vibrationEnabled', !settings.vibrationEnabled)}
              className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                settings.vibrationEnabled
                  ? 'bg-sky-500 text-neutral-950 border-sky-300'
                  : 'bg-neutral-800 text-neutral-400 border-white/10'
              }`}
            >
              {settings.vibrationEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Reset Save Data */}
          <div className="pt-2">
            {showResetConfirm ? (
              <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 space-y-2">
                <div className="text-xs text-red-300 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Are you sure you want to reset all game progress?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetData}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-tech font-black text-xs uppercase"
                  >
                    YES, RESET EVERYTHING
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-tech font-bold text-xs uppercase"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 rounded-xl glass-panel hover:bg-red-950/40 text-red-400 font-tech font-bold text-xs uppercase tracking-wider border border-red-500/20 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                RESET GAME DATA
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
