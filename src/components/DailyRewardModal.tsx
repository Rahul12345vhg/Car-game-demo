import React from 'react';
import { X, Gift, Check, Sparkles, Coins } from 'lucide-react';
import { UserProfile } from '../types/game';
import { StorageService } from '../services/storage';
import { sound } from '../services/audio';

interface DailyRewardModalProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onClose: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  profile,
  onUpdateProfile,
  onClose,
}) => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const lastClaim = profile.lastDailyRewardTimestamp || 0;
  const canClaim = now - lastClaim >= oneDayMs;

  const currentStreakDay = (profile.dailyRewardStreak % 7) + 1;

  const rewards = [
    { day: 1, coins: 150, xp: 50 },
    { day: 2, coins: 300, xp: 100 },
    { day: 3, coins: 500, xp: 150 },
    { day: 4, coins: 750, xp: 200 },
    { day: 5, coins: 1000, xp: 300 },
    { day: 6, coins: 1500, xp: 450 },
    { day: 7, coins: 3000, xp: 1000, isSuper: true },
  ];

  const handleClaim = () => {
    if (!canClaim) return;
    sound.playSuccess();
    const todayReward = rewards[currentStreakDay - 1];

    StorageService.addCoins(todayReward.coins);
    StorageService.addXp(todayReward.xp);

    const updated = StorageService.saveProfile({
      lastDailyRewardTimestamp: now,
      dailyRewardStreak: profile.dailyRewardStreak + 1,
    });

    onUpdateProfile(updated);
  };

  return (
    <div id="daily-reward-modal-backdrop" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="glass-panel-glow w-full max-w-md rounded-3xl p-6 sm:p-8 border border-[#FFD43B]/50 bg-[#0b1329]/95 flex flex-col shadow-2xl text-center animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-4 bg-gradient-to-r from-[#FF8A00]/20 to-[#FFD43B]/20 -mx-6 -mt-6 p-6 rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF8A00] to-[#FFD43B] flex items-center justify-center text-neutral-950 shadow-md">
              <Gift className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-tech font-black text-white uppercase tracking-wider text-left">
              DAILY REWARD
            </h2>
          </div>

          <button
            onClick={() => { sound.playButtonClick(); onClose(); }}
            className="w-9 h-9 rounded-xl glass-btn flex items-center justify-center text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-sky-200 mb-5 text-left">
          Log in each consecutive day to claim escalating coin bonuses and driver XP rewards!
        </p>

        {/* 7-Day Grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-6">
          {rewards.map(r => {
            const isPast = r.day < currentStreakDay;
            const isToday = r.day === currentStreakDay;
            const isLocked = r.day > currentStreakDay;

            return (
              <div
                key={r.day}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-between transition-all ${
                  isToday
                    ? 'border-[#FFD43B] bg-[#FF8A00]/25 shadow-[0_0_18px_rgba(255,212,59,0.5)] scale-105 ring-2 ring-[#FFD43B]'
                    : isPast
                    ? 'border-[#22C55E]/50 bg-[#22C55E]/15 text-[#22C55E]'
                    : 'border-white/10 bg-[#172554]/40 opacity-60'
                } ${r.isSuper ? 'col-span-2 bg-gradient-to-br from-[#FF8A00]/30 via-[#7C3AED]/30 to-[#EC4899]/30' : ''}`}
              >
                <div className="text-[10px] font-tech font-extrabold uppercase text-sky-200">
                  DAY {r.day}
                </div>

                <div className="my-1 text-center">
                  <div className="text-sm font-tech font-black text-[#FFD43B] drop-shadow">
                    +{r.coins}
                  </div>
                  <div className="text-[9px] font-tech font-bold text-[#00CFFF]">
                    +{r.xp} XP
                  </div>
                </div>

                {isPast ? (
                  <Check className="w-4 h-4 text-[#22C55E]" />
                ) : isToday ? (
                  <Sparkles className="w-4 h-4 text-[#FFD43B] animate-spin" />
                ) : (
                  <Coins className="w-3.5 h-3.5 text-white/40" />
                )}
              </div>
            );
          })}
        </div>

        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={!canClaim}
          className={`w-full py-3.5 rounded-2xl font-tech font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl border ${
            canClaim
              ? 'bg-gradient-to-r from-[#FF8A00] to-[#FFD43B] hover:brightness-110 text-neutral-950 border-white/30 active:scale-95 shadow-[0_0_20px_rgba(255,138,0,0.6)]'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border-white/5'
          }`}
        >
          <Gift className="w-4 h-4" />
          {canClaim ? 'CLAIM TODAY’S REWARD' : 'REWARD ALREADY CLAIMED TODAY'}
        </button>
      </div>
    </div>
  );
};
