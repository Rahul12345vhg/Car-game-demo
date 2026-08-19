import * as THREE from 'three';
import { CameraView, GameSubMode, InGameTelemetry, MissionDefinition, ParkingState, TrafficViolation, UserProfile } from '../types/game';
import { INITIAL_CARS } from './constants';
import { CarController, ControlInputs } from './CarController';
import { CityWorld } from './CityWorld';
import { TrafficSystem } from './TrafficSystem';
import { RuleSystem } from './RuleSystem';
import { ParkingSystem } from './ParkingSystem';
import { sound } from '../services/audio';

export interface GameEngineCallbacks {
  onTelemetryUpdate: (telemetry: InGameTelemetry) => void;
  onMissionSuccess: (stats: {
    score: number;
    coinsEarned: number;
    xpEarned: number;
    stars: number;
    accuracy: number;
    time: number;
    damage: number;
  }) => void;
  onMissionFail: (reason: string, score: number) => void;
  onCoinCollected?: (totalInSession: number) => void;
  onViolation?: (violation: TrafficViolation) => void;
  onParkingUpdate?: (state: ParkingState) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Subsystems
  public world: CityWorld;
  public traffic: TrafficSystem;
  public rules: RuleSystem;
  public parking: ParkingSystem;
  public playerCar: CarController | null = null;

  // Game State
  private userProfile: UserProfile;
  private currentMission: MissionDefinition | null = null;
  private gameMode: GameSubMode = 'FREE_DRIVE';
  private callbacks: GameEngineCallbacks;

  // Mission progression
  private currentWaypointIndex: number = 0;
  private missionWaypoints: THREE.Vector3[] = [];
  private missionElapsedTime: number = 0;
  private sessionCoinsCollected: number = 0;
  private currentScore: number = 1000;
  private isGameOver: boolean = false;

  // Camera Tuning
  private cameraView: CameraView = 'CHASE';
  private currentCameraPos: THREE.Vector3 = new THREE.Vector3();
  private currentCameraLookAt: THREE.Vector3 = new THREE.Vector3();

