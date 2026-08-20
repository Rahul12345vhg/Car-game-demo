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
    scene.background = new THREE.Color(0x0f1b38);
    scene.fog = new THREE.FogExp2(0x132147, 0.02);
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
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Showroom Turntable Floor
    const floorGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.2, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x172554,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor Glowing Ring in Cyan & Purple
    const ringGeo = new THREE.RingGeometry(4.8, 5.0, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00cfff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // Lighting (Studio Spotlights)
    const keyLight = new THREE.SpotLight(0xffffff, 2.8, 30, Math.PI / 4, 0.5, 1);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.SpotLight(0x00cfff, 2.2, 30, Math.PI / 4, 0.5, 1);
    fillLight.position.set(-5, 6, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x7c3aed, 1.2);
    rimLight.position.set(0, 5, -6);
    scene.add(rimLight);

    const ambLight = new THREE.AmbientLight(0xe0f2fe, 0.8);
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
    <div id="garage-screen" className="fixed inset-0 z-40 bg-gradient-to-br from-[#0b1329] via-[#172554] to-[#1e1b4b] flex flex-col select-none overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 glass-panel border-b border-white/20 z-10">
        <div className="flex items-center gap-3">
          <button
            id="btn-garage-back"
            onClick={() => { sound.playButtonClick(); onBack(); }}
            className="w-10 h-10 rounded-xl glass-btn flex items-center justify-center text-white/90 hover:text-white"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 text-[#00CFFF]" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-tech font-extrabold tracking-wider text-white uppercase">
              GARAGE SHOWROOM
            </h1>
            <p className="text-[11px] text-sky-200 font-medium">Select, Tune & Customize Your Fleet</p>
          </div>
        </div>

        {/* Coins Counter & Test Drive */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-3.5 py-1.5 rounded-xl border border-[#FFD43B]/40 flex items-center gap-2 bg-[#172554]/80">
            <span className="text-sm sm:text-base font-tech font-black text-[#FFD43B] drop-shadow">
              {profile.coins.toLocaleString()} COINS
            </span>
          </div>

          <button
            id="btn-garage-test-drive"
            onClick={() => { sound.playButtonClick(); onTestDrive(); }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1677FF] to-[#00CFFF] hover:from-sky-400 hover:to-blue-500 text-white font-tech font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg active:scale-95 transition-all border border-white/20"
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
          <div className="absolute bottom-3 left-4 text-[11px] font-tech text-sky-200 pointer-events-none glass-panel px-2.5 py-1 rounded-lg border border-white/20">
            Drag to rotate 360°
          </div>

          {/* Vehicle Name Header in 3D Stage */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="text-xs font-tech font-bold text-[#00CFFF] uppercase tracking-widest drop-shadow">
              {currentCarDef.category}
            </div>
            <h2 className="text-2xl sm:text-4xl font-tech font-black text-white tracking-wider drop-shadow-lg">
              {currentCarDef.name}
            </h2>
            <p className="text-xs text-sky-100 max-w-sm mt-1 drop-shadow">{currentCarDef.description}</p>
          </div>
        </div>

        {/* Control Management Sidebar / Bottom Drawer */}
        <div className="w-full lg:w-[480px] glass-panel border-t lg:border-t-0 lg:border-l border-white/20 flex flex-col p-4 sm:p-5 overflow-y-auto max-h-[55vh] lg:max-h-full">
          {/* Tab Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-[#0b1329]/80 rounded-2xl border border-white/15 mb-4">
            <button
              onClick={() => { sound.playButtonClick(); setActiveTab('VEHICLES'); }}
              className={`py-2 rounded-xl text-xs font-tech font-bold uppercase transition-all ${
                activeTab === 'VEHICLES' ? 'bg-gradient-to-r from-[#1677FF] to-[#00CFFF] text-white shadow-md' : 'text-white/70 hover:text-white'
              }`}
            >
              CARS ({INITIAL_CARS.length})
            </button>
            <button
              onClick={() => { sound.playButtonClick(); setActiveTab('CUSTOMIZE'); }}
              className={`py-2 rounded-xl text-xs font-tech font-bold uppercase transition-all ${
                activeTab === 'CUSTOMIZE' ? 'bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white shadow-md' : 'text-white/70 hover:text-white'
              }`}
            >
              PAINT & GLOW
            </button>
            <button
              onClick={() => { sound.playButtonClick(); setActiveTab('UPGRADES'); }}
              className={`py-2 rounded-xl text-xs font-tech font-bold uppercase transition-all ${
                activeTab === 'UPGRADES' ? 'bg-gradient-to-r from-[#FF8A00] to-[#FFD43B] text-neutral-950 font-black shadow-md' : 'text-white/70 hover:text-white'
              }`}
            >
              TUNING
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
                          ? 'border-[#00CFFF] bg-[#1677FF]/20 shadow-[0_0_20px_rgba(0,207,255,0.3)]'
                          : 'border-white/10 bg-[#172554]/60 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-tech font-bold text-[#00CFFF] uppercase">{car.category}</div>
                          <div className="text-base font-tech font-bold text-white">{car.name}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isCarUnlocked ? (
                            isCurrentActive ? (
                              <span className="px-2.5 py-1 rounded-lg bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 text-[10px] font-tech font-black">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/90 text-[10px] font-tech font-bold">
                                OWNED
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-[#FF8A00]/20 text-[#FFD43B] border border-[#FFD43B]/40 text-[10px] font-tech font-black flex items-center gap-1">
                              <Lock className="w-3 h-3 text-[#FFD43B]" />
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
                    className={`w-full py-3 rounded-2xl font-tech font-black text-sm uppercase tracking-wider transition-all border ${
                      profile.selectedCarId === currentCarDef.id
                        ? 'bg-[#22C55E] text-neutral-950 border-[#22C55E] cursor-default'
                        : 'bg-gradient-to-r from-[#1677FF] to-[#00CFFF] text-white border-white/20 hover:brightness-110 active:scale-95 shadow-xl'
                    }`}
                  >
                    {profile.selectedCarId === currentCarDef.id ? 'SELECTED FOR DRIVING' : 'CHOOSE THIS CAR'}
                  </button>
                ) : (
                  <button
                    id="btn-unlock-car"
                    onClick={handleUnlockCar}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FF8A00] to-[#FFD43B] hover:from-[#FF8A00] hover:to-[#FFD43B] text-neutral-950 font-tech font-black text-sm uppercase tracking-wider shadow-xl active:scale-95 flex items-center justify-center gap-2 border border-white/30"
                  >
                    <Sparkles className="w-4 h-4 text-neutral-950" />
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
                <label className="text-[11px] font-tech font-bold text-sky-200 uppercase tracking-wider block mb-2">
                  PAINT FINISH
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['gloss', 'metallic', 'matte'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => handlePaintTypeChange(type)}
                      className={`py-2 rounded-xl text-xs font-tech font-bold uppercase border transition-all ${
                        userCarData.paintType === type
                          ? 'border-[#00CFFF] bg-[#1677FF]/30 text-[#00CFFF] shadow-md'
                          : 'border-white/10 bg-[#0b1329]/60 text-white/70 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Swatches (10 Round Color Circles) */}
              <div>
                <label className="text-[11px] font-tech font-bold text-sky-200 uppercase tracking-wider block mb-2">
                  BODY COLOR ({COLOR_PALETTES.length} COLORS)
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {COLOR_PALETTES.map(c => {
                    const isSelected = userCarData.color === c.hex;
                    return (
                      <button
                        key={c.name}
                        onClick={() => handleColorChange(c.hex)}
                        className={`h-11 w-11 rounded-full mx-auto flex items-center justify-center border-2 transition-all shadow-md ${
                          isSelected ? 'border-white scale-110 shadow-[0_0_18px_rgba(255,255,255,0.7)] ring-2 ring-[#00CFFF]' : 'border-white/30 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={`${c.emoji || ''} ${c.name}`}
                      >
                        {isSelected && <Check className="w-5 h-5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Neon Underglow */}
              <div>
                <label className="text-[11px] font-tech font-bold text-sky-200 uppercase tracking-wider block mb-2">
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
                            ? 'border-[#00CFFF] bg-[#1677FF]/30 text-[#00CFFF] shadow-md'
                            : 'border-white/10 bg-[#0b1329]/60 text-white/70 hover:text-white'
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

                // Specific colors per user request:
                // ENGINE: Orange (#FF8A00), BRAKES: Red (#EF4444), HANDLING: Blue (#1677FF), DURABILITY: Green (#22C55E), TURBO: Purple (#7C3AED)
                const partStyles: Record<string, { border: string; bg: string; iconColor: string; activePip: string }> = {
                  engine: { border: 'border-[#FF8A00]/40', bg: 'bg-[#FF8A00]/10', iconColor: 'text-[#FF8A00]', activePip: 'bg-[#FF8A00]' },
                  brakes: { border: 'border-[#EF4444]/40', bg: 'bg-[#EF4444]/10', iconColor: 'text-[#EF4444]', activePip: 'bg-[#EF4444]' },
                  handling: { border: 'border-[#1677FF]/40', bg: 'bg-[#1677FF]/10', iconColor: 'text-[#00CFFF]', activePip: 'bg-[#1677FF]' },
                  durability: { border: 'border-[#22C55E]/40', bg: 'bg-[#22C55E]/10', iconColor: 'text-[#22C55E]', activePip: 'bg-[#22C55E]' },
                  turbo: { border: 'border-[#7C3AED]/40', bg: 'bg-[#7C3AED]/10', iconColor: 'text-[#EC4899]', activePip: 'bg-[#7C3AED]' },
                };
                const style = partStyles[partKey] || partStyles.engine;

                return (
                  <div key={partKey} className={`p-3 rounded-2xl border ${style.border} ${style.bg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {partKey === 'engine' && <Gauge className={`w-4 h-4 ${style.iconColor}`} />}
                        {partKey === 'brakes' && <Disc className={`w-4 h-4 ${style.iconColor}`} />}
                        {partKey === 'handling' && <Wrench className={`w-4 h-4 ${style.iconColor}`} />}
                        {partKey === 'durability' && <Shield className={`w-4 h-4 ${style.iconColor}`} />}
                        {partKey === 'turbo' && <Zap className={`w-4 h-4 ${style.iconColor}`} />}
                        <span className="text-sm font-tech font-bold text-white uppercase">{conf.name}</span>
                      </div>

                      <span className={`text-xs font-tech font-bold ${style.iconColor}`}>
                        LVL {currentLvl} / 5
                      </span>
                    </div>

                    <p className="text-[11px] text-sky-100/80">{conf.desc}</p>

                    {/* 5-Stage Level Pips & Upgrade Button */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div
                            key={step}
                            className={`w-6 h-2 rounded-full transition-all ${
                              step <= currentLvl
                                ? `${style.activePip} shadow-[0_0_8px_rgba(255,255,255,0.6)]`
                                : 'bg-[#0b1329]/80 border border-white/10'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => handleUpgrade(partKey)}
                        disabled={isMax || profile.coins < cost}
                        className={`px-3 py-1.5 rounded-xl font-tech font-black text-xs uppercase tracking-wider transition-all border ${
                          isMax
                            ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-default'
                            : profile.coins >= cost
                            ? 'bg-gradient-to-r from-[#FF8A00] to-[#FFD43B] text-neutral-950 border-white/30 hover:brightness-110 active:scale-95 shadow-md font-black'
                            : 'bg-neutral-800/80 text-neutral-500 border-neutral-700 cursor-not-allowed'
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
          <div className="mt-4 pt-4 border-t border-white/20 space-y-2.5">
            <div className="text-[11px] font-tech font-bold text-sky-200 uppercase tracking-wider">
              VEHICLE SPECIFICATIONS
            </div>

            {/* Top Speed */}
            <div>
              <div className="flex justify-between text-xs font-tech text-sky-100 mb-1">
                <span>Top Speed</span>
                <span className="font-bold text-[#00CFFF]">
                  {currentCarDef.baseStats.topSpeed + (userCarData.upgrades.engine * 12) + (userCarData.upgrades.turbo * 6)} km/h
                </span>
              </div>
              <div className="w-full h-2 bg-[#0b1329]/90 border border-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1677FF] to-[#00CFFF] rounded-full shadow-[0_0_8px_rgba(0,207,255,0.6)]"
                  style={{ width: `${Math.min(100, (currentCarDef.baseStats.topSpeed / 250) * 100)}%` }}
                />
              </div>
            </div>

            {/* Acceleration */}
            <div>
              <div className="flex justify-between text-xs font-tech text-sky-100 mb-1">
                <span>Acceleration</span>
                <span className="font-bold text-[#22C55E]">
                  {(currentCarDef.baseStats.acceleration + (userCarData.upgrades.engine * 0.8) + (userCarData.upgrades.turbo * 1.1)).toFixed(1)} / 10
                </span>
              </div>
              <div className="w-full h-2 bg-[#0b1329]/90 border border-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#22C55E] to-[#FFD43B] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                  style={{ width: `${Math.min(100, (currentCarDef.baseStats.acceleration / 10) * 100)}%` }}
                />
              </div>
            </div>

            {/* Handling */}
            <div>
              <div className="flex justify-between text-xs font-tech text-sky-100 mb-1">
                <span>Handling</span>
                <span className="font-bold text-[#EC4899]">
                  {(currentCarDef.baseStats.handling + (userCarData.upgrades.handling * 0.8)).toFixed(1)} / 10
                </span>
              </div>
              <div className="w-full h-2 bg-[#0b1329]/90 border border-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-full shadow-[0_0_8px_rgba(236,72,153,0.6)]"
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
