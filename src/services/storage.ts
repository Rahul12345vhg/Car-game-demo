import { UserProfile, GameSettings } from '../types/game';
import { INITIAL_CARS, GAME_MISSIONS, DRIVER_LEVELS } from '../game/constants';

const STORAGE_KEY = 'city_drive_player_profile_v1';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  engineSoundEnabled: true,
  vibrationEnabled: true,
  graphicsQuality: 'HIGH',
  touchControlLayout: 'BUTTONS',
  steeringSensitivity: 1.0,
  metricUnits: true,
};

const DEFAULT_PROFILE: UserProfile = {
  coins: 500, // starting gift coins
  xp: 0,
  level: 1,
  selectedCarId: 'city_compact',
  ownedCars: {
    city_compact: {
      unlocked: true,
      upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
      color: '#3B82F6',
      paintType: 'gloss',
      hasUnderglow: false,
      underglowColor: '#60A5FA',
    },
    street_racer: {
      unlocked: false,
      upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
      color: '#EF4444',
      paintType: 'metallic',
      hasUnderglow: false,
      underglowColor: '#F87171',
    },
    urban_suv: {
      unlocked: false,
      upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
      color: '#10B981',
      paintType: 'metallic',
      hasUnderglow: false,
      underglowColor: '#34D399',
    },
    electric_hyper: {
      unlocked: false,
      upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
      color: '#8B5CF6',
      paintType: 'metallic',
      hasUnderglow: true,
      underglowColor: '#A78BFA',
    },
    classic_cruiser: {
      unlocked: false,
      upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
      color: '#F59E0B',
      paintType: 'gloss',
      hasUnderglow: false,
      underglowColor: '#FBBF24',
    }
  },
  missionsProgress: {
    1: { completed: false, stars: 0, bestScore: 0 }
  },
  totalDistanceDrivenKm: 0,
  totalMissionsCompleted: 0,
  cleanDrivingStreak: 0,
  dailyRewardStreak: 0,
  settings: DEFAULT_SETTINGS,
};

export class StorageService {
  private static profile: UserProfile | null = null;

