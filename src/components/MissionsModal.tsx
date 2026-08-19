import React, { useState } from 'react';
import { X, Star, Lock, Timer, Flag, Shield, Trophy } from 'lucide-react';
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
      <div className="glass-panel-glow w-full max-w-4xl max-h-[90vh] rounded-3xl border border-sky-500/30 flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-tech font-extrabold text-neutral-100 uppercase tracking-wider">
                CAREER MISSIONS
              </h2>
              <p className="text-xs text-neutral-400 font-medium">Select a mission to test your precision and driving skill</p>
            </div>
          </div>

          <button
            id="btn-close-missions-modal"
            onClick={() => { sound.playButtonClick(); onClose(); }}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 px-5 sm:px-7 py-3 border-b border-white/10 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { sound.playButtonClick(); setSelectedCategory(cat); }}
              className={`px-4 py-1.5 rounded-xl text-xs font-tech font-bold uppercase transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-sky-500 text-neutral-950 shadow-md font-extrabold'
                  : 'glass-panel text-neutral-300 border-white/10 hover:border-white/20'
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
            // Mission is unlocked if ID == 1 or previous mission was completed
            const isUnlocked = m.id === 1 || (profile.missionsProgress[m.id - 1]?.completed ?? false);
            const stars = prog?.stars || 0;
            const isCompleted = prog?.completed || false;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? 'glass-panel border-white/15 hover:border-sky-400/60 hover:bg-sky-950/20 shadow-lg'
                    : 'bg-neutral-950/60 border-white/5 opacity-60'
                }`}
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-tech font-extrabold uppercase">
                      {m.category} • MISSION #{m.id}
                    </span>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= stars
                              ? 'text-amber-400 fill-amber-400 drop-shadow'
                              : 'text-neutral-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="text-base font-tech font-extrabold text-neutral-100 tracking-wide mb-1">
                    {m.title}
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3 line-clamp-2">{m.description}</p>

                  {/* Badges / Specs */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-tech text-neutral-300 mb-4">
                    {m.timeLimit && (
                      <span className="flex items-center gap-1 bg-neutral-900/80 px-2 py-0.5 rounded-lg border border-white/10">
                        <Timer className="w-3 h-3 text-sky-400" />
                        {m.timeLimit}s LIMIT
                      </span>
                    )}
                    {m.targetMaxDamage && (
                      <span className="flex items-center gap-1 bg-neutral-900/80 px-2 py-0.5 rounded-lg border border-white/10">
                        <Shield className="w-3 h-3 text-red-400" />
                        &lt; {m.targetMaxDamage}% DMG
                      </span>
                    )}
                    <span className="bg-neutral-900/80 px-2 py-0.5 rounded-lg border border-white/10 text-amber-400 font-bold">
                      +{m.rewardCoins} COINS
                    </span>
                    <span className="bg-neutral-900/80 px-2 py-0.5 rounded-lg border border-white/10 text-sky-400 font-bold">
                      +{m.rewardXp} XP
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div>
                  {isUnlocked ? (
                    <button
                      id={`btn-start-mission-${m.id}`}
                      onClick={() => { sound.playButtonClick(); onSelectMission(m); }}
                      className={`w-full py-2.5 rounded-xl font-tech font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white'
                          : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-neutral-950'
                      }`}
                    >
                      <Trophy className="w-4 h-4" />
                      {isCompleted ? 'REPLAY MISSION' : 'START MISSION'}
                    </button>
                  ) : (
                    <div className="w-full py-2.5 rounded-xl bg-neutral-900 text-neutral-500 font-tech font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-white/5">
                      <Lock className="w-3.5 h-3.5" />
                      COMPLETE MISSION #{m.id - 1} TO UNLOCK
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
