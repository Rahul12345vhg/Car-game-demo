import * as THREE from 'three';
import { CarDefinition, CarUpgradeLevels } from '../types/game';
import { Car3DBuilder, Car3DInstance } from './Car3DBuilder';

export interface ControlInputs {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 (left) to 1 (right)
  handbrake: boolean;
  reverse: boolean;
  headlightsToggle?: boolean;
  leftSignalToggle?: boolean;
  rightSignalToggle?: boolean;
  hazardToggle?: boolean;
  horn?: boolean;
}

export class CarController {
  public car3D: Car3DInstance;
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public forwardVec: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  public rightVec: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

  public yaw: number = 0; // rotation angle around Y in radians
  public speed: number = 0; // speed in m/s (signed: positive = forward, negative = reverse)
  public steeringAngle: number = 0; // current wheel turn angle in radians
  public maxSteeringAngle: number = 0.58; // ~33 degrees

  // Stats & Tuning
  public topSpeedMs: number;
  public accelForce: number;
  public brakeForce: number;
  public handlingGrip: number;
  public durabilityRating: number;
  public damagePercent: number = 0;

  // Vehicle States
  public gear: 'P' | 'R' | 'N' | 'D' = 'D';
  public headlightsOn: boolean = false;
  public leftSignalOn: boolean = false;
  public rightSignalOn: boolean = false;
  public hazardLightsOn: boolean = false;
  public isDrifting: boolean = false;
  public indicatorBlinkTimer: number = 0;
  public indicatorBlinkState: boolean = false;

  // Suspension & Visual Tilt
  private pitchTilt: number = 0;
  private rollTilt: number = 0;

  // Bounding Collider
  public collider: THREE.Box3 = new THREE.Box3();
  public carLength: number = 4.2;
  public carWidth: number = 2.0;

  constructor(carDef: CarDefinition, upgrades: CarUpgradeLevels, customColor?: string, customPaint?: 'gloss' | 'metallic' | 'matte') {
    // Calculate tuned stats based on upgrades
    const topSpeedKmh = carDef.baseStats.topSpeed + (upgrades.engine * 12) + (upgrades.turbo * 6);
    this.topSpeedMs = topSpeedKmh / 3.6; // convert km/h to m/s

    this.accelForce = (carDef.baseStats.acceleration * 2.2) + (upgrades.engine * 1.5) + (upgrades.turbo * 2.0);
    this.brakeForce = (carDef.baseStats.braking * 3.6) + (upgrades.brakes * 2.2);
    this.handlingGrip = (carDef.baseStats.handling * 1.2) + (upgrades.handling * 0.8);
    this.durabilityRating = (carDef.baseStats.durability * 1.0) + (upgrades.durability * 1.2);

    this.car3D = Car3DBuilder.createCar(carDef, {
      color: customColor,
      paintType: customPaint,
      enableRealLights: true,
      castShadows: true,
    });

    this.updateVectors();
  }

  public setPosition(x: number, y: number, z: number, yaw: number = 0) {
    this.position.set(x, y, z);
    this.yaw = yaw;
    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.updateVectors();
    this.car3D.root.position.copy(this.position);
    this.car3D.root.rotation.y = this.yaw;
    this.updateCollider();
  }

