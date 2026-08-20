import React, { useState } from 'react';
import { X, Star, Lock, Timer, Flag, Shield, Trophy, Play } from 'lucide-react';
import { MissionDefinition, UserProfile } from '../types/game';
import { GAME_MISSIONS } from '../game/constants';
import { sound } from '../services/audio';

interface MissionsModalProps {
  profile: UserProfile;
  onSelectMission: (mission: MissionDefinition) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  profile,
  onSelectMission,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Drive', 'Parking', 'Rules', 'Speed', 'Delivery'];

  const filteredMissions = GAME_MISSIONS.filter(
    m => selectedCategory === 'ALL' || m.category === selectedCategory
  );

  return (
    <div id="missions-modal-backdrop" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none">
      <div className="glass-panel-glow w-full max-w-4xl max-h-[90vh] rounded-3xl border border-[#7C3AED]/50 bg-[#0b1329]/95 flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/15 bg-gradient-to-r from-[#7C3AED]/20 to-[#EC4899]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center text-white shadow-md">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-tech font-extrabold text-white uppercase tracking-wider">
                CAREER MISSIONS
              </h2>
              <p className="text-xs text-sky-200 font-medium">Select a mission to test your precision, rules, and driving skill</p>
            </div>
          </div>

          <button
            id="btn-close-missions-modal"
            onClick={() => { sound.playButtonClick(); onClose(); }}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 px-5 sm:px-7 py-3 border-b border-white/10 bg-[#172554]/40 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { sound.playButtonClick(); setSelectedCategory(cat); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-tech font-bold uppercase transition-all whitespace-nowrap border ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white border-white/30 shadow-md font-extrabold'
                  : 'glass-panel text-white/70 border-white/10 hover:border-white/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Missions Grid */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMissions.map(m => {
            const prog = profile.missionsProgress[m.id];
            const isUnlocked = m.id === 1 || (profile.missionsProgress[m.id - 1]?.completed ?? false);
            const stars = prog?.stars || 0;
            const isCompleted = prog?.completed || false;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? 'glass-panel border-white/15 hover:border-[#EC4899]/60 hover:bg-[#7C3AED]/20 shadow-lg bg-[#172554]/60'
                    : 'bg-[#0b1329]/60 border-white/5 opacity-60'
                }`}
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#7C3AED]/30 text-[#00CFFF] border border-[#7C3AED]/40 text-[10px] font-tech font-extrabold uppercase">
                      {m.category} • MISSION #{m.id}
                    </span>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= stars
                              ? 'text-[#FFD43B] fill-current drop-shadow-[0_0_6px_rgba(255,212,59,0.8)]'
                              : 'text-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="text-base font-tech font-bold text-white mb-1">{m.title}</h3>
                  <p className="text-xs text-sky-100/80 mb-3">{m.description}</p>

                  {/* Objective & Rewards */}
                  <div className="space-y-1.5 text-xs text-sky-200">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="text-[#00CFFF] font-bold">Goal:</span> {m.objectiveText}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      {m.timeLimit && (
                        <div className="flex items-center gap-1 text-[11px] text-sky-200">
                          <Timer className="w-3.5 h-3.5 text-[#00CFFF]" />
                          <span>{m.timeLimit}s</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-[11px] text-[#FFD43B] font-bold">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>+{m.rewardCoins} Coins</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-[#22C55E] font-bold">
                        <span>+{m.rewardXp} XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  {isUnlocked ? (
                    <button
                      onClick={() => { sound.playButtonClick(); onSelectMission(m); }}
                      className={`w-full py-2.5 rounded-xl font-tech font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md border ${
                        isCompleted
                          ? 'bg-gradient-to-r from-[#22C55E] to-[#00CFFF] text-neutral-950 border-white/20 hover:brightness-110'
                          : 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white border-white/30 hover:brightness-110'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {isCompleted ? 'REPLAY MISSION' : 'START MISSION'}
                    </button>
                  ) : (
                    <div className="w-full py-2 rounded-xl bg-black/40 border border-white/10 text-white/40 font-tech font-bold text-xs uppercase flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      COMPLETE MISSION #{m.id - 1} FIRST
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
