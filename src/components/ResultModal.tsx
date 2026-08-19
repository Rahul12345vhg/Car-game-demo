import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Star, RotateCcw, Home, ArrowRight, ShieldCheck, Timer, Award, Coins } from 'lucide-react';
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
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Fallback
      }
    }
  }, [isWin]);

  return (
    <div id="result-modal-backdrop" className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 select-none">
      <div className="glass-panel-glow w-full max-w-md rounded-3xl p-6 sm:p-8 border border-sky-500/40 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        {isWin ? (
          /* VICTORY VIEW */
          <div>
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-tech font-black text-neutral-100 uppercase tracking-wider mb-1 emerald-text-glow">
              MISSION COMPLETE!
            </h2>
            <p className="text-xs text-neutral-400 font-medium mb-5">Flawless driving and objective mastery</p>

            {/* 3-Star Rating Animation */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {[1, 2, 3].map(s => {
                const isEarned = (stats?.stars ?? 1) >= s;
                return (
                  <div
                    key={s}
                    className={`p-2 rounded-2xl border transition-all duration-300 ${
                      isEarned
                        ? 'bg-amber-500/20 border-amber-400 text-amber-400 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                        : 'bg-neutral-900 border-white/5 text-neutral-700'
                    }`}
                  >
                    <Star className={`w-7 h-7 ${isEarned ? 'fill-amber-400' : ''}`} />
                  </div>
                );
              })}
            </div>

            {/* Performance Stats Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2.5 mb-5 text-left">
              <div className="glass-panel p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-neutral-400 uppercase font-bold mb-0.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  COINS REWARD
                </div>
                <div className="text-xl font-tech font-black text-amber-300">
                  +{stats?.coinsEarned ?? 0}
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-neutral-400 uppercase font-bold mb-0.5">
                  <Award className="w-3.5 h-3.5 text-sky-400" />
                  XP GAINED
                </div>
                <div className="text-xl font-tech font-black text-sky-300">
                  +{stats?.xpEarned ?? 0} XP
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-neutral-400 uppercase font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  DRIVING ACCURACY
                </div>
                <div className="text-lg font-tech font-black text-emerald-400">
                  {stats?.accuracy ?? 100}%
                </div>
              </div>

              <div className="glass-panel p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-1.5 text-[10px] font-tech text-neutral-400 uppercase font-bold mb-0.5">
                  <Timer className="w-3.5 h-3.5 text-purple-400" />
                  TIME / DAMAGE
                </div>
                <div className="text-lg font-tech font-black text-neutral-200">
                  {stats?.time ?? 0}s <span className="text-xs text-neutral-500 font-normal">({stats?.damage ?? 0}% DMG)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {onNextMission && (
                <button
                  id="btn-result-next-mission"
                  onClick={() => { sound.playButtonClick(); onNextMission(); }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-neutral-950 font-tech font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  NEXT MISSION
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-result-retry"
                  onClick={() => { sound.playButtonClick(); onRetry(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-neutral-800 text-neutral-200 font-tech font-bold text-xs uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  REPLAY
                </button>

                <button
                  id="btn-result-home"
                  onClick={() => { sound.playButtonClick(); onHome(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-neutral-800 text-neutral-200 font-tech font-bold text-xs uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Home className="w-4 h-4" />
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* FAILURE VIEW */
          <div>
            <div className="inline-flex p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 mb-3 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
              <RotateCcw className="w-8 h-8 animate-spin" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-tech font-black text-neutral-100 uppercase tracking-wider mb-1 danger-text-glow">
              MISSION FAILED
            </h2>
            <p className="text-sm text-red-300 font-semibold mb-6">
              {failReason || 'Objective was not completed within requirements'}
            </p>

            <div className="glass-panel p-4 rounded-2xl border border-white/10 mb-6 text-center">
              <div className="text-xs font-tech text-neutral-400 uppercase font-bold mb-1">FINAL SCORE</div>
              <div className="text-2xl font-tech font-black text-neutral-100">{stats?.score ?? 0} PTS</div>
              <p className="text-[11px] text-neutral-400 mt-1">Upgrade your vehicle handling or armor in the Garage!</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                id="btn-result-fail-retry"
                onClick={() => { sound.playButtonClick(); onRetry(); }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-tech font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                RETRY MISSION
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-result-fail-garage"
                  onClick={() => { sound.playButtonClick(); onGarage(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-neutral-800 text-neutral-200 font-tech font-bold text-xs uppercase tracking-wider border border-white/15 active:scale-95 transition-all"
                >
                  GO TO GARAGE
                </button>

                <button
                  id="btn-result-fail-home"
                  onClick={() => { sound.playButtonClick(); onHome(); }}
                  className="py-3 rounded-2xl glass-panel hover:bg-neutral-800 text-neutral-200 font-tech font-bold text-xs uppercase tracking-wider border border-white/15 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Home className="w-4 h-4" />
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
