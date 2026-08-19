import * as THREE from 'three';
import { CarDefinition } from '../types/game';

export interface Car3DInstance {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMaterial: THREE.MeshStandardMaterial;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  headlights: THREE.Mesh[];
  brakeLights: THREE.Mesh[];
  reverseLights: THREE.Mesh[];
  leftTurnIndicators: THREE.Mesh[];
  rightTurnIndicators: THREE.Mesh[];
  underglowLight?: THREE.PointLight;
  headlightLamps?: THREE.SpotLight[];
  headlightTarget?: THREE.Object3D;
  wheelMeshes: THREE.Mesh[];
  style: string;
}

export class Car3DBuilder {
  /**
   * Builds a rich procedural 3D car model based on car definition and options
   */
  public static createCar(
    carDef: CarDefinition,
    options: {
      color?: string;
      paintType?: 'gloss' | 'metallic' | 'matte';
      hasUnderglow?: boolean;
      underglowColor?: string;
      enableRealLights?: boolean;
      castShadows?: boolean;
    } = {}
  ): Car3DInstance {
    const colorHex = options.color || carDef.color;
    const paintType = options.paintType || carDef.paintType || 'gloss';
    const hasUnderglow = options.hasUnderglow ?? carDef.hasUnderglow;
    const underglowColor = options.underglowColor || carDef.underglowColor || '#3B82F6';
    const enableRealLights = options.enableRealLights ?? true;
    const castShadows = options.castShadows ?? true;

    const root = new THREE.Group();
    root.name = `car_${carDef.id}`;

    // Paint material setup
    let roughness = 0.2;
    let metalness = 0.6;
    if (paintType === 'matte') {
      roughness = 0.85;
      metalness = 0.1;
    } else if (paintType === 'metallic') {
      roughness = 0.15;
      metalness = 0.85;
    }

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness,
      metalness,
      envMapIntensity: 1.2,
    });

    const darkTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.8,
      metalness: 0.2,
    });

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.1,
      metalness: 0.95,
    });

    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.82,
    });

    const headlightMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const taillightMat = new THREE.MeshBasicMaterial({
      color: 0x991b1b,
    });

    const reverseMat = new THREE.MeshBasicMaterial({
      color: 0x333333,
    });

    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0x451a03,
    });

    const wheelMeshes: THREE.Mesh[] = [];
    const headlights: THREE.Mesh[] = [];
    const brakeLights: THREE.Mesh[] = [];
    const reverseLights: THREE.Mesh[] = [];
    const leftTurnIndicators: THREE.Mesh[] = [];
    const rightTurnIndicators: THREE.Mesh[] = [];

    let bodyMesh: THREE.Mesh;

    // Build Style-Specific Chassis
    if (carDef.modelStyle === 'racer') {
      // STREET RACER (APEX GT) - Low slung sports coupe with aerodynamic curves and rear wing
      const chassisGeo = new THREE.BoxGeometry(1.9, 0.42, 4.3);
      bodyMesh = new THREE.Mesh(chassisGeo, bodyMaterial);
      bodyMesh.position.y = 0.38;
      bodyMesh.castShadow = castShadows;
      root.add(bodyMesh);

      // Cabin / Cockpit
      const cabinGeo = new THREE.BoxGeometry(1.5, 0.42, 2.2);
      const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabin.position.set(0, 0.72, -0.15);
      cabin.castShadow = castShadows;
      root.add(cabin);

      // Windshield & Windows
      const windshieldGeo = new THREE.BoxGeometry(1.42, 0.38, 2.1);
      const windshield = new THREE.Mesh(windshieldGeo, glassMaterial);
      windshield.position.set(0, 0.74, -0.15);
      root.add(windshield);

      // Front Hood Scoop / Splitter
      const hoodScoop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.9), darkTrimMaterial);
      hoodScoop.position.set(0, 0.62, 1.1);
      root.add(hoodScoop);

      const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.06, 0.5), darkTrimMaterial);
      frontSplitter.position.set(0, 0.18, 2.1);
      root.add(frontSplitter);

      // Rear GT Racing Spoiler
      const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.35), darkTrimMaterial);
      spoilerWing.position.set(0, 0.96, -1.95);
      spoilerWing.castShadow = castShadows;
      root.add(spoilerWing);

      const spoilerLeftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.1), darkTrimMaterial);
      spoilerLeftPillar.position.set(-0.65, 0.76, -1.95);
      root.add(spoilerLeftPillar);

      const spoilerRightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.1), darkTrimMaterial);
      spoilerRightPillar.position.set(0.65, 0.76, -1.95);
      root.add(spoilerRightPillar);

      // Dual Exhaust pipes
      const exhaustL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12), chromeMaterial);
      exhaustL.rotation.x = Math.PI / 2;
      exhaustL.position.set(-0.45, 0.25, -2.18);
      root.add(exhaustL);

      const exhaustR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12), chromeMaterial);
      exhaustR.rotation.x = Math.PI / 2;
      exhaustR.position.set(0.45, 0.25, -2.18);
      root.add(exhaustR);

    } else if (carDef.modelStyle === 'suv') {
      // URBAN SUV (TITAN TX) - Robust, elevated boxy chassis with roof racks
      const chassisGeo = new THREE.BoxGeometry(2.05, 0.65, 4.4);
      bodyMesh = new THREE.Mesh(chassisGeo, bodyMaterial);
      bodyMesh.position.y = 0.62;
      bodyMesh.castShadow = castShadows;
      root.add(bodyMesh);

      // Large tall cabin
      const cabinGeo = new THREE.BoxGeometry(1.85, 0.62, 2.7);
      const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabin.position.set(0, 1.15, -0.3);
      cabin.castShadow = castShadows;
      root.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.58, 2.62), glassMaterial);
      windshield.position.set(0, 1.16, -0.3);
      root.add(windshield);

      // Roof Rails
      const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.4), darkTrimMaterial);
      railLeft.position.set(-0.75, 1.5, -0.3);
      root.add(railLeft);

      const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.4), darkTrimMaterial);
      railRight.position.set(0.75, 1.5, -0.3);
      root.add(railRight);

      // Rugged lower bumpers & wheel fenders
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.22, 0.4), darkTrimMaterial);
      frontBumper.position.set(0, 0.38, 2.15);
      root.add(frontBumper);

      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.22, 0.4), darkTrimMaterial);
      rearBumper.position.set(0, 0.38, -2.15);
      root.add(rearBumper);

    } else if (carDef.modelStyle === 'hyper') {
      // ELECTRIC HYPERCAR (VOLT SPECTRE) - Extreme low aero wedge, cockpit canopy, aggressive diffusers
      const chassisGeo = new THREE.BoxGeometry(2.0, 0.36, 4.5);
      bodyMesh = new THREE.Mesh(chassisGeo, bodyMaterial);
      bodyMesh.position.y = 0.32;
      bodyMesh.castShadow = castShadows;
      root.add(bodyMesh);

      // Teardrop Cockpit Dome
      const cabinGeo = new THREE.BoxGeometry(1.4, 0.36, 2.0);
      const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabin.position.set(0, 0.62, -0.1);
      root.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.34, 1.9), glassMaterial);
      windshield.position.set(0, 0.63, -0.1);
      root.add(windshield);

      // Side air scoops
      const scoopL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.8), darkTrimMaterial);
      scoopL.position.set(-0.95, 0.42, -0.5);
      root.add(scoopL);

      const scoopR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.8), darkTrimMaterial);
      scoopR.position.set(0.95, 0.42, -0.5);
      root.add(scoopR);

      // Rear Active Aero Fin
      const centerFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 1.1), darkTrimMaterial);
      centerFin.position.set(0, 0.72, -1.5);
      root.add(centerFin);

    } else if (carDef.modelStyle === 'classic') {
      // CLASSIC CRUISER (VANGUARD 70) - Long muscular hood, wide stance, chrome accents
      const chassisGeo = new THREE.BoxGeometry(1.95, 0.45, 4.6);
      bodyMesh = new THREE.Mesh(chassisGeo, bodyMaterial);
      bodyMesh.position.y = 0.42;
      bodyMesh.castShadow = castShadows;
      root.add(bodyMesh);

      const cabinGeo = new THREE.BoxGeometry(1.6, 0.44, 1.9);
      const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabin.position.set(0, 0.8, -0.45);
      cabin.castShadow = castShadows;
      root.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.4, 1.82), glassMaterial);
      windshield.position.set(0, 0.82, -0.45);
      root.add(windshield);

      // Classic Chrome Bumpers
      const frontChrome = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.2), chromeMaterial);
      frontChrome.position.set(0, 0.32, 2.32);
      root.add(frontChrome);

      const rearChrome = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.2), chromeMaterial);
      rearChrome.position.set(0, 0.32, -2.32);
      root.add(rearChrome);

    } else {
      // CITY COMPACT (PULSE HATCH) - Default balanced city hatchback
      const chassisGeo = new THREE.BoxGeometry(1.8, 0.48, 3.8);
      bodyMesh = new THREE.Mesh(chassisGeo, bodyMaterial);
      bodyMesh.position.y = 0.42;
      bodyMesh.castShadow = castShadows;
      root.add(bodyMesh);

      // Hatchback Cabin
      const cabinGeo = new THREE.BoxGeometry(1.52, 0.48, 2.1);
      const cabin = new THREE.Mesh(cabinGeo, bodyMaterial);
      cabin.position.set(0, 0.82, -0.3);
      cabin.castShadow = castShadows;
      root.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.44, 2.02), glassMaterial);
      windshield.position.set(0, 0.84, -0.3);
      root.add(windshield);

      // Rear hatchback slant
      const hatchBack = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.38, 0.4), bodyMaterial);
      hatchBack.position.set(0, 0.72, -1.38);
      root.add(hatchBack);
    }

    // --- LIGHTS CREATION ---
    const carLength = carDef.modelStyle === 'suv' || carDef.modelStyle === 'classic' || carDef.modelStyle === 'hyper' ? 2.2 : 1.95;
    const carWidth = carDef.modelStyle === 'suv' ? 0.85 : 0.75;
    const lightY = carDef.modelStyle === 'suv' ? 0.65 : 0.42;

    // Headlights (Front Left & Front Right)
    const hlGeo = new THREE.BoxGeometry(0.32, 0.12, 0.08);
    const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
    hlLeft.position.set(-carWidth + 0.1, lightY, carLength);
    root.add(hlLeft);
    headlights.push(hlLeft);

    const hlRight = new THREE.Mesh(hlGeo, headlightMat);
    hlRight.position.set(carWidth - 0.1, lightY, carLength);
    root.add(hlRight);
    headlights.push(hlRight);

    // Front Turn Indicators
    const indGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);
    const flInd = new THREE.Mesh(indGeo, indicatorMat);
    flInd.position.set(-carWidth - 0.08, lightY, carLength);
    root.add(flInd);
    leftTurnIndicators.push(flInd);

    const frInd = new THREE.Mesh(indGeo, indicatorMat);
    frInd.position.set(carWidth + 0.08, lightY, carLength);
    root.add(frInd);
    rightTurnIndicators.push(frInd);

    // Taillights / Brake Lights (Rear Left & Rear Right)
    const tlGeo = new THREE.BoxGeometry(0.34, 0.12, 0.08);
    const tlLeft = new THREE.Mesh(tlGeo, taillightMat);
    tlLeft.position.set(-carWidth + 0.1, lightY, -carLength);
    root.add(tlLeft);
    brakeLights.push(tlLeft);

    const tlRight = new THREE.Mesh(tlGeo, taillightMat);
    tlRight.position.set(carWidth - 0.1, lightY, -carLength);
    root.add(tlRight);
    brakeLights.push(tlRight);

    // Reverse Lights
    const revGeo = new THREE.BoxGeometry(0.12, 0.08, 0.08);
    const revLeft = new THREE.Mesh(revGeo, reverseMat);
    revLeft.position.set(-carWidth + 0.32, lightY, -carLength);
    root.add(revLeft);
    reverseLights.push(revLeft);

    const revRight = new THREE.Mesh(revGeo, reverseMat);
    revRight.position.set(carWidth - 0.32, lightY, -carLength);
    root.add(revRight);
    reverseLights.push(revRight);

    // Rear Turn Indicators
    const rlInd = new THREE.Mesh(indGeo, indicatorMat);
    rlInd.position.set(-carWidth - 0.08, lightY, -carLength);
    root.add(rlInd);
    leftTurnIndicators.push(rlInd);

    const rrInd = new THREE.Mesh(indGeo, indicatorMat);
    rrInd.position.set(carWidth + 0.08, lightY, -carLength);
    root.add(rrInd);
    rightTurnIndicators.push(rrInd);

    // Optional Spotlights for real Night driving headlights
    let headlightLamps: THREE.SpotLight[] | undefined;
    let headlightTarget: THREE.Object3D | undefined;

    if (enableRealLights) {
      headlightTarget = new THREE.Object3D();
      headlightTarget.position.set(0, 0, carLength + 20);
      root.add(headlightTarget);

      const spotL = new THREE.SpotLight(0xfff5ea, 2.5, 38, Math.PI / 6, 0.45, 1.2);
      spotL.position.set(-carWidth + 0.1, lightY, carLength);
      spotL.target = headlightTarget;
      spotL.visible = false;
      root.add(spotL);

      const spotR = new THREE.SpotLight(0xfff5ea, 2.5, 38, Math.PI / 6, 0.45, 1.2);
      spotR.position.set(carWidth - 0.1, lightY, carLength);
      spotR.target = headlightTarget;
      spotR.visible = false;
      root.add(spotR);

      headlightLamps = [spotL, spotR];
    }

    // Optional Neon Underglow
    let underglowLight: THREE.PointLight | undefined;
    if (hasUnderglow && underglowColor !== 'none') {
      const glowBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.04, 3.2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(underglowColor) })
      );
      glowBar.position.set(0, 0.12, 0);
      root.add(glowBar);

      underglowLight = new THREE.PointLight(new THREE.Color(underglowColor), 1.8, 4.5, 1.5);
      underglowLight.position.set(0, 0.15, 0);
      root.add(underglowLight);
    }

    // --- WHEELS CREATION ---
    const wheelRadius = carDef.modelStyle === 'suv' ? 0.42 : 0.35;
    const wheelWidth = 0.28;
    const wheelOffsetZ = carDef.modelStyle === 'suv' || carDef.modelStyle === 'classic' || carDef.modelStyle === 'hyper' ? 1.45 : 1.25;
    const wheelOffsetX = carDef.modelStyle === 'suv' ? 1.05 : 0.95;
    const wheelY = wheelRadius;

    const createWheelAssembly = (isLeft: boolean) => {
      const group = new THREE.Group();

      // Tire (Rubber)
      const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.9,
        metalness: 0.1,
      });
      const tireMesh = new THREE.Mesh(tireGeo, tireMat);
      tireMesh.rotation.z = Math.PI / 2;
      tireMesh.castShadow = castShadows;
      group.add(tireMesh);
      wheelMeshes.push(tireMesh);

      // Rim (Alloy Spokes)
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 12);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xd4d4d8,
        roughness: 0.25,
        metalness: 0.85,
      });
      const rimMesh = new THREE.Mesh(rimGeo, rimMat);
      rimMesh.rotation.z = Math.PI / 2;
      group.add(rimMesh);

      // Brake Rotor / Disc
      const rotorGeo = new THREE.CylinderGeometry(wheelRadius * 0.5, wheelRadius * 0.5, 0.05, 12);
      const rotorMat = new THREE.MeshStandardMaterial({
        color: 0x71717a,
        roughness: 0.4,
        metalness: 0.9,
      });
      const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
      rotorMesh.rotation.z = Math.PI / 2;
      rotorMesh.position.x = isLeft ? 0.05 : -0.05;
      group.add(rotorMesh);

      return group;
    };

    const frontLeftWheel = createWheelAssembly(true);
    frontLeftWheel.position.set(-wheelOffsetX, wheelY, wheelOffsetZ);
    root.add(frontLeftWheel);

    const frontRightWheel = createWheelAssembly(false);
    frontRightWheel.position.set(wheelOffsetX, wheelY, wheelOffsetZ);
    root.add(frontRightWheel);

    const rearLeftWheel = createWheelAssembly(true);
    rearLeftWheel.position.set(-wheelOffsetX, wheelY, -wheelOffsetZ);
    root.add(rearLeftWheel);

    const rearRightWheel = createWheelAssembly(false);
    rearRightWheel.position.set(wheelOffsetX, wheelY, -wheelOffsetZ);
    root.add(rearRightWheel);

    return {
      root,
      bodyMesh,
      bodyMaterial,
      frontLeftWheel,
      frontRightWheel,
      rearLeftWheel,
      rearRightWheel,
      headlights,
      brakeLights,
      reverseLights,
      leftTurnIndicators,
      rightTurnIndicators,
      underglowLight,
      headlightLamps,
      headlightTarget,
      wheelMeshes,
      style: carDef.modelStyle,
    };
  }

  /**
   * Updates dynamic car lights (headlights, brake lights, reverse, turn signals)
   */
  public static updateCarLights(
    car: Car3DInstance,
    state: {
      headlightsOn: boolean;
      isBraking: boolean;
      isReversing: boolean;
      leftSignalOn: boolean;
      rightSignalOn: boolean;
      indicatorBlinkState: boolean;
    }
  ) {
    // Headlights
    car.headlights.forEach(hl => {
      (hl.material as THREE.MeshBasicMaterial).color.setHex(state.headlightsOn ? 0xffffff : 0x444444);
    });

    if (car.headlightLamps) {
      car.headlightLamps.forEach(lamp => {
        lamp.visible = state.headlightsOn;
      });
    }

    // Brake Lights
    car.brakeLights.forEach(bl => {
      if (state.isBraking) {
        (bl.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      } else if (state.headlightsOn) {
        (bl.material as THREE.MeshBasicMaterial).color.setHex(0x7f1d1d);
      } else {
        (bl.material as THREE.MeshBasicMaterial).color.setHex(0x330000);
      }
    });

    // Reverse Lights
    car.reverseLights.forEach(rl => {
      (rl.material as THREE.MeshBasicMaterial).color.setHex(state.isReversing ? 0xffffff : 0x1f2937);
    });

    // Left Signals
    const leftActive = state.leftSignalOn && state.indicatorBlinkState;
    car.leftTurnIndicators.forEach(ind => {
      (ind.material as THREE.MeshBasicMaterial).color.setHex(leftActive ? 0xf59e0b : 0x451a03);
    });

    // Right Signals
    const rightActive = state.rightSignalOn && state.indicatorBlinkState;
    car.rightTurnIndicators.forEach(ind => {
      (ind.material as THREE.MeshBasicMaterial).color.setHex(rightActive ? 0xf59e0b : 0x451a03);
    });
  }
}