  // Particle System (Smoke & Sparks)
  private particleGroup: THREE.Group = new THREE.Group();
  private smokeParticles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];

  // Active Control Inputs
  private keyboardInputs: ControlInputs = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    reverse: false,
  };

  private mobileInputs: ControlInputs = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    reverse: false,
  };

  public inputs: ControlInputs = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    reverse: false,
  };

  // Clock
  private clock: THREE.Clock = new THREE.Clock();

  constructor(
    container: HTMLElement,
    profile: UserProfile,
    callbacks: GameEngineCallbacks,
    mission?: MissionDefinition,
    mode: GameSubMode = 'FREE_DRIVE'
  ) {
    this.container = container;
    this.userProfile = profile;
    this.callbacks = callbacks;
    this.currentMission = mission || null;
    this.gameMode = mode;

    // 1. Initialize Renderer
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: profile.settings.graphicsQuality !== 'LOW',
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.settings.graphicsQuality === 'HIGH' ? 2 : 1.2));
    this.renderer.shadowMap.enabled = profile.settings.graphicsQuality !== 'LOW';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Ensure canvas fills container with absolute full-bleed position
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.zIndex = '0';

    container.appendChild(this.renderer.domElement);

    // 2. Initialize Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 600);

    // 3. Initialize City World
    const timeOfDay = mission ? mission.timeOfDay : 'DAY';
    this.world = new CityWorld(this.scene, profile.settings.graphicsQuality, timeOfDay);

    // 4. Initialize AI Traffic
    const density = mission ? mission.trafficDensity : 'medium';
    this.traffic = new TrafficSystem(this.scene, this.world, density);

    // 5. Initialize Rules and Parking Systems
    this.rules = new RuleSystem(this.world, violation => {
      this.currentScore = Math.max(0, this.currentScore + violation.pointsDelta);
      if (violation.coinsDelta !== 0) {
        this.sessionCoinsCollected = Math.max(0, this.sessionCoinsCollected + violation.coinsDelta);
      }
      if (violation.type === 'COLLISION') {
        sound.playCrash(1.0);
        if (this.userProfile.settings.vibrationEnabled && navigator.vibrate) {
          navigator.vibrate([80, 40, 120]);
        }
      }
      this.callbacks.onViolation?.(violation);
    });

    this.parking = new ParkingSystem(this.world);

    // 6. Particles
    this.scene.add(this.particleGroup);

    // 7. Spawn Player Vehicle
    this.spawnPlayerCar();

    // 8. Setup Mission Waypoints / Objectives
    this.setupMissionObjectives();

    // 9. Window, Container and Input Listeners
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    // Set initial size
    this.onResize();
    requestAnimationFrame(this.onResize);

    // 10. Start Engine Audio
    sound.setMuted(
      !this.userProfile.settings.soundEnabled,
      !this.userProfile.settings.musicEnabled,
      !this.userProfile.settings.engineSoundEnabled
    );
    sound.startEngine();

    // 11. Kick off render loop
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  private spawnPlayerCar() {
    const carId = this.userProfile.selectedCarId;
    const carDef = INITIAL_CARS.find(c => c.id === carId) || INITIAL_CARS[0];
    const carCustom = this.userProfile.ownedCars[carId] || {
      upgrades: { engine: 0, brakes: 0, handling: 0, durability: 0, turbo: 0 },
      color: carDef.color,
      paintType: carDef.paintType,
    };

    this.playerCar = new CarController(
      carDef,
      carCustom.upgrades,
      carCustom.color,
      carCustom.paintType
    );

    this.scene.add(this.playerCar.car3D.root);

    // Initial spawn point: lane 1 at starting road
    this.playerCar.setPosition(4.5, 0, -45, 0); // pointing +Z north

    // Night headlights auto-on if mission is night
    if (this.currentMission?.timeOfDay === 'NIGHT') {
      this.playerCar.headlightsOn = true;
    }
  }

  private setupMissionObjectives() {
    this.currentWaypointIndex = 0;
    this.missionWaypoints = [];
    this.missionElapsedTime = 0;
    this.isGameOver = false;

    if (!this.currentMission) {
      // Free Drive - initial open city explorer beacon
      this.missionWaypoints = [new THREE.Vector3(54, 0, 54)];
      this.world.createWaypointBeacon(this.missionWaypoints[0]);
      return;
    }

    if (this.currentMission.category === 'Parking') {
      const targetSlot = this.currentMission.targetParkSlotId || 'slot_1';
      this.parking.setTargetSlot(targetSlot);
      const slot = this.world.parkingSlots.find(s => s.id === targetSlot);
      if (slot) {
        this.world.createWaypointBeacon(slot.position);
      }
    } else {
      // Waypoint checkpoints
      const count = this.currentMission.targetWaypointsCount || 1;
      const waypoints = [
        new THREE.Vector3(4.5, 0, 95),
        new THREE.Vector3(95, 0, 95),
        new THREE.Vector3(95, 0, -60),
        new THREE.Vector3(-95, 0, 40),
      ];

      this.missionWaypoints = waypoints.slice(0, count);
      if (this.missionWaypoints.length > 0) {
        this.world.createWaypointBeacon(this.missionWaypoints[0]);
      }
    }
  }

  private updateCombinedInputs() {
    this.inputs.throttle = Math.max(this.keyboardInputs.throttle, this.mobileInputs.throttle);
    this.inputs.brake = Math.max(this.keyboardInputs.brake, this.mobileInputs.brake);
    this.inputs.steer = THREE.MathUtils.clamp(this.keyboardInputs.steer + this.mobileInputs.steer, -1, 1);
    this.inputs.handbrake = this.keyboardInputs.handbrake || this.mobileInputs.handbrake;
    this.inputs.reverse = this.keyboardInputs.reverse || this.mobileInputs.reverse;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    let handled = false;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keyboardInputs.throttle = 1;
        this.keyboardInputs.brake = 0;
        handled = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keyboardInputs.brake = 1;
        this.keyboardInputs.throttle = 0;
        handled = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keyboardInputs.steer = -1;
        handled = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keyboardInputs.steer = 1;
        handled = true;
        break;
      case 'Space':
        this.keyboardInputs.handbrake = true;
        handled = true;
        break;
      case 'KeyR':
        this.keyboardInputs.reverse = !this.keyboardInputs.reverse;
        handled = true;
        break;
      case 'KeyC':
        this.cycleCameraView();
        handled = true;
        break;
      case 'KeyL':
        this.toggleHeadlights();
        handled = true;
        break;
      case 'KeyQ':
        this.toggleLeftSignal();
        handled = true;
        break;
      case 'KeyE':
        this.toggleRightSignal();
        handled = true;
        break;
      case 'KeyZ':
      case 'KeyF':
        this.toggleHazardLights();
        handled = true;
        break;
      case 'KeyH':
        this.honk();
        handled = true;
        break;
      case 'KeyP':
      case 'Escape':
        this.setPaused(!this.isPaused);
        handled = true;
        break;
    }

    if (handled) {
      this.updateCombinedInputs();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    let handled = false;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keyboardInputs.throttle = 0;
        handled = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keyboardInputs.brake = 0;
        handled = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        if (this.keyboardInputs.steer < 0) this.keyboardInputs.steer = 0;
        handled = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        if (this.keyboardInputs.steer > 0) this.keyboardInputs.steer = 0;
        handled = true;
        break;
      case 'Space':
        this.keyboardInputs.handbrake = false;
        handled = true;
        break;
    }

    if (handled) {
      this.updateCombinedInputs();
    }
  };

  private onBlur = () => {
    this.keyboardInputs.throttle = 0;
    this.keyboardInputs.brake = 0;
    this.keyboardInputs.steer = 0;
    this.keyboardInputs.handbrake = false;
    this.updateCombinedInputs();
  };

  public setMobileInputs(inputs: Partial<ControlInputs>) {
    Object.assign(this.mobileInputs, inputs);
    this.updateCombinedInputs();
  }

  public setCameraView(view: CameraView) {
    this.cameraView = view;
  }

  public cycleCameraView(): CameraView {
    const views: CameraView[] = ['CHASE', 'CLOSE', 'HOOD', 'TOP_DOWN'];
    const nextIdx = (views.indexOf(this.cameraView) + 1) % views.length;
    this.cameraView = views[nextIdx];
    return this.cameraView;
  }

  public toggleHeadlights(): boolean {
    if (this.playerCar) {
      this.playerCar.headlightsOn = !this.playerCar.headlightsOn;
      sound.playButtonClick();
      return this.playerCar.headlightsOn;
    }
    return false;
  }

  public toggleLeftSignal(): boolean {
    if (this.playerCar) {
      this.playerCar.leftSignalOn = !this.playerCar.leftSignalOn;
      if (this.playerCar.leftSignalOn) this.playerCar.rightSignalOn = false;
      sound.playTurnIndicator();
      return this.playerCar.leftSignalOn;
    }
    return false;
  }

  public toggleRightSignal(): boolean {
    if (this.playerCar) {
      this.playerCar.rightSignalOn = !this.playerCar.rightSignalOn;
      if (this.playerCar.rightSignalOn) this.playerCar.leftSignalOn = false;
      sound.playTurnIndicator();
      return this.playerCar.rightSignalOn;
    }
    return false;
  }

  public toggleHazardLights(): boolean {
    if (this.playerCar) {
      this.playerCar.hazardLightsOn = !this.playerCar.hazardLightsOn;
      sound.playTurnIndicator();
      return this.playerCar.hazardLightsOn;
    }
    return false;
  }

  public honk() {
    this.honkHorn();
  }

  public honkHorn() {
    sound.playHorn();
    if (this.userProfile.settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(60);
    }
  }

  public pause() {
    this.setPaused(true);
  }

  public resume() {
    this.setPaused(false);
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      sound.stopEngine();
    } else {
      sound.startEngine();
    }
  }

  public restartSession() {
    if (this.playerCar) {
      this.playerCar.setPosition(4.5, 0, -45, 0);
      this.playerCar.repair(100);
    }
    this.rules.reset();
    this.parking.reset();
    this.sessionCoinsCollected = 0;
    this.currentScore = 1000;
    this.setupMissionObjectives();
    this.isPaused = false;
    sound.startEngine();
  }

  public resizeGame = () => {
    this.onResize();
  };

  private onResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private animate = () => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(0.1, this.clock.getDelta());

    if (!this.isPaused && !this.isGameOver) {
      this.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private update(delta: number) {
    if (!this.playerCar) return;

    this.missionElapsedTime += delta;

    // 1. Update Player Car physics
    this.playerCar.update(delta, this.inputs);

    const carPos = this.playerCar.position;
    const carSpeedKmh = this.playerCar.getSpeedKmh();
    const speedMs = this.playerCar.speed;

    // 2. Update Audio Synthesizer
    const rpmNorm = this.playerCar.getNormalizedRpm();
    sound.updateEngineRPM(
      rpmNorm,
      this.inputs.throttle,
      this.playerCar.isDrifting,
      this.inputs.brake > 0 && Math.abs(carSpeedKmh) > 25
    );

    // 3. Update AI Traffic
    this.traffic.update(delta, carPos, () => {
      sound.playHorn();
    });

    // 4. Update City World (Traffic Signals, Lights, Animations)
    this.world.update(delta);

    // 5. Check Obstacle Collisions & Off-road detection
    let isOffroad = false;
    const playerBox = this.playerCar.collider;

    // Check collision with static world colliders (Buildings, poles, barriers, sidewalks)
    for (const obst of this.world.colliders) {
      if (playerBox.intersectsBox(obst.box)) {
        if (obst.type === 'CURB') {
          isOffroad = true;
        } else {
          // Hard collision with building / pole / barrier
          const impactSpeed = Math.abs(carSpeedKmh);
          if (impactSpeed > 8) {
            this.playerCar.applyDamage(Math.round(impactSpeed * 0.45));
            this.rules.recordCollision('OBSTACLE', impactSpeed);
            this.spawnSparks(carPos);
            // Elastic collision bounce back
            this.playerCar.speed = -this.playerCar.speed * 0.35;
          }
          break;
        }
      }
    }

    // Check collision with AI traffic vehicles
    for (const ai of this.traffic.aiVehicles) {
      if (playerBox.intersectsBox(ai.collider)) {
        const impactSpeed = Math.abs(carSpeedKmh) + ai.speed * 3.6;
        if (impactSpeed > 6) {
          this.playerCar.applyDamage(Math.round(impactSpeed * 0.4));
          this.rules.recordCollision('VEHICLE', impactSpeed);
          this.spawnSparks(carPos);
          this.playerCar.speed = -this.playerCar.speed * 0.4;
          ai.speed = Math.max(0, ai.speed - 6);
        }
      }
    }

    // 6. Update Rule Violations
    this.rules.update(delta, carPos, carSpeedKmh, isOffroad, this.playerCar.forwardVec);

    // 7. Check Collectible Gold Coins
    for (const coin of this.world.coinPickups) {
      if (!coin.collected && carPos.distanceTo(coin.mesh.position) < 3.2) {
        coin.collected = true;
        this.world.scene.remove(coin.mesh);
        this.sessionCoinsCollected += 15;
        this.currentScore += 30;
        sound.playCoin();
        this.callbacks.onCoinCollected?.(this.sessionCoinsCollected);
      }
    }

    // 8. Particle System (Tire Drift Smoke & Engine Damage Smoke)
    this.updateParticles(delta);

    // 9. Mission & Parking Goal Checks
    let distToObjective = 0;
    if (this.currentMission?.category === 'Parking') {
      const pState = this.parking.update(delta, carPos, this.playerCar.yaw, carSpeedKmh);
      distToObjective = pState.distance;
      this.callbacks.onParkingUpdate?.(pState);

      // Parking radar beep when nearing slot
      if (pState.distance < 12 && Math.floor(this.missionElapsedTime * (15 - pState.distance)) % 3 === 0) {
        sound.playParkingBeep(600 + (12 - pState.distance) * 50);
      }

      if (pState.completed && !this.isGameOver) {
        this.handleMissionSuccess(pState.accuracy);
      }
    } else if (this.missionWaypoints.length > 0) {
      const currentTarget = this.missionWaypoints[this.currentWaypointIndex];
      if (currentTarget) {
        distToObjective = carPos.distanceTo(currentTarget);
        if (distToObjective < 5.5) {
          // Reached waypoint!
          sound.playCoin();
          this.currentScore += 150;
          this.sessionCoinsCollected += 25;
          this.callbacks.onCoinCollected?.(this.sessionCoinsCollected);

          if (this.currentMission) {
            this.currentWaypointIndex++;
            if (this.currentWaypointIndex >= this.missionWaypoints.length) {
              // All waypoints completed!
              this.handleMissionSuccess(95);
            } else {
              // Point to next waypoint
              this.world.createWaypointBeacon(this.missionWaypoints[this.currentWaypointIndex]);
            }
          } else {
            // Free Drive endless waypoints
            const exploreWaypoints = [
              new THREE.Vector3(4.5, 0, 95),
              new THREE.Vector3(95, 0, 95),
              new THREE.Vector3(95, 0, -60),
              new THREE.Vector3(-95, 0, 40),
              new THREE.Vector3(-45, 0, -95),
              new THREE.Vector3(45, 0, -95),
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(-95, 0, 95),
            ];
            const nextWp = exploreWaypoints[Math.floor(Math.random() * exploreWaypoints.length)];
            this.missionWaypoints = [nextWp];
            this.currentWaypointIndex = 0;
            this.world.createWaypointBeacon(nextWp);
          }
        }
      }
    }

    // 10. Fail Conditions (Damage 100% or Time Limit Exceeded)
    if (!this.isGameOver) {
      if (this.playerCar.damagePercent >= 100) {
        this.handleMissionFailure('Vehicle Totaled! 100% Damage Sustained');
      } else if (this.currentMission?.targetMaxDamage && this.playerCar.damagePercent > this.currentMission.targetMaxDamage) {
        this.handleMissionFailure(`Damage Exceeded Allowed Limit (> ${this.currentMission.targetMaxDamage}%)`);
      } else if (this.currentMission?.timeLimit && this.missionElapsedTime >= this.currentMission.timeLimit) {
        this.handleMissionFailure('Time Ran Out!');
      }
    }

    // 11. Camera Smoothing & Follow Logic
    this.updateCamera(delta, speedMs);

    // 12. Send Telemetry to React HUD
    const timeRemaining = this.currentMission?.timeLimit ? Math.max(0, this.currentMission.timeLimit - this.missionElapsedTime) : undefined;
    this.callbacks.onTelemetryUpdate({
      speedKmh: Math.abs(carSpeedKmh),
      rpm: rpmNorm,
      gear: this.playerCar.gear,
      damagePercent: this.playerCar.damagePercent,
      throttle: this.inputs.throttle,
      brake: this.inputs.brake,
      steeringAngle: this.playerCar.steeringAngle,
      handbrake: this.inputs.handbrake,
      headlightsOn: this.playerCar.headlightsOn,
      leftSignalOn: this.playerCar.leftSignalOn,
      rightSignalOn: this.playerCar.rightSignalOn,
      hazardLightsOn: this.playerCar.hazardLightsOn,
      distanceToObjective: Math.round(distToObjective),
      currentScore: this.currentScore,
      coinsCollectedInSession: this.sessionCoinsCollected,
      timeRemaining,
      elapsedTime: this.missionElapsedTime,
      isPaused: this.isPaused,
      isGameOver: this.isGameOver,
    });
  }

  private updateCamera(delta: number, speedMs: number) {
    if (!this.playerCar) return;

    const carPos = this.playerCar.position;
    const forward = this.playerCar.forwardVec;

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (this.cameraView === 'HOOD') {
      targetCamPos.copy(carPos).add(new THREE.Vector3(0, 1.15, 0)).addScaledVector(forward, 0.4);
      targetLookAt.copy(carPos).add(new THREE.Vector3(0, 1.1, 0)).addScaledVector(forward, 15);
      this.camera.position.lerp(targetCamPos, delta * 25);
      this.camera.lookAt(targetLookAt);
    } else if (this.cameraView === 'TOP_DOWN') {
      targetCamPos.copy(carPos).add(new THREE.Vector3(0, 28, -6));
      targetLookAt.copy(carPos);
      this.camera.position.lerp(targetCamPos, delta * 8);
      this.camera.lookAt(targetLookAt);
    } else if (this.cameraView === 'CLOSE') {
      targetCamPos.copy(carPos).add(new THREE.Vector3(0, 2.2, 0)).addScaledVector(forward, -5.2);
      targetLookAt.copy(carPos).add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(forward, 4);
      this.camera.position.lerp(targetCamPos, delta * 12);
      this.camera.lookAt(targetLookAt);
    } else {
      // DEFAULT CHASE CAMERA
      const speedLag = Math.min(2.5, Math.abs(speedMs) * 0.08);
      targetCamPos.copy(carPos).add(new THREE.Vector3(0, 3.4 + speedLag * 0.3, 0)).addScaledVector(forward, -7.5 - speedLag);
      targetLookAt.copy(carPos).add(new THREE.Vector3(0, 1.4, 0)).addScaledVector(forward, 5.0);

      this.camera.position.lerp(targetCamPos, delta * 9);
      this.currentCameraLookAt.lerp(targetLookAt, delta * 10);
      this.camera.lookAt(this.currentCameraLookAt);

      // Dynamic FOV on high speed
      const targetFov = 65 + Math.min(18, Math.abs(speedMs) * 0.35);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 4);
      this.camera.updateProjectionMatrix();
    }
  }

  private spawnSparks(pos: THREE.Vector3) {
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.SphereGeometry(0.08, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const spark = new THREE.Mesh(geo, mat);
      spark.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.6, (Math.random() - 0.5) * 1.5));
      this.particleGroup.add(spark);

      this.smokeParticles.push({
        mesh: spark,
        vel: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 2, (Math.random() - 0.5) * 8),
        life: 0.25,
        maxLife: 0.25,
      });
    }
  }

  private updateParticles(delta: number) {
    if (!this.playerCar) return;

    // Spawn tire smoke on drift / burnout
    if (this.playerCar.isDrifting && Math.random() > 0.4) {
      const smokeGeo = new THREE.SphereGeometry(0.35, 6, 6);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.5,
      });
      const smoke = new THREE.Mesh(smokeGeo, smokeMat);
      smoke.position.copy(this.playerCar.position).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.2, -1.5));
      this.particleGroup.add(smoke);

      this.smokeParticles.push({
        mesh: smoke,
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 2),
        life: 0.6,
        maxLife: 0.6,
      });
    }

    // Spawn damage smoke if car heavily damaged
    if (this.playerCar.damagePercent > 60 && Math.random() > 0.6) {
      const smokeGeo = new THREE.SphereGeometry(0.4, 6, 6);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0x1f2937,
        transparent: true,
        opacity: 0.6,
      });
      const smoke = new THREE.Mesh(smokeGeo, smokeMat);
      smoke.position.copy(this.playerCar.position).add(new THREE.Vector3(0, 0.8, 1.2));
      this.particleGroup.add(smoke);

      this.smokeParticles.push({
        mesh: smoke,
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 3 + 1, (Math.random() - 0.5) * 1.2),
        life: 0.8,
        maxLife: 0.8,
      });
    }

    // Animate & expire particles
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        this.smokeParticles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.vel, delta);
        const scale = 1.0 + (1.0 - p.life / p.maxLife) * 1.8;
        p.mesh.scale.set(scale, scale, scale);
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (p.life / p.maxLife) * 0.5;
      }
    }
  }

  private handleMissionSuccess(accuracy: number) {
    this.isGameOver = true;
    sound.stopEngine();
    sound.playSuccess();

    const violationsCount = this.rules.getViolationsCount();
    const damagePercent = this.playerCar?.damagePercent || 0;

    // Calculate Star Rating (1 to 3 stars)
    let stars = 1;
    if (violationsCount === 0 && damagePercent < 15 && accuracy >= 80) {
      stars = 3;
    } else if (violationsCount <= 1 && damagePercent < 35 && accuracy >= 65) {
      stars = 2;
    }

    const baseRewardCoins = this.currentMission?.rewardCoins || 300;
    const baseRewardXp = this.currentMission?.rewardXp || 200;
    const starMultiplier = stars === 3 ? 1.5 : stars === 2 ? 1.2 : 1.0;

    const totalCoinsEarned = Math.round(baseRewardCoins * starMultiplier) + this.sessionCoinsCollected;
    const totalXpEarned = Math.round(baseRewardXp * starMultiplier);

    this.callbacks.onMissionSuccess({
      score: this.currentScore,
      coinsEarned: totalCoinsEarned,
      xpEarned: totalXpEarned,
      stars,
      accuracy,
      time: Math.round(this.missionElapsedTime),
      damage: damagePercent,
    });
  }

  private handleMissionFailure(reason: string) {
    this.isGameOver = true;
    sound.stopEngine();
    sound.playFailure();
    this.callbacks.onMissionFail(reason, this.currentScore);
  }

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    sound.stopEngine();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
