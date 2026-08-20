import React, { useState } from 'react';
import { X, Volume2, VolumeX, Smartphone, Monitor, RotateCcw, ShieldAlert, Palette, Sparkles } from 'lucide-react';
import { GameSettings, UserProfile, GraphicsQuality, ColorTheme } from '../types/game';
import { THEME_CONFIGS } from '../game/constants';
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
    <div id="settings-modal-backdrop" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="glass-panel-glow w-full max-w-lg rounded-3xl p-5 sm:p-7 border border-[#00CFFF]/40 flex flex-col shadow-2xl bg-[#0b1329]/95 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-tech font-black text-white uppercase tracking-wider">
              GAME SETTINGS
            </h2>
            <p className="text-xs text-sky-200 font-medium">Themes, Audio, Visual Quality & Preferences</p>
          </div>

          <button
            id="btn-close-settings-modal"
            onClick={() => { sound.playButtonClick(); onClose(); }}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Color Themes Section */}
          <div className="glass-panel p-4 rounded-2xl border border-white/15 bg-[#172554]/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-tech font-bold text-[#00CFFF] uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#FFD43B]" />
                ATMOSPHERE & COLOR THEME
              </h3>
              <span className="text-[10px] text-sky-200 font-bold uppercase">{THEME_CONFIGS[settings.colorTheme || 'OCEAN']?.name}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(THEME_CONFIGS) as ColorTheme[]).map(themeKey => {
                const conf = THEME_CONFIGS[themeKey];
                const isSelected = (settings.colorTheme || 'OCEAN') === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => updateSetting('colorTheme', themeKey)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-[#00CFFF] bg-[#1677FF]/30 shadow-[0_0_15px_rgba(0,207,255,0.4)] ring-1 ring-[#00CFFF]'
                        : 'border-white/10 bg-[#0b1329]/60 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-tech font-black text-white">{conf.name}</span>
                      {isSelected && <Sparkles className="w-3 h-3 text-[#FFD43B]" />}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${conf.primaryColor.toString(16).padStart(6, '0')}` }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${conf.skyColor.toString(16).padStart(6, '0')}` }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${conf.fogColor.toString(16).padStart(6, '0')}` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audio Section */}
          <div className="glass-panel p-4 rounded-2xl border border-white/15 bg-[#172554]/60 space-y-3">
            <h3 className="text-xs font-tech font-bold text-[#00CFFF] uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-[#00CFFF]" />
              AUDIO CONTROLS
            </h3>

            {/* Sound FX Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Sound Effects</div>
                <div className="text-[11px] text-sky-200">Crash, squeals, horns & clicks</div>
              </div>
              <button
                onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                  settings.soundEnabled
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#00CFFF] text-white border-white/30 shadow-md'
                    : 'bg-[#0b1329]/80 text-white/50 border-white/10'
                }`}
              >
                {settings.soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Engine Sound Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Vehicle Engine Audio</div>
                <div className="text-[11px] text-sky-200">Multi-cylinder dynamic exhaust rumble</div>
              </div>
              <button
                onClick={() => updateSetting('engineSoundEnabled', !settings.engineSoundEnabled)}
                className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                  settings.engineSoundEnabled
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#00CFFF] text-white border-white/30 shadow-md'
                    : 'bg-[#0b1329]/80 text-white/50 border-white/10'
                }`}
              >
                {settings.engineSoundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Ambient Audio Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Ambient City Sounds</div>
                <div className="text-[11px] text-sky-200">City atmosphere and background hum</div>
              </div>
              <button
                onClick={() => updateSetting('musicEnabled', !settings.musicEnabled)}
                className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                  settings.musicEnabled
                    ? 'bg-gradient-to-r from-[#1677FF] to-[#00CFFF] text-white border-white/30 shadow-md'
                    : 'bg-[#0b1329]/80 text-white/50 border-white/10'
                }`}
              >
                {settings.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Graphics Quality */}
          <div className="glass-panel p-4 rounded-2xl border border-white/15 bg-[#172554]/60 space-y-2.5">
            <h3 className="text-xs font-tech font-bold text-[#00CFFF] uppercase tracking-wider flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-[#00CFFF]" />
              GRAPHICS QUALITY
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as GraphicsQuality[]).map(qual => (
                <button
                  key={qual}
                  onClick={() => updateSetting('graphicsQuality', qual)}
                  className={`py-2.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                    settings.graphicsQuality === qual
                      ? 'bg-gradient-to-r from-[#1677FF] to-[#00CFFF] text-white border-white/30 shadow-md font-black'
                      : 'bg-[#0b1329]/60 text-white/60 border-white/10 hover:text-white'
                  }`}
                >
                  {qual}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-sky-200">
              LOW: Optimized for budget phones. HIGH: Full dynamic shadows & colorful streetlamp illumination.
            </p>
          </div>

          {/* Vibration Haptic Feedback */}
          <div className="glass-panel p-4 rounded-2xl border border-white/15 bg-[#172554]/60 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-[#00CFFF]" />
                Vibration Feedback
              </div>
              <div className="text-[11px] text-sky-200">Haptic rumble on collisions and curbs</div>
            </div>
            <button
              onClick={() => updateSetting('vibrationEnabled', !settings.vibrationEnabled)}
              className={`px-4 py-1.5 rounded-xl font-tech font-bold text-xs uppercase border transition-all ${
                settings.vibrationEnabled
                  ? 'bg-gradient-to-r from-[#1677FF] to-[#00CFFF] text-white border-white/30'
                  : 'bg-[#0b1329]/80 text-white/50 border-white/10'
              }`}
            >
              {settings.vibrationEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Reset Save Data */}
          <div className="pt-2">
            {showResetConfirm ? (
              <div className="p-3.5 rounded-2xl bg-[#EF4444]/20 border border-[#EF4444] space-y-2">
                <div className="text-xs text-red-300 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                  Are you sure you want to reset all game progress?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetData}
                    className="flex-1 py-2 rounded-xl bg-[#EF4444] hover:bg-red-500 text-white font-tech font-black text-xs uppercase shadow-md"
                  >
                    YES, RESET EVERYTHING
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 text-white font-tech font-bold text-xs uppercase"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 rounded-xl glass-panel hover:bg-[#EF4444]/20 text-[#EF4444] font-tech font-bold text-xs uppercase tracking-wider border border-[#EF4444]/30 active:scale-95 flex items-center justify-center gap-1.5"
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