  public static loadProfile(): UserProfile {
    if (this.profile) return this.profile;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Merge defaults to preserve schema backwards compatibility
        this.profile = {
          ...DEFAULT_PROFILE,
          ...parsed,
          ownedCars: { ...DEFAULT_PROFILE.ownedCars, ...(parsed.ownedCars || {}) },
          missionsProgress: { ...DEFAULT_PROFILE.missionsProgress, ...(parsed.missionsProgress || {}) },
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        };
      } else {
        this.profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
      }
    } catch {
      this.profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    }

    return this.profile!;
  }

  public static saveProfile(updated: Partial<UserProfile>): UserProfile {
    const current = this.loadProfile();
    this.profile = {
      ...current,
      ...updated,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch {
      // Ignore quota error if browser in strict mode
    }

    return this.profile;
  }

  public static addCoins(amount: number): number {
    const profile = this.loadProfile();
    const newCoins = Math.max(0, profile.coins + amount);
    this.saveProfile({ coins: newCoins });
    return newCoins;
  }

  public static addXp(amount: number): { newXp: number; newLevel: number; leveledUp: boolean } {
    const profile = this.loadProfile();
    const newXp = profile.xp + amount;
    
    // Calculate new level
    let newLevel = 1;
    for (let i = DRIVER_LEVELS.length - 1; i >= 0; i--) {
      if (newXp >= DRIVER_LEVELS[i].xpRequired) {
        newLevel = DRIVER_LEVELS[i].level;
        break;
      }
    }

    const leveledUp = newLevel > profile.level;
    this.saveProfile({ xp: newXp, level: newLevel });
    return { newXp, newLevel, leveledUp };
  }

  public static getLevelProgress(xp: number, level: number) {
    const currentLevelConfig = DRIVER_LEVELS.find(l => l.level === level) || DRIVER_LEVELS[0];
    const nextLevelConfig = DRIVER_LEVELS.find(l => l.level === level + 1);

    if (!nextLevelConfig) {
      return {
        title: currentLevelConfig.title,
        current: xp,
        needed: xp,
        percentage: 100,
        isMax: true,
      };
    }

    const currentBase = currentLevelConfig.xpRequired;
    const nextTarget = nextLevelConfig.xpRequired;
    const progressInLevel = Math.max(0, xp - currentBase);
    const totalLevelSpan = nextTarget - currentBase;
    const percentage = Math.min(100, Math.floor((progressInLevel / totalLevelSpan) * 100));

    return {
      title: currentLevelConfig.title,
      current: xp,
      needed: nextTarget,
      percentage,
      isMax: false,
    };
  }

  public static unlockCar(carId: string): boolean {
    const profile = this.loadProfile();
    const carDef = INITIAL_CARS.find(c => c.id === carId);
    if (!carDef) return false;

    if (profile.coins >= carDef.price) {
      const newCoins = profile.coins - carDef.price;
      const updatedOwned = {
        ...profile.ownedCars,
        [carId]: {
          ...(profile.ownedCars[carId] || {
            upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
            color: carDef.color,
            paintType: carDef.paintType,
            hasUnderglow: false,
            underglowColor: '#3B82F6',
          }),
          unlocked: true,
        }
      };

      this.saveProfile({
        coins: newCoins,
        ownedCars: updatedOwned,
        selectedCarId: carId,
      });
      return true;
    }
    return false;
  }

  public static upgradeCarPart(carId: string, part: 'engine' | 'brakes' | 'handling' | 'durability' | 'turbo', cost: number): boolean {
    const profile = this.loadProfile();
    if (profile.coins < cost) return false;

    const carData = profile.ownedCars[carId];
    if (!carData) return false;

    const currentLevel = carData.upgrades[part] || 0;
    if (currentLevel >= 5) return false;

    const updatedCars = {
      ...profile.ownedCars,
      [carId]: {
        ...carData,
        upgrades: {
          ...carData.upgrades,
          [part]: currentLevel + 1,
        }
      }
    };

    this.saveProfile({
      coins: profile.coins - cost,
      ownedCars: updatedCars,
    });
    return true;
  }

  public static customizeCar(carId: string, color: string, paintType: 'gloss' | 'metallic' | 'matte', hasUnderglow: boolean, underglowColor: string) {
    const profile = this.loadProfile();
    const carData = profile.ownedCars[carId];
    if (!carData) return;

    const updatedCars = {
      ...profile.ownedCars,
      [carId]: {
        ...carData,
        color,
        paintType,
        hasUnderglow,
        underglowColor,
      }
    };

    this.saveProfile({ ownedCars: updatedCars });
  }

  public static recordMissionResult(missionId: number, stars: number, score: number, time?: number) {
    const profile = this.loadProfile();
    const existing = profile.missionsProgress[missionId] || { completed: false, stars: 0, bestScore: 0 };
    
    const isNewBestScore = score > existing.bestScore;
    const isNewBestStars = stars > existing.stars;
    const isFirstTimeCompletion = !existing.completed;

    const updatedMissions = {
      ...profile.missionsProgress,
      [missionId]: {
        completed: true,
        stars: Math.max(existing.stars, stars),
        bestScore: Math.max(existing.bestScore, score),
        bestTime: existing.bestTime ? Math.min(existing.bestTime, time || Infinity) : time,
      }
    };

    // Unlock next mission if completed with at least 1 star
    const nextMissionId = missionId + 1;
    if (GAME_MISSIONS.some(m => m.id === nextMissionId)) {
      if (!updatedMissions[nextMissionId]) {
        updatedMissions[nextMissionId] = { completed: false, stars: 0, bestScore: 0 };
      }
    }

    this.saveProfile({
      missionsProgress: updatedMissions,
      totalMissionsCompleted: profile.totalMissionsCompleted + (isFirstTimeCompletion ? 1 : 0),
    });

    return { isNewBestScore, isNewBestStars, isFirstTimeCompletion };
  }

  public static resetProgress() {
    this.profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    localStorage.removeItem(STORAGE_KEY);
    return this.profile;
  }
}
