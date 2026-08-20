export type ScreenMode = 'HOME' | 'GAME' | 'GARAGE' | 'MISSIONS' | 'SETTINGS' | 'LEADERBOARD';

export type GameSubMode = 'MISSION' | 'FREE_DRIVE' | 'PARKING_ACADEMY';

export type TimeOfDay = 'DAY' | 'DUSK' | 'NIGHT';

export type CameraView = 'CHASE' | 'HOOD' | 'TOP_DOWN' | 'CLOSE';

export type GraphicsQuality = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CarStats {
  topSpeed: number; // in km/h (e.g. 140 - 240)
  acceleration: number; // 1-10
  handling: number; // 1-10
  braking: number; // 1-10
  durability: number; // 1-10
}

export interface CarUpgradeLevels {
  engine: number; // 0 to 5
  brakes: number; // 0 to 5
  handling: number; // 0 to 5
  durability: number; // 0 to 5
  turbo: number; // 0 to 5
}

export interface CarDefinition {
  id: string;
  name: string;
  category: string;
  price: number;
  unlocked: boolean;
  baseStats: CarStats;
  color: string;
  paintType: 'gloss' | 'metallic' | 'matte';
  underglowColor?: string; // hex or undefined
  hasUnderglow?: boolean;
  modelStyle: 'compact' | 'racer' | 'suv' | 'hyper' | 'classic';
  description: string;
}

export interface MissionDefinition {
  id: number;
  title: string;
  category: 'Drive' | 'Parking' | 'Rules' | 'Speed' | 'Delivery';
  description: string;
  objectiveText: string;
  timeLimit?: number; // in seconds
  targetWaypointsCount?: number;
  targetParkSlotId?: string;
  targetMaxDamage?: number;
  rewardCoins: number;
  rewardXp: number;
  unlocked: boolean;
  stars: number; // 0 to 3
  bestScore?: number;
  bestTime?: number;
  timeOfDay: TimeOfDay;
  trafficDensity: 'low' | 'medium' | 'high';
}

export interface TrafficViolation {
  id: string;
  type: 'RED_LIGHT' | 'COLLISION' | 'OFFROAD' | 'SPEEDING' | 'CLEAN_STREAK' | 'SIGNAL_BONUS' | 'PARKING_ACCURACY';
  message: string;
  pointsDelta: number;
  coinsDelta: number;
  timestamp: number;
  isBonus?: boolean;
}

export interface ParkingState {
  isActive: boolean;
  slotId: string;
  slotPosition: [number, number, number];
  slotRotation: number;
  distance: number;
  angleDiff: number;
  isWithinBounds: boolean;
  holdTime: number; // time spent stationary inside bay (need >= 1.5s)
  accuracy: number; // 0-100%
  completed: boolean;
}

export type ColorTheme =
  | 'OCEAN'
  | 'SUNSET'
  | 'NEON'
  | 'TROPICAL'
  | 'PURPLE_NIGHT'
  | 'CLASSIC';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  engineSoundEnabled: boolean;
  vibrationEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  touchControlLayout: 'BUTTONS' | 'WHEEL';
  steeringSensitivity: number; // 0.5 to 1.5
  metricUnits: boolean; // km/h vs mph
  colorTheme?: ColorTheme;
}

export interface ControlInputs {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  handbrake: boolean;
  reverse: boolean;
}

export interface MissionProgress {
  completed: boolean;
  stars: number;
  bestScore: number;
  bestTime?: number;
}

export interface UserProfile {
  coins: number;
  xp: number;
  level: number;
  selectedCarId: string;
  ownedCars: {
    [carId: string]: {
      unlocked: boolean;
      upgrades: CarUpgradeLevels;
      color: string;
      paintType: 'gloss' | 'metallic' | 'matte';
      hasUnderglow: boolean;
      underglowColor: string;
    };
  };
  missionsProgress: {
    [missionId: number]: MissionProgress;
  };
  totalDistanceDrivenKm: number;
  totalMissionsCompleted: number;
  cleanDrivingStreak: number;
  lastDailyRewardTimestamp?: number;
  dailyRewardStreak: number;
  settings: GameSettings;
}

export type MapLocationCategory =
  | 'HOME'
  | 'GARAGE'
  | 'GAS'
  | 'GAS_STATION'
  | 'PARKING'
  | 'MISSION'
  | 'CHALLENGE'
  | 'HOSPITAL'
  | 'POLICE'
  | 'AIRPORT'
  | 'SHOPPING'
  | 'PARK'
  | 'DEALERSHIP'
  | 'LANDMARK'
  | 'SERVICES';

export interface MapPointOfInterest {
  id: string;
  name: string;
  category: MapLocationCategory;
  description: string;
  position: { x: number; z: number; y?: number };
  icon: string;
  district: string;
  missionId?: number;
  rewardCoins?: number;
  rewardXp?: number;
  isUnlocked?: boolean;
}

export type RoadNodeType = 'INTERSECTION' | 'HIGHWAY_JUNCTION' | 'ROUNDABOUT' | 'DEAD_END' | 'WAYPOINT';
export type RoadType = 'HIGHWAY' | 'MAIN_ROAD' | 'CITY_ROAD' | 'SIDE_ROAD';

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  name?: string;
  type: RoadNodeType;
  neighbors: string[];
}

export interface RoadSegment {
  id: string;
  fromNode: string;
  toNode: string;
  type: RoadType;
  length: number;
  speedLimit: number;
  lanes: number;
}

export interface NavigationRoute {
  destination: {
    id?: string;
    name: string;
    category?: MapLocationCategory;
    position: { x: number; z: number };
  };
  nodes: RoadNode[];
  waypoints: { x: number; z: number }[];
  totalDistanceMeters: number;
  remainingDistanceMeters: number;
  estimatedTimeSeconds: number;
  currentInstruction: string;
  nextInstruction?: string;
  isDestinationReached: boolean;
}

export interface PlayerMapPosition {
  x: number;
  z: number;
  heading: number; // yaw in radians
  speedKmh: number;
}

export interface InGameTelemetry {
  speedKmh: number;
  rpm: number;
  gear: 'P' | 'R' | 'N' | 'D';
  damagePercent: number;
  throttle: number;
  brake: number;
  steeringAngle: number;
  handbrake: boolean;
  headlightsOn: boolean;
  leftSignalOn: boolean;
  rightSignalOn: boolean;
  hazardLightsOn: boolean;
  distanceToObjective: number;
  currentScore: number;
  coinsCollectedInSession: number;
  timeRemaining?: number;
  elapsedTime: number;
  isPaused: boolean;
  isGameOver: boolean;
  gameResult?: 'WIN' | 'LOSE';
  failReason?: string;
  navigationRoute?: NavigationRoute | null;
  playerMapPos?: PlayerMapPosition;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  level: number;
  carName: string;
  isPlayer?: boolean;
}
