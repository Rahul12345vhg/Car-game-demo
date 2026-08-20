import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, RotateCcw, Home, ArrowRight, ShieldCheck, Timer, Award, Coins, Wrench } from 'lucide-react';
import { sound } from '../services/audio';

interface ResultModalProps {
  isWin: boolean;
  failReason?: string;
  stats?: {
    score: number;
    coinsEarned: number;
    xpEarned: number;
    stars: number;
    accuracy: number;
    time: number;
    damage: number;
  };
  onRetry: () => void;
  onNextMission?: () => void;
  onHome: () => void;
  onGarage: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isWin,
  failReason,
  stats,
  onRetry,
  onNextMission,
  onHome,
  onGarage,
}) => {
  useEffect(() => {
    if (isWin) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#1677FF', '#00CFFF', '#7C3AED', '#EC4899', '#FF8A00', '#FFD43B', '#22C55E']
        });
      } catch {
        // Fallback
      }
    }
  }, [isWin]);

  return (
    <div id="result-modal-backdrop" className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none">
      <div className="glass-panel-glow w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/20 text-center shadow-2xl bg-[#0b1329]/95 animate-in zoom-in-95 duration-200">
        {isWin ? (
          /* VICTORY VIEW */
          <div>
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#00CFFF] text-neutral-950 mb-3 shadow-[0_0_20px_rgba(34,197,94,0.5)]">
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-tech font-black text-white uppercase tracking-wider mb-1 emerald-text-glow">
              MISSION COMPLETE!
            </h2>
            <p className="text-xs text-sky-200 font-medium mb-5">Flawless driving and objective mastery</p>

            {/* 3-Star Rating Animation */}
            <div className="flex items-center justify-center gap-2.5 mb-6">
              {[1, 2, 3].map(s => {
                const isEarned = (stats?.stars ?? 1) >= s;
                return (
                  <div
                    key={s}
                    className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                      isEarned
                        ? 'bg-[#FF8A00]/25 border-[#FFD43B] text-[#FFD43B] scale-110 shadow-[0_0_18px_rgba(255,212,59,0.7)]'
                        : 'bg-[#172554]/40 border-white/10 text-white/20'
                    }`}
                  >
                    <Star className={`w-8 h-8 ${isEarned ? 'fill-current' : ''}`} />
                  </div>
                );
              })}
            </div>

            {/* Performance Stats Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5 text-left">
              <div className="glass-panel p-3 rounded-2xl border border-white/15 bg-[#172554]/60">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-sky-200 uppercase font-bold mb-0.5">
                  <Coins className="w-3.5 h-3.5 text-[#FFD43B]" />
                  COINS REWARD
                </div>
                <div className="text-xl font-tech font-black text-[#FFD43B] drop-shadow">
                  +{stats?.coinsEarned ?? 0}
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/15 bg-[#172554]/60">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-sky-200 uppercase font-bold mb-0.5">
                  <Award className="w-3.5 h-3.5 text-[#00CFFF]" />
                  XP GAINED
                </div>
                <div className="text-xl font-tech font-black text-[#00CFFF] drop-shadow">
                  +{stats?.xpEarned ?? 0} XP
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/15 bg-[#172554]/60">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-sky-200 uppercase font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                  DRIVING ACCURACY
                </div>
                <div className="text-lg font-tech font-black text-[#22C55E]">
                  {stats?.accuracy ?? 100}%
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/15 bg-[#172554]/60">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-sky-200 uppercase font-bold mb-0.5">
                  <Timer className="w-3.5 h-3.5 text-[#EC4899]" />
                  TIME / DAMAGE
                </div>
                <div className="text-lg font-tech font-black text-white">
                  {stats?.time ?? 0}s <span className="text-xs text-sky-300 font-normal">({stats?.damage ?? 0}% DMG)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {onNextMission && (
                <button
                  id="btn-result-next-mission"
                  onClick={() => { sound.playButtonClick(); onNextMission(); }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#22C55E] to-[#00CFFF] hover:brightness-110 text-neutral-950 font-tech font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/30"
                >
                  NEXT MISSION
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-result-retry"
                  onClick={() => { sound.playButtonClick(); onRetry(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-[#1677FF]/30 text-white font-tech font-bold text-xs uppercase tracking-wider border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4 text-[#00CFFF]" />
                  REPLAY
                </button>

                <button
                  id="btn-result-home"
                  onClick={() => { sound.playButtonClick(); onHome(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-[#1677FF]/30 text-white font-tech font-bold text-xs uppercase tracking-wider border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Home className="w-4 h-4 text-[#FFD43B]" />
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FAILURE VIEW */
          <div>
            <div className="inline-flex p-3 rounded-2xl bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] mb-3 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
              <RotateCcw className="w-8 h-8 animate-spin" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-tech font-black text-white uppercase tracking-wider mb-1 danger-text-glow">
              MISSION FAILED
            </h2>
            <p className="text-sm text-red-300 font-semibold mb-6">
              {failReason || 'Objective was not completed within requirements'}
            </p>

            <div className="glass-panel p-4 rounded-2xl border border-white/15 bg-[#172554]/60 mb-6 text-center">
              <div className="text-xs font-tech text-sky-200 uppercase font-bold mb-1">FINAL SCORE</div>
              <div className="text-2xl font-tech font-black text-white">{stats?.score ?? 0} PTS</div>
              <p className="text-[11px] text-sky-300 mt-1">Upgrade your vehicle handling or armor in the Garage!</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                id="btn-result-fail-retry"
                onClick={() => { sound.playButtonClick(); onRetry(); }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#EF4444] to-[#FF8A00] hover:brightness-110 text-white font-tech font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/30"
              >
                <RotateCcw className="w-4 h-4" />
                RETRY MISSION
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-result-fail-garage"
                  onClick={() => { sound.playButtonClick(); onGarage(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-[#1677FF]/30 text-white font-tech font-bold text-xs uppercase tracking-wider border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Wrench className="w-4 h-4 text-[#FF8A00]" />
                  GARAGE
                </button>

                <button
                  id="btn-result-fail-home"
                  onClick={() => { sound.playButtonClick(); onHome(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-[#1677FF]/30 text-white font-tech font-bold text-xs uppercase tracking-wider border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Home className="w-4 h-4 text-[#FFD43B]" />
                  HOME
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
