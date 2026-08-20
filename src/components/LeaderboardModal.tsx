import React from 'react';
import { X, Trophy, Medal, Crown } from 'lucide-react';
import { MissionProgress, UserProfile, LeaderboardEntry } from '../types/game';
import { DRIVER_LEVELS, INITIAL_CARS } from '../game/constants';
import { sound } from '../services/audio';

interface LeaderboardModalProps {
  profile: UserProfile;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  profile,
  onClose,
}) => {
  const currentCarDef = INITIAL_CARS.find(c => c.id === profile.selectedCarId) || INITIAL_CARS[0];
  const driverLevelConfig = DRIVER_LEVELS.find(l => l.level === profile.level) || DRIVER_LEVELS[0];

  const missionList = Object.values(profile.missionsProgress) as MissionProgress[];
  const totalCompletedStars = missionList.reduce((acc, m) => acc + (m?.stars || 0), 0);
  const bestTotalScore = missionList.reduce((acc, m) => acc + (m?.bestScore || 0), 0) + profile.xp;

  const mockLeaderboard: LeaderboardEntry[] = [
    { rank: 1, name: 'ApexPhantom', score: 14500, level: 10, carName: 'Volt Spectre' },
    { rank: 2, name: 'TurboVortex', score: 11800, level: 9, carName: 'Apex GT' },
    { rank: 3, name: 'DriftKnight', score: 9400, level: 8, carName: 'Vanguard 70' },
    { rank: 4, name: 'CyberRacer_99', score: 7600, level: 7, carName: 'Apex GT' },
    { rank: 5, name: 'UrbanCruiser', score: 5800, level: 6, carName: 'Titan TX' },
    { rank: 6, name: 'NeonPulse', score: 4200, level: 5, carName: 'Pulse Hatch' },
    { rank: 7, name: 'StreetHawk', score: 3100, level: 4, carName: 'Pulse Hatch' },
    { rank: 8, name: 'SpeedyGonz', score: 2200, level: 3, carName: 'Pulse Hatch' },
    { rank: 9, name: 'CityLearner', score: 1400, level: 2, carName: 'Pulse Hatch' },
  ];

  // Insert player entry according to score
  const playerRank = Math.max(1, mockLeaderboard.filter(e => e.score > bestTotalScore).length + 1);

  return (
    <div id="leaderboard-modal-backdrop" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="glass-panel-glow w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-[#FFD43B]/40 bg-[#0b1329]/95 flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4 bg-gradient-to-r from-[#FF8A00]/20 to-[#FFD43B]/20 -mx-6 -mt-6 p-6 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF8A00] to-[#FFD43B] flex items-center justify-center text-neutral-950 shadow-md">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-tech font-black text-white uppercase tracking-wider">
                CITY LEADERBOARD
              </h2>
              <p className="text-xs text-sky-200 font-medium">Top drivers ranked by skill score & mission stars</p>
            </div>
          </div>

          <button
            onClick={() => { sound.playButtonClick(); onClose(); }}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Current Standings Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1677FF]/40 to-[#00CFFF]/30 border border-[#00CFFF]/50 mb-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFD43B] to-[#FF8A00] text-neutral-950 font-tech font-black text-base flex items-center justify-center shadow-md">
              #{playerRank}
            </div>
            <div>
              <div className="text-xs font-tech font-bold text-[#00CFFF] uppercase">YOU (PLAYER)</div>
              <div className="text-sm font-semibold text-white">{driverLevelConfig.title} • {currentCarDef.name}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-tech font-black text-[#FFD43B] drop-shadow">{bestTotalScore.toLocaleString()} PTS</div>
            <div className="text-[10px] text-sky-200">{totalCompletedStars} Stars Earned</div>
          </div>
        </div>

        {/* Leaderboard Table List */}
        <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
          {mockLeaderboard.map(entry => {
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.rank}
                className="p-3 rounded-2xl glass-panel border border-white/10 bg-[#172554]/50 flex items-center justify-between hover:border-white/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-tech font-black text-xs ${
                      entry.rank === 1
                        ? 'bg-[#FFD43B] text-neutral-950 shadow-[0_0_12px_rgba(255,212,59,0.8)]'
                        : entry.rank === 2
                        ? 'bg-slate-200 text-neutral-950'
                        : entry.rank === 3
                        ? 'bg-[#FF8A00] text-neutral-950'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {entry.rank === 1 ? <Crown className="w-4 h-4" /> : entry.rank}
                  </div>

                  <div>
                    <div className="text-sm font-tech font-bold text-white">{entry.name}</div>
                    <div className="text-[10px] text-sky-200 font-medium">{entry.carName} • Lvl {entry.level}</div>
                  </div>
                </div>

                <div className="text-sm font-tech font-black text-sky-100">
                  {entry.score.toLocaleString()} PTS
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
