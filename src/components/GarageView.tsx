import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrowLeft, Check, Lock, Palette, Wrench, Shield, Zap, Sparkles, Disc, Gauge } from 'lucide-react';
import { CarDefinition, UserProfile } from '../types/game';
import { INITIAL_CARS, COLOR_PALETTES, UPGRADE_CONFIG, UNDERGLOW_COLORS } from '../game/constants';
import { Car3DBuilder, Car3DInstance } from '../game/Car3DBuilder';
import { StorageService } from '../services/storage';
import { sound } from '../services/audio';

interface GarageViewProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onBack: () => void;
  onTestDrive: () => void;
}

export const GarageView: React.FC<GarageViewProps> = ({
  profile,
  onUpdateProfile,
  onBack,
  onTestDrive,
}) => {
  const [selectedCarIndex, setSelectedCarIndex] = useState(() => {
    const idx = INITIAL_CARS.findIndex(c => c.id === profile.selectedCarId);
    return idx >= 0 ? idx : 0;
  });

  const [activeTab, setActiveTab] = useState<'VEHICLES' | 'CUSTOMIZE' | 'UPGRADES'>('VEHICLES');

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const carInstanceRef = useRef<Car3DInstance | null>(null);
  const isDraggingRef = useRef(false);
  const previousMouseXRef = useRef(0);
  const rotationVelocityRef = useRef(0.005);

  const currentCarDef = INITIAL_CARS[selectedCarIndex];
  const userCarData = profile.ownedCars[currentCarDef.id] || {
    unlocked: currentCarDef.unlocked,
    upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
    color: currentCarDef.color,
    paintType: currentCarDef.paintType,
    hasUnderglow: false,
    underglowColor: '#3B82F6',
  };

  const isUnlocked = userCarData.unlocked;

  // Initialize Three.js Showroom
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0f17);
    scene.fog = new THREE.FogExp2(0x0c0f17, 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 6.8);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Showroom Turntable Floor
    const floorGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Glowing Ring
    const ringGeo = new THREE.RingGeometry(4.8, 5.0, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Lighting (Studio Spotlights)
    const keyLight = new THREE.SpotLight(0xffffff, 2.5, 30, Math.PI / 4, 0.5, 1);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.SpotLight(0x38bdf8, 1.8, 30, Math.PI / 4, 0.5, 1);
    fillLight.position.set(-5, 6, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfff7ed, 1.0);
    rimLight.position.set(0, 5, -6);
    scene.add(rimLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);

    // Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (carInstanceRef.current && !isDraggingRef.current) {
        carInstanceRef.current.root.rotation.y += rotationVelocityRef.current;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
  }, []);

  // Update 3D car when selection or customization changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old car
    if (carInstanceRef.current) {
      scene.remove(carInstanceRef.current.root);
      carInstanceRef.current = null;
    }

    // Build new car
    const carInst = Car3DBuilder.createCar(currentCarDef, {
      color: userCarData.color,
      paintType: userCarData.paintType,
      hasUnderglow: userCarData.hasUnderglow,
      underglowColor: userCarData.underglowColor,
      enableRealLights: false,
      castShadows: true,
    });

    carInst.root.position.set(0, 0, 0);
    carInst.root.rotation.y = Math.PI / 4;
    scene.add(carInst.root);
    carInstanceRef.current = carInst;
  }, [selectedCarIndex, userCarData.color, userCarData.paintType, userCarData.hasUnderglow, userCarData.underglowColor]);

  // Touch & Mouse Turntable Drag
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousMouseXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !carInstanceRef.current) return;
    const deltaX = e.clientX - previousMouseXRef.current;
    carInstanceRef.current.root.rotation.y += deltaX * 0.01;
    previousMouseXRef.current = e.clientX;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Buy Car
  const handleUnlockCar = () => {
    sound.playButtonClick();
    const success = StorageService.unlockCar(currentCarDef.id);
    if (success) {
      sound.playSuccess();
      const updated = StorageService.loadProfile();
      onUpdateProfile(updated);
    } else {
      sound.playFailure();
    }
  };

  // Select Car for driving
  const handleSelectCar = () => {
    sound.playButtonClick();
    const updated = StorageService.saveProfile({ selectedCarId: currentCarDef.id });
    onUpdateProfile(updated);
  };

  // Upgrade Part
  const handleUpgrade = (part: 'engine' | 'brakes' | 'handling' | 'durability' | 'turbo') => {
    const currentLvl = userCarData.upgrades[part] || 0;
    if (currentLvl >= 5) return;

    const conf = UPGRADE_CONFIG[part];
    const cost = Math.round(conf.baseCost * Math.pow(conf.costMultiplier, currentLvl));

    if (profile.coins < cost) {
      sound.playFailure();
      return;
    }

    sound.playButtonClick();
    const success = StorageService.upgradeCarPart(currentCarDef.id, part, cost);
    if (success) {
      sound.playCoin();
      const updated = StorageService.loadProfile();
      onUpdateProfile(updated);
    }
  };

  // Color selection
  const handleColorChange = (hex: string) => {
    sound.playButtonClick();
    StorageService.customizeCar(
      currentCarDef.id,
      hex,
      userCarData.paintType,
      userCarData.hasUnderglow,
      userCarData.underglowColor
    );
    const updated = StorageService.loadProfile();
    onUpdateProfile(updated);
  };

  // Paint finish
  const handlePaintTypeChange = (type: 'gloss' | 'metallic' | 'matte') => {
    sound.playButtonClick();
    StorageService.customizeCar(
      currentCarDef.id,
      userCarData.color,
      type,
      userCarData.hasUnderglow,
      userCarData.underglowColor
    );
    const updated = StorageService.loadProfile();
    onUpdateProfile(updated);
  };

  // Underglow change
  const handleUnderglowChange = (colorHex: string) => {
    sound.playButtonClick();
    const hasGlow = colorHex !== 'none';
    StorageService.customizeCar(
      currentCarDef.id,
      userCarData.color,
      userCarData.paintType,
      hasGlow,
      colorHex
    );
    const updated = StorageService.loadProfile();
    onUpdateProfile(updated);
  };

  return (
    <div id="garage-screen" className="fixed inset-0 z-40 bg-neutral-950 flex flex-col select-none overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 glass-panel border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <button
            id="btn-garage-back"
            onClick={() => { sound.playButtonClick(); onBack(); }}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-neutral-300 hover:text-white"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-tech font-extrabold tracking-wider text-neutral-100 uppercase">
              GARAGE SHOWROOM
            </h1>
            <p className="text-[11px] text-neutral-400 font-medium">Select, Tune & Customize Your Fleet</p>
          </div>
        </div>

        {/* Coins Counter & Test Drive */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-3.5 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-2">
            <span className="text-sm sm:text-base font-tech font-black text-amber-400">
              {profile.coins.toLocaleString()} COINS
            </span>
          </div>

          <button
            id="btn-garage-test-drive"
            onClick={() => { sound.playButtonClick(); onTestDrive(); }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-neutral-950 font-tech font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg active:scale-95 transition-all"
          >
            TEST DRIVE
          </button>
        </div>
      </div>

      {/* Main Content (3D Viewer on Top/Left, Control Panel on Bottom/Right) */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* 3D Turntable Canvas */}
        <div
          ref={canvasContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex-1 w-full h-[45vh] lg:h-full cursor-grab active:cursor-grabbing relative touch-none"
        >
          {/* Instructions Overlay */}
          <div className="absolute bottom-3 left-4 text-[11px] font-tech text-neutral-400 pointer-events-none glass-panel px-2.5 py-1 rounded-lg border border-white/10">
            Drag to rotate 360°
          </div>

          {/* Vehicle Name Header in 3D Stage */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="text-xs font-tech font-bold text-sky-400 uppercase tracking-widest">
              {currentCarDef.category}
            </div>
            <h2 className="text-2xl sm:text-4xl font-tech font-black text-neutral-100 tracking-wider">
              {currentCarDef.name}
            </h2>
            <p className="text-xs text-neutral-400 max-w-sm mt-1">{currentCarDef.description}</p>
          </div>
        </div>

        {/* Control Management Sidebar / Bottom Drawer */}
        <div className="w-full lg:w-[480px] glass-panel border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col p-4 sm:p-5 overflow-y-auto max-h-[55vh] lg:max-h-full">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-900/80 rounded-2xl border border-white/10 mb-4">
            <button
              onClick={() => { sound.playButtonClick(); setActiveTab('VEHICLES'); }}
              className={`py-2 rounded-xl text-xs font-tech font-bold uppercase transition-all ${
                activeTab === 'VEHICLES' ? 'bg-sky-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              CARS ({INITIAL_CARS.length})
            </button>
            <button
              onClick={() => { sound.playButtonClick(); setActiveTab('CUSTOMIZE'); }}
              className={`py-2 rounded-xl text-xs font-tech font-bold uppercase transition-all ${
                activeTab === 'CUSTOMIZE' ? 'bg-sky-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              PAINT & GLOW
            </button>
            <button
              onClick={() => { sound.playButtonClick(); setActiveTab('UPGRADES'); }}
              className={`py-2 rounded-xl text-xs font-tech font-bold uppercase transition-all ${
                activeTab === 'UPGRADES' ? 'bg-sky-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              PERFORMANCE
            </button>
          </div>

          {/* TAB 1: VEHICLE CAROUSEL */}
          {activeTab === 'VEHICLES' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                {INITIAL_CARS.map((car, idx) => {
                  const carData = profile.ownedCars[car.id] || { unlocked: car.unlocked };
                  const isCarUnlocked = carData.unlocked;
                  const isSelected = selectedCarIndex === idx;
                  const isCurrentActive = profile.selectedCarId === car.id;

                  return (
                    <div
                      key={car.id}
                      onClick={() => { sound.playButtonClick(); setSelectedCarIndex(idx); }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-500 bg-sky-950/40 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                          : 'border-white/10 bg-neutral-900/60 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-tech font-bold text-sky-400 uppercase">{car.category}</div>
                          <div className="text-base font-tech font-bold text-neutral-100">{car.name}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCarUnlocked ? (
                            isCurrentActive ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-tech font-black">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 text-[10px] font-tech font-bold">
                                OWNED
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-tech font-black flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              {car.price.toLocaleString()} COINS
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Unlock / Select Action Bar */}
              <div className="pt-2">
                {isUnlocked ? (
                  <button
                    id="btn-select-current-car"
                    onClick={handleSelectCar}
                    disabled={profile.selectedCarId === currentCarDef.id}
                    className={`w-full py-3 rounded-2xl font-tech font-black text-sm uppercase tracking-wider transition-all ${
                      profile.selectedCarId === currentCarDef.id
                        ? 'bg-emerald-600 text-white opacity-80 cursor-default'
                        : 'bg-gradient-to-r from-sky-500 to-blue-600 text-neutral-950 hover:brightness-110 active:scale-95 shadow-xl'
                    }`}
                  >
                    {profile.selectedCarId === currentCarDef.id ? 'SELECTED FOR DRIVING' : 'CHOOSE THIS CAR'}
                  </button>
                ) : (
                  <button
                    id="btn-unlock-car"
                    onClick={handleUnlockCar}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-neutral-950 font-tech font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    UNLOCK CAR FOR {currentCarDef.price.toLocaleString()} COINS
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMIZE PAINT & GLOW */}
          {activeTab === 'CUSTOMIZE' && (
            <div className="space-y-4">
              {/* Paint Finish Types */}
              <div>
                <label className="text-[11px] font-tech font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  PAINT FINISH
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['gloss', 'metallic', 'matte'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => handlePaintTypeChange(type)}
                      className={`py-2 rounded-xl text-xs font-tech font-bold uppercase border transition-all ${
                        userCarData.paintType === type
                          ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                          : 'border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches */}
              <div>
                <label className="text-[11px] font-tech font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  BODY COLOR
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {COLOR_PALETTES.map(c => {
                    const isSelected = userCarData.color === c.hex;
                    return (
                      <button
                        key={c.name}
                        onClick={() => handleColorChange(c.hex)}
                        className={`h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                          isSelected ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'border-black/40'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      >
                        {isSelected && <Check className="w-4 h-4 text-neutral-900 drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Neon Underglow */}
              <div>
                <label className="text-[11px] font-tech font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                  NEON UNDERGLOW
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {UNDERGLOW_COLORS.map(u => {
                    const isSelected = (u.hex === 'none' && !userCarData.hasUnderglow) || (userCarData.hasUnderglow && userCarData.underglowColor === u.hex);
                    return (
                      <button
                        key={u.name}
                        onClick={() => handleUnderglowChange(u.hex)}
                        className={`py-2 rounded-xl text-xs font-tech font-bold uppercase border transition-all ${
                          isSelected
                            ? 'border-sky-400 bg-sky-500/20 text-sky-300 shadow-md'
                            : 'border-white/10 bg-neutral-900/60 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PERFORMANCE UPGRADES */}
          {activeTab === 'UPGRADES' && (
            <div className="space-y-3">
              {(Object.keys(UPGRADE_CONFIG) as (keyof typeof UPGRADE_CONFIG)[]).map(partKey => {
                const conf = UPGRADE_CONFIG[partKey];
                const currentLvl = userCarData.upgrades[partKey] || 0;
                const isMax = currentLvl >= 5;
                const cost = Math.round(conf.baseCost * Math.pow(conf.costMultiplier, currentLvl));

                return (
                  <div key={partKey} className="p-3 rounded-2xl border border-white/10 bg-neutral-900/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {partKey === 'engine' && <Gauge className="w-4 h-4 text-sky-400" />}
                        {partKey === 'brakes' && <Disc className="w-4 h-4 text-red-400" />}
                        {partKey === 'handling' && <Wrench className="w-4 h-4 text-amber-400" />}
                        {partKey === 'durability' && <Shield className="w-4 h-4 text-emerald-400" />}
                        {partKey === 'turbo' && <Zap className="w-4 h-4 text-purple-400" />}
                        <span className="text-sm font-tech font-bold text-neutral-100">{conf.name}</span>
                      </div>

                      <span className="text-xs font-tech font-bold text-sky-400">
                        LVL {currentLvl} / 5
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-400">{conf.desc}</p>

                    {/* 5-Stage Level Pips & Upgrade Button */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-6 h-2 rounded-full transition-all ${
                              step <= currentLvl
                                ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                                : 'bg-neutral-800'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => handleUpgrade(partKey)}
                        disabled={isMax || profile.coins < cost}
                        className={`px-3 py-1.5 rounded-xl font-tech font-black text-xs uppercase tracking-wider transition-all ${
                          isMax
                            ? 'bg-neutral-800 text-neutral-500 cursor-default'
                            : profile.coins >= cost
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 hover:brightness-110 active:scale-95 shadow-md'
                            : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? 'MAXED' : `${cost} COINS`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Performance Radar Stats Comparison Bars */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <div className="text-[11px] font-tech font-bold text-neutral-400 uppercase tracking-wider">
              VEHICLE SPECIFICATIONS
            </div>

            {/* Top Speed */}
            <div>
              <div className="flex justify-between text-xs font-tech text-neutral-300 mb-0.5">
                <span>Top Speed</span>
                <span className="font-bold text-sky-400">
                  {currentCarDef.baseStats.topSpeed + (userCarData.upgrades.engine * 12) + (userCarData.upgrades.turbo * 6)} km/h
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full"
                  style={{ width: `${Math.min(100, (currentCarDef.baseStats.topSpeed / 250) * 100)}%` }}
                />
              </div>
            </div>

            {/* Acceleration */}
            <div>
              <div className="flex justify-between text-xs font-tech text-neutral-300 mb-0.5">
                <span>Acceleration</span>
                <span className="font-bold text-emerald-400">
                  {(currentCarDef.baseStats.acceleration + (userCarData.upgrades.engine * 0.8) + (userCarData.upgrades.turbo * 1.1)).toFixed(1)} / 10
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${Math.min(100, (currentCarDef.baseStats.acceleration / 10) * 100)}%` }}
                />
              </div>
            </div>

            {/* Handling */}
            <div>
              <div className="flex justify-between text-xs font-tech text-neutral-300 mb-0.5">
                <span>Handling</span>
                <span className="font-bold text-purple-400">
                  {(currentCarDef.baseStats.handling + (userCarData.upgrades.handling * 0.8)).toFixed(1)} / 10
                </span>
              </div>
              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full"
                  style={{ width: `${Math.min(100, (currentCarDef.baseStats.handling / 10) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
