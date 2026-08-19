import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { HomeScreen } from './components/HomeScreen';
import { GarageView } from './components/GarageView';
import { GameHUD } from './components/GameHUD';
import { MobileControls } from './components/MobileControls';
import { ParkingGuideHUD } from './components/ParkingGuideHUD';
import { MissionsModal } from './components/MissionsModal';
import { PauseModal } from './components/PauseModal';
import { ResultModal } from './components/ResultModal';
import { SettingsModal } from './components/SettingsModal';
import { DailyRewardModal } from './components/DailyRewardModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import {
  CameraView,
  ControlInputs,
  InGameTelemetry,
  MissionDefinition,
  ParkingState,
  TrafficViolation,
  UserProfile,
} from './types/game';
import { INITIAL_CARS, GAME_MISSIONS } from './game/constants';
import { StorageService } from './services/storage';
import { sound } from './services/audio';

type GameScreen = 'HOME' | 'PLAYING' | 'GARAGE';
type ActiveModal = 'NONE' | 'MISSIONS' | 'SETTINGS' | 'LEADERBOARD' | 'DAILY_REWARD' | 'PAUSE' | 'RESULT';

export function App() {
  const [profile, setProfile] = useState<UserProfile>(() => StorageService.loadProfile());
  const [screen, setScreen] = useState<GameScreen>('HOME');
  const [modal, setModal] = useState<ActiveModal>('NONE');

  const [activeMission, setActiveMission] = useState<MissionDefinition | null>(null);
  const [isWin, setIsWin] = useState<boolean>(false);
  const [failReason, setFailReason] = useState<string>('');
  const [resultStats, setResultStats] = useState<{
    score: number;
    coinsEarned: number;
    xpEarned: number;
    stars: number;
    accuracy: number;
    time: number;
    damage: number;
  } | undefined>(undefined);

  const [cameraView, setCameraView] = useState<CameraView>('CHASE');
  const [violations, setViolations] = useState<TrafficViolation[]>([]);
  const [parkingState, setParkingState] = useState<ParkingState>({
    isActive: false,
    distance: 999,
    accuracy: 0,
    angleDiff: 0,
    isWithinBounds: false,
    holdTime: 0,
    completed: false,
  });

  const [telemetry, setTelemetry] = useState<InGameTelemetry>({
    speedKmh: 0,
    rpm: 0,
    gear: 'P',
    steerAngle: 0,
    damagePercent: 0,
    isOffroad: false,
    currentScore: 0,
    cleanStreakSeconds: 0,
    distanceToObjective: 0,
    coinsCollectedInSession: 0,
    handbrake: false,
  });

  const [headlightsOn, setHeadlightsOn] = useState(false);
  const [leftSignalOn, setLeftSignalOn] = useState(false);
  const [rightSignalOn, setRightSignalOn] = useState(false);
  const [hazardOn, setHazardOn] = useState(false);

  const [mobileInputs, setMobileInputs] = useState<ControlInputs>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    reverse: false,
  });

  const gameCanvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Sync audio mute settings with profile
  useEffect(() => {
    sound.setMuted(
      !profile.settings.soundEnabled,
      !profile.settings.musicEnabled,
      !profile.settings.engineSoundEnabled
    );
  }, [profile.settings]);

  // Handle Mission Completion from Engine
  const handleMissionComplete = useCallback((stats: {
    score: number;
    coinsEarned: number;
    xpEarned: number;
    stars: number;
    accuracy: number;
    time: number;
    damage: number;
  }) => {
    sound.stopEngine();
    sound.playSuccess();

    if (activeMission) {
      StorageService.recordMissionResult(activeMission.id, stats.stars, stats.score, stats.time);
    }
    StorageService.addCoins(stats.coinsEarned);
    StorageService.addXp(stats.xpEarned);

    const updatedProfile = StorageService.loadProfile();
    setProfile(updatedProfile);

    setIsWin(true);
    setResultStats(stats);
    setModal('RESULT');
  }, [activeMission]);

  // Handle Mission Failure from Engine
  const handleMissionFail = useCallback((reason: string, finalScore: number) => {
    sound.stopEngine();
    sound.playFailure();

    setIsWin(false);
    setFailReason(reason);
    setResultStats({
      score: finalScore,
      coinsEarned: 0,
      xpEarned: 0,
      stars: 0,
      accuracy: 0,
      time: 0,
      damage: telemetry.damagePercent,
    });
    setModal('RESULT');
  }, [telemetry.damagePercent]);

  // Handle Telemetry updates from Engine
  const handleTelemetryUpdate = useCallback((telem: InGameTelemetry) => {
    setTelemetry(telem);
  }, []);

  // Handle Traffic Violations & Bonus Events
  const handleViolation = useCallback((v: TrafficViolation) => {
    setViolations(prev => [...prev.slice(-4), v]);
  }, []);

  // Handle Parking State updates
  const handleParkingUpdate = useCallback((park: ParkingState) => {
    setParkingState(park);
  }, []);

  // Start 3D Game Engine when entering 'PLAYING' screen
  useEffect(() => {
    if (screen !== 'PLAYING') {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      sound.stopEngine();
      return;
    }

    if (!gameCanvasContainerRef.current) return;

    const engine = new GameEngine(
      gameCanvasContainerRef.current,
      profile,
      {
        onTelemetryUpdate: handleTelemetryUpdate,
        onMissionSuccess: handleMissionComplete,
        onMissionFail: handleMissionFail,
        onViolation: handleViolation,
        onParkingUpdate: handleParkingUpdate,
      },
      activeMission || undefined,
      activeMission ? 'MISSION' : 'FREE_DRIVE'
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
      sound.stopEngine();
    };
  }, [screen, activeMission, profile.selectedCarId]);

  // Update mobile inputs in engine
  const handleMobileInputChange = useCallback((partial: Partial<ControlInputs>) => {
    setMobileInputs(prev => {
      const next = { ...prev, ...partial };
      if (engineRef.current) {
        engineRef.current.setMobileInputs(next);
      }
      return next;
    });
  }, []);

  // Keyboard shortcut controls for desktop
  useEffect(() => {
    if (screen !== 'PLAYING') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (modal === 'NONE') {
          engineRef.current?.pause();
          setModal('PAUSE');
        } else if (modal === 'PAUSE') {
          engineRef.current?.resume();
          setModal('NONE');
        }
      } else if (e.key === 'c' || e.key === 'C') {
        cycleCamera();
      } else if (e.key === 'l' || e.key === 'L') {
        toggleHeadlights();
      } else if (e.key === 'h' || e.key === 'H') {
        handleHonk();
      } else if (e.key === 'q' || e.key === 'Q') {
        toggleLeftSignal();
      } else if (e.key === 'e' || e.key === 'E') {
        toggleRightSignal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, modal]);

  // Camera Cycle
  const cycleCamera = () => {
    if (!engineRef.current) return;
    sound.playButtonClick();
    const nextCam = engineRef.current.cycleCameraView();
    setCameraView(nextCam);
  };

  // Light & Signal Toggles
  const toggleHeadlights = () => {
    if (!engineRef.current) return;
    sound.playButtonClick();
    const state = engineRef.current.toggleHeadlights();
    setHeadlightsOn(state);
  };

  const toggleLeftSignal = () => {
    if (!engineRef.current) return;
    sound.playButtonClick();
    const state = engineRef.current.toggleLeftSignal();
    setLeftSignalOn(state);
    if (state) setRightSignalOn(false);
  };

  const toggleRightSignal = () => {
    if (!engineRef.current) return;
    sound.playButtonClick();
    const state = engineRef.current.toggleRightSignal();
    setRightSignalOn(state);
    if (state) setLeftSignalOn(false);
  };

  const toggleHazard = () => {
    if (!engineRef.current) return;
    sound.playButtonClick();
    const state = engineRef.current.toggleHazardLights();
    setHazardOn(state);
  };

  const handleHonk = () => {
    if (!engineRef.current) return;
    engineRef.current.honk();
  };

  // Start Free Drive
  const handleStartFreeDrive = () => {
    setActiveMission(null);
    setScreen('PLAYING');
    setModal('NONE');
  };

  // Start Specific Mission
  const handleStartMission = (mission: MissionDefinition) => {
    setActiveMission(mission);
    setScreen('PLAYING');
    setModal('NONE');
  };

  // Quick Start Parking Mode (Find first parking mission)
  const handleStartParkingMode = () => {
    const parkingMission = GAME_MISSIONS.find(m => m.category === 'Parking') || GAME_MISSIONS[1];
    handleStartMission(parkingMission);
  };

  // Next Mission after victory
  const handleNextMission = () => {
    if (!activeMission) {
      setScreen('HOME');
      setModal('NONE');
      return;
    }
    const nextId = activeMission.id + 1;
    const next = GAME_MISSIONS.find(m => m.id === nextId);
    if (next) {
      handleStartMission(next);
    } else {
      setScreen('HOME');
      setModal('NONE');
    }
  };

  // Restart Active Mission
  const handleRestartMission = () => {
    setModal('NONE');
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    // Re-trigger playing screen effect
    setScreen('HOME');
    setTimeout(() => {
      setScreen('PLAYING');
    }, 50);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      {/* 1. HOME SCREEN */}
      {screen === 'HOME' && (
        <HomeScreen
          profile={profile}
          onStartFreeDrive={handleStartFreeDrive}
          onOpenMissions={() => setModal('MISSIONS')}
          onOpenParking={handleStartParkingMode}
          onOpenGarage={() => setScreen('GARAGE')}
          onOpenLeaderboard={() => setModal('LEADERBOARD')}
          onOpenSettings={() => setModal('SETTINGS')}
          onOpenDailyReward={() => setModal('DAILY_REWARD')}
        />
      )}

      {/* 2. 3D DRIVING GAME SCREEN */}
      {screen === 'PLAYING' && (
        <div id="driving-game-container" className="relative w-full h-full overflow-hidden bg-neutral-950">
          {/* Three.js Canvas Host */}
          <div ref={gameCanvasContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Automotive Dashboard HUD */}
          <GameHUD
            telemetry={telemetry}
            mission={activeMission}
            cameraView={cameraView}
            onTogglePause={() => {
              engineRef.current?.pause();
              setModal('PAUSE');
            }}
            onCycleCamera={cycleCamera}
            violations={violations}
          />

          {/* Precision Parking Guide HUD */}
          <ParkingGuideHUD parkingState={parkingState} />

          {/* Ergonomic Mobile Touch Controls */}
          <MobileControls
            inputs={mobileInputs}
            onInputChange={handleMobileInputChange}
            onToggleLights={toggleHeadlights}
            onToggleLeftSignal={toggleLeftSignal}
            onToggleRightSignal={toggleRightSignal}
            onToggleHazard={toggleHazard}
            onHonk={handleHonk}
            headlightsOn={headlightsOn}
            leftSignalOn={leftSignalOn}
            rightSignalOn={rightSignalOn}
            hazardOn={hazardOn}
            gear={telemetry.gear}
          />
        </div>
      )}

      {/* 3. 3D GARAGE SHOWROOM */}
      {screen === 'GARAGE' && (
        <GarageView
          profile={profile}
          onUpdateProfile={setProfile}
          onBack={() => setScreen('HOME')}
          onTestDrive={handleStartFreeDrive}
        />
      )}

      {/* GLOBAL MODALS */}
      {modal === 'MISSIONS' && (
        <MissionsModal
          profile={profile}
          onSelectMission={handleStartMission}
          onClose={() => setModal('NONE')}
        />
      )}

      {modal === 'PAUSE' && (
        <PauseModal
          onResume={() => {
            engineRef.current?.resume();
            setModal('NONE');
          }}
          onRestart={handleRestartMission}
          onOpenSettings={() => setModal('SETTINGS')}
          onExitToHome={() => {
            setScreen('HOME');
            setModal('NONE');
          }}
        />
      )}

      {modal === 'RESULT' && (
        <ResultModal
          isWin={isWin}
          failReason={failReason}
          stats={resultStats}
          onRetry={handleRestartMission}
          onNextMission={isWin ? handleNextMission : undefined}
          onHome={() => {
            setScreen('HOME');
            setModal('NONE');
          }}
          onGarage={() => {
            setScreen('GARAGE');
            setModal('NONE');
          }}
        />
      )}

      {modal === 'SETTINGS' && (
        <SettingsModal
          profile={profile}
          onUpdateProfile={setProfile}
          onClose={() => {
            if (screen === 'PLAYING') {
              setModal('PAUSE');
            } else {
              setModal('NONE');
            }
          }}
        />
      )}

      {modal === 'DAILY_REWARD' && (
        <DailyRewardModal
          profile={profile}
          onUpdateProfile={setProfile}
          onClose={() => setModal('NONE')}
        />
      )}

      {modal === 'LEADERBOARD' && (
        <LeaderboardModal
          profile={profile}
          onClose={() => setModal('NONE')}
        />
      )}
    </div>
  );
}
export default App;
