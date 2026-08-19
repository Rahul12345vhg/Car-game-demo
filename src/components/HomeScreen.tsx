import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Flag, Wrench, Trophy, Settings, Gift, Compass, Sparkles, Disc, Maximize2, Minimize2, Volume2, VolumeX, Car } from 'lucide-react';
import { MissionProgress, UserProfile } from '../types/game';
import { INITIAL_CARS, GAME_MISSIONS } from '../game/constants';
import { Car3DBuilder, Car3DInstance } from '../game/Car3DBuilder';
import { StorageService } from '../services/storage';
import { sound } from '../services/audio';

interface HomeScreenProps {
  profile: UserProfile;
  onStartFreeDrive: () => void;
  onOpenMissions: () => void;
  onOpenParking: () => void;
  onOpenGarage: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenDailyReward: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  onStartFreeDrive,
  onOpenMissions,
  onOpenParking,
  onOpenGarage,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenDailyReward,
}) => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(!profile.settings.soundEnabled);

  const selectedCar = INITIAL_CARS.find(c => c.id === profile.selectedCarId) || INITIAL_CARS[0];
  const userCarData = profile.ownedCars[selectedCar.id] || {
    color: selectedCar.color,
    paintType: selectedCar.paintType,
    hasUnderglow: selectedCar.hasUnderglow,
    underglowColor: selectedCar.underglowColor,
  };

  const levelProgress = StorageService.getLevelProgress(profile.xp, profile.level);
  const completedMissionsCount = (Object.values(profile.missionsProgress) as MissionProgress[]).filter(m => Boolean(m?.completed)).length;

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const canClaimDaily = now - (profile.lastDailyRewardTimestamp || 0) >= oneDayMs;

  const toggleFullscreen = () => {
    sound.playButtonClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleSound = () => {
    sound.playButtonClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sound.setMuted(nextMuted, nextMuted, nextMuted);
  };

  // 3D Background Showroom Canvas
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.022);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    // Well-balanced camera framing: car occupies ~38% of center height
    camera.position.set(3.8, 2.3, 6.2);
    camera.lookAt(0, 0.55, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height, false);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Showroom Turntable Floor
    const floorGeo = new THREE.CylinderGeometry(5.8, 5.8, 0.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x111928,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Glowing Neon Floor Ring
    const ringGeo = new THREE.RingGeometry(5.0, 5.25, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Studio Lights
    const spotKey = new THREE.SpotLight(0xffffff, 2.8, 30, Math.PI / 4, 0.4, 1);
    spotKey.position.set(4, 7, 4);
    spotKey.castShadow = true;
    scene.add(spotKey);

    const spotFill = new THREE.SpotLight(0x38bdf8, 2.2, 30, Math.PI / 4, 0.5, 1);
    spotFill.position.set(-4, 5, -3);
    scene.add(spotFill);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambLight);

    // 3D Car Instance
    const carInst: Car3DInstance = Car3DBuilder.createCar(selectedCar, {
      color: userCarData.color,
      paintType: userCarData.paintType,
      hasUnderglow: userCarData.hasUnderglow,
      underglowColor: userCarData.underglowColor,
      enableRealLights: false,
      castShadows: true,
    });
    carInst.root.position.set(0, 0, 0);
    scene.add(carInst.root);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (carInst.root) {
        carInst.root.rotation.y += 0.0035;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [selectedCar.id, userCarData.color, userCarData.paintType, userCarData.hasUnderglow, userCarData.underglowColor]);

  return (
    <div id="home-screen-root" className="relative w-full h-full min-h-screen bg-neutral-950 flex flex-col justify-between p-3 sm:p-6 select-none overflow-hidden safe-pt safe-pb safe-pl safe-pr">
      {/* 3D Background Canvas */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 z-0 pointer-events-none opacity-90"
      />

      {/* Top Header & Navigation Bar */}
      <header className="relative z-10 flex items-center justify-between gap-2.5 w-full">
        {/* Left: Driver Level & Progress */}
        <div className="flex items-center gap-2.5 sm:gap-3 glass-panel-glow px-3 sm:px-4 py-2 rounded-2xl border border-sky-500/40 shadow-xl">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center font-tech font-black text-neutral-950 text-sm sm:text-base shadow-md">
            {profile.level}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-tech font-extrabold text-neutral-100 uppercase tracking-wide">
                {levelProgress.title}
              </span>
              <span className="text-[10px] text-sky-400 font-bold">LVL {profile.level}</span>
            </div>

            {/* XP Progress Bar */}
            <div className="w-24 sm:w-36 h-1.5 bg-neutral-900 rounded-full overflow-hidden mt-1 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full"
                style={{ width: `${levelProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Coins Balance & Top Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Daily Reward Button */}
          <button
            id="btn-home-daily-reward"
            onClick={() => { sound.playButtonClick(); onOpenDailyReward(); }}
            className={`px-2.5 sm:px-3 py-2 rounded-xl glass-panel flex items-center gap-1.5 border transition-all ${
              canClaimDaily
                ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse'
                : 'border-white/10 text-neutral-300 hover:border-white/20'
            }`}
            title="Daily Driver Rewards"
          >
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-tech font-bold uppercase hidden md:inline">REWARDS</span>
            {canClaimDaily && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
          </button>

          {/* Coins Counter */}
          <div className="glass-panel px-3 sm:px-3.5 py-2 rounded-xl border border-amber-500/40 flex items-center gap-1.5 shadow-lg">
            <span className="text-xs sm:text-sm font-tech font-black text-amber-400">
              {profile.coins.toLocaleString()} <span className="text-[10px] text-amber-300 font-bold">COINS</span>
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            id="btn-home-sound"
            onClick={toggleSound}
            className="w-9 h-9 rounded-xl glass-btn flex items-center justify-center text-neutral-300 hover:text-white"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            id="btn-home-fullscreen"
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-xl glass-btn flex items-center justify-center text-neutral-300 hover:text-white hidden sm:flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            id="btn-home-settings"
            onClick={() => { sound.playButtonClick(); onOpenSettings(); }}
            className="w-9 h-9 rounded-xl glass-btn flex items-center justify-center text-neutral-300 hover:text-white"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Branding & Showcase Info */}
      <main className="relative z-10 max-w-xl my-auto py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-tech font-extrabold uppercase tracking-widest mb-2.5">
          <Sparkles className="w-3.5 h-3.5" />
          URBAN DRIVING SIMULATOR
        </div>

        <h1 className="text-4xl sm:text-6xl font-tech font-black text-neutral-100 tracking-wider uppercase leading-none drop-shadow-2xl">
          CITY <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-400 hud-text-glow">DRIVE</span>
        </h1>

        <p className="text-xs sm:text-sm text-neutral-300 font-medium mt-2 max-w-md drop-shadow hidden sm:block">
          Explore realistic 3D city traffic, traffic lights, precision parking, and high-performance vehicle tuning.
        </p>

        {/* Selected Vehicle Card */}
        <button
          id="btn-home-car-select"
          onClick={() => { sound.playButtonClick(); onOpenGarage(); }}
          className="inline-flex items-center gap-2.5 mt-3 glass-panel px-3.5 py-1.5 rounded-2xl border border-sky-500/30 hover:border-sky-400/60 active:scale-95 transition-all text-left"
        >
          <div className="w-7 h-7 rounded-lg bg-sky-950 flex items-center justify-center text-sky-400">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[9px] font-tech text-neutral-400 uppercase font-bold">ACTIVE VEHICLE</div>
            <div className="text-xs font-tech font-black text-neutral-100">{selectedCar.name} • {selectedCar.category}</div>
          </div>
        </button>
      </main>

      {/* Main 4 Action Cards */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 max-w-5xl w-full mx-auto mb-2">
        {/* 1. Free Drive */}
        <button
          id="btn-home-play"
          onClick={() => { sound.playButtonClick(); onStartFreeDrive(); }}
          className="col-span-2 sm:col-span-1 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-neutral-950 font-tech font-black uppercase tracking-wider shadow-2xl active:scale-95 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] sm:text-xs font-extrabold text-neutral-900/80">OPEN WORLD</span>
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-left mt-2 sm:mt-3">
            <div className="text-base sm:text-lg font-black leading-tight">FREE DRIVE</div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-neutral-900/70">Roam Open City</div>
          </div>
        </button>

        {/* 2. Career Missions */}
        <button
          id="btn-home-missions"
          onClick={() => { sound.playButtonClick(); onOpenMissions(); }}
          className="p-3.5 sm:p-4 rounded-2xl glass-panel-glow hover:bg-neutral-900/90 text-neutral-100 font-tech font-extrabold uppercase tracking-wider border border-sky-500/40 shadow-xl active:scale-95 transition-all flex flex-col justify-between group text-left"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] sm:text-xs font-bold text-sky-400">10 STAGES</span>
            <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-sm sm:text-base font-black text-neutral-100">MISSIONS</div>
            <div className="text-[10px] text-neutral-400 font-medium">
              {completedMissionsCount}/{GAME_MISSIONS.length} Done
            </div>
          </div>
        </button>

        {/* 3. Parking Academy */}
        <button
          id="btn-home-parking"
          onClick={() => { sound.playButtonClick(); onOpenParking(); }}
          className="p-3.5 sm:p-4 rounded-2xl glass-panel hover:bg-neutral-900/90 text-neutral-100 font-tech font-extrabold uppercase tracking-wider border border-white/15 shadow-xl active:scale-95 transition-all flex flex-col justify-between group text-left"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] sm:text-xs font-bold text-amber-400">PRECISION</span>
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:rotate-45 transition-transform" />
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-sm sm:text-base font-black text-neutral-100">PARKING</div>
            <div className="text-[10px] text-neutral-400 font-medium">Angle & Bay</div>
          </div>
        </button>

        {/* 4. Garage Showroom */}
        <button
          id="btn-home-garage"
          onClick={() => { sound.playButtonClick(); onOpenGarage(); }}
          className="p-3.5 sm:p-4 rounded-2xl glass-panel hover:bg-neutral-900/90 text-neutral-100 font-tech font-extrabold uppercase tracking-wider border border-white/15 shadow-xl active:scale-95 transition-all flex flex-col justify-between group text-left"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400">CUSTOMIZE</span>
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-sm sm:text-base font-black text-neutral-100">GARAGE</div>
            <div className="text-[10px] text-neutral-400 font-medium">Tuning & Paint</div>
          </div>
        </button>
      </div>

      {/* Bottom Mobile Navigation Bar */}
      <footer className="relative z-10 w-full max-w-xl mx-auto glass-panel px-3 py-1.5 rounded-2xl border border-white/10 flex items-center justify-around">
        <button
          id="nav-home"
          className="flex flex-col items-center gap-0.5 text-sky-400 font-tech font-bold text-[10px] uppercase"
        >
          <div className="w-5 h-5 rounded-md bg-sky-500/20 flex items-center justify-center">
            <Disc className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <span>Home</span>
        </button>

        <button
          id="nav-drive"
          onClick={() => { sound.playButtonClick(); onStartFreeDrive(); }}
          className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-neutral-200 font-tech font-bold text-[10px] uppercase transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>Drive</span>
        </button>

        <button
          id="nav-missions"
          onClick={() => { sound.playButtonClick(); onOpenMissions(); }}
          className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-neutral-200 font-tech font-bold text-[10px] uppercase transition-colors"
        >
          <Flag className="w-4 h-4" />
          <span>Missions</span>
        </button>

        <button
          id="nav-garage"
          onClick={() => { sound.playButtonClick(); onOpenGarage(); }}
          className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-neutral-200 font-tech font-bold text-[10px] uppercase transition-colors"
        >
          <Wrench className="w-4 h-4" />
          <span>Garage</span>
        </button>

        <button
          id="nav-leaderboard"
          onClick={() => { sound.playButtonClick(); onOpenLeaderboard(); }}
          className="flex flex-col items-center gap-0.5 text-neutral-400 hover:text-neutral-200 font-tech font-bold text-[10px] uppercase transition-colors"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Ranks</span>
        </button>
      </footer>
    </div>
  );
};