  private updateVectors() {
    this.forwardVec.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
    this.rightVec.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  public updateCollider() {
    this.collider.setFromCenterAndSize(
      this.position.clone().add(new THREE.Vector3(0, 0.6, 0)),
      new THREE.Vector3(this.carWidth, 1.2, this.carLength)
    );
  }

  public applyDamage(amount: number) {
    // Reduce damage taken if vehicle has high durability rating
    const absorbed = amount / (1.0 + this.durabilityRating * 0.15);
    this.damagePercent = Math.min(100, Math.round(this.damagePercent + absorbed));
  }

  public repair(amount: number = 100) {
    this.damagePercent = Math.max(0, this.damagePercent - amount);
  }

  public update(delta: number, inputs: ControlInputs) {
    // 1. Indicator blinker clock
    this.indicatorBlinkTimer += delta;
    if (this.indicatorBlinkTimer >= 0.38) {
      this.indicatorBlinkTimer = 0;
      this.indicatorBlinkState = !this.indicatorBlinkState;
    }

    // 2. Damage engine degradation (loss of power at high damage)
    const damageMultiplier = Math.max(0.35, 1.0 - (this.damagePercent / 100) * 0.65);

    // 3. Gear Selection & Throttle/Braking logic
    let targetForwardForce = 0;
    const isBraking = inputs.brake > 0 || (inputs.throttle === 0 && inputs.reverse && this.speed > 1);

    if (inputs.reverse && this.speed <= 0.5) {
      this.gear = 'R';
      const maxReverseMs = 10; // ~36 km/h max reverse
      if (inputs.throttle > 0 || inputs.brake > 0) {
        targetForwardForce = -this.accelForce * 0.6 * (inputs.throttle || inputs.brake) * damageMultiplier;
        if (this.speed < -maxReverseMs) targetForwardForce = 0;
      }
    } else {
      this.gear = this.speed < -0.2 ? 'R' : 'D';
      if (inputs.throttle > 0) {
        targetForwardForce = this.accelForce * inputs.throttle * damageMultiplier;
        // Limit top speed
        if (this.speed >= this.topSpeedMs) {
          targetForwardForce = 0;
        }
      }
    }

    // 4. Deceleration & Natural Rolling Friction
    const dragCoeff = 0.988;
    this.speed *= Math.pow(dragCoeff, delta * 60);

    // 5. Active Braking & Handbrake
    if (inputs.brake > 0 && this.speed > 0) {
      const brakeDecel = this.brakeForce * inputs.brake * delta;
      this.speed = Math.max(0, this.speed - brakeDecel);
    } else if (inputs.reverse && this.speed > 0.5) {
      const brakeDecel = this.brakeForce * 0.8 * delta;
      this.speed = Math.max(0, this.speed - brakeDecel);
    }

    if (inputs.handbrake) {
      this.isDrifting = Math.abs(this.speed) > 7 && Math.abs(inputs.steer) > 0.2;
      const handbrakeDecel = this.brakeForce * 1.4 * delta;
      if (this.speed > 0) this.speed = Math.max(0, this.speed - handbrakeDecel);
      else this.speed = Math.min(0, this.speed + handbrakeDecel);
    } else {
      this.isDrifting = false;
    }

    // Apply acceleration
    this.speed += targetForwardForce * delta;

    // 6. Responsive Steering with Speed-Adaptive Sensitivity
    const speedRatio = Math.min(1.0, Math.abs(this.speed) / (this.topSpeedMs * 0.8));
    const dynamicMaxAngle = this.maxSteeringAngle * (1.0 - speedRatio * 0.45); // reduce max angle at top speed

    const targetSteerAngle = -inputs.steer * dynamicMaxAngle;
    // Smooth wheel interpolation
    this.steeringAngle = THREE.MathUtils.lerp(this.steeringAngle, targetSteerAngle, delta * 12);

    // 7. Angular Turning / Yaw based on Ackermann car kinematics
    if (Math.abs(this.speed) > 0.1) {
      const turnRadiusMultiplier = inputs.handbrake ? 2.4 : 1.0;
      const turnRate = (this.speed / 2.8) * Math.tan(this.steeringAngle) * turnRadiusMultiplier;
      this.yaw += turnRate * delta;
      this.updateVectors();
    }

    // 8. Update Translation Position
    this.velocity.copy(this.forwardVec).multiplyScalar(this.speed);
    this.position.addScaledVector(this.velocity, delta);

    // Ground clamping (stay on asphalt / road height)
    this.position.y = 0;

    // 9. Suspension Sway & Pitch Dynamics
    const targetPitch = (targetForwardForce > 0 ? -0.03 : isBraking ? 0.05 : 0) * (Math.abs(this.speed) / 20);
    const targetRoll = (this.steeringAngle * Math.min(1.5, Math.abs(this.speed) / 10)) * 0.08;

    this.pitchTilt = THREE.MathUtils.lerp(this.pitchTilt, targetPitch, delta * 8);
    this.rollTilt = THREE.MathUtils.lerp(this.rollTilt, targetRoll, delta * 8);

    // 10. Sync 3D Meshes Transform
    this.car3D.root.position.copy(this.position);
    this.car3D.root.rotation.y = this.yaw;
    this.car3D.root.rotation.x = this.pitchTilt;
    this.car3D.root.rotation.z = this.rollTilt;

    // 11. Animate Wheels (Steering Angle on front, Spinning on all)
    this.car3D.frontLeftWheel.rotation.y = this.steeringAngle;
    this.car3D.frontRightWheel.rotation.y = this.steeringAngle;

    const wheelSpinDelta = (this.speed / 0.35) * delta;
    this.car3D.wheelMeshes.forEach(wm => {
      wm.rotation.x += wheelSpinDelta;
    });

    // 12. Update Lights
    Car3DBuilder.updateCarLights(this.car3D, {
      headlightsOn: this.headlightsOn,
      isBraking: inputs.brake > 0 || (inputs.reverse && this.speed > 0.5),
      isReversing: this.gear === 'R',
      leftSignalOn: this.leftSignalOn || this.hazardLightsOn,
      rightSignalOn: this.rightSignalOn || this.hazardLightsOn,
      indicatorBlinkState: this.indicatorBlinkState,
    });

    // 13. Update Bounding Box
    this.updateCollider();
  }

  public getSpeedKmh(): number {
    return Math.round(this.speed * 3.6);
  }

  public getNormalizedRpm(): number {
    const absKmh = Math.abs(this.getSpeedKmh());
    // Simulate 5-gear automatic transmission RPM profile
    const gearSpan = this.topSpeedMs * 3.6 / 5;
    const currentGearRatio = (absKmh % gearSpan) / gearSpan;
    return Math.min(1.0, Math.max(0.15, currentGearRatio));
  }
}
