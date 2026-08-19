import * as THREE from 'three';
import { TrafficViolation } from '../types/game';
import { CityWorld } from './CityWorld';

export class RuleSystem {
  private world: CityWorld;
  private violationsLog: TrafficViolation[] = [];
  private cleanDrivingTimer: number = 0;
  private lastViolationTime: number = 0;
  private redLightViolationCooldown: Map<string, number> = new Map();
  private speedViolationCooldown: number = 0;
  private sidewalkViolationCooldown: number = 0;

  // Callback to push toast notifications to HUD
  private onViolationCallback?: (violation: TrafficViolation) => void;

  constructor(world: CityWorld, onViolation?: (violation: TrafficViolation) => void) {
    this.world = world;
    this.onViolationCallback = onViolation;
  }

  public update(
    delta: number,
    carPos: THREE.Vector3,
    carSpeedKmh: number,
    isOffroad: boolean,
    carHeadingVec: THREE.Vector3
  ) {
    const now = Date.now();
    this.cleanDrivingTimer += delta;
    this.speedViolationCooldown = Math.max(0, this.speedViolationCooldown - delta);
    this.sidewalkViolationCooldown = Math.max(0, this.sidewalkViolationCooldown - delta);

    // 1. Red Light Compliance Check
    for (const signal of this.world.trafficSignals) {
      if (signal.state === 'RED') {
        const dist = carPos.distanceTo(signal.position);
        if (dist < 12) {
          const cooldown = this.redLightViolationCooldown.get(signal.id) || 0;
          if (now > cooldown) {
            // Check if car is moving forward past the light into intersection at speed (> 15 km/h)
            const toSignal = new THREE.Vector3().subVectors(signal.position, carPos);
            const isFacingIntersection = toSignal.dot(carHeadingVec) > 0;
            if (isFacingIntersection && carSpeedKmh > 15) {
              this.recordViolation({
                id: `red_${now}`,
                type: 'RED_LIGHT',
                message: 'Red Light Violation! -50 pts',
                pointsDelta: -50,
                coinsDelta: -25,
                timestamp: now,
              });
              this.redLightViolationCooldown.set(signal.id, now + 8000); // 8s cooldown per light
            }
          }
        }
      }
    }

    // 2. Sidewalk / Offroad Infraction Check
    if (isOffroad && carSpeedKmh > 10 && this.sidewalkViolationCooldown <= 0) {
      this.recordViolation({
        id: `off_${now}`,
        type: 'OFFROAD',
        message: 'Sidewalk Driving! -20 pts',
        pointsDelta: -20,
        coinsDelta: -10,
        timestamp: now,
      });
      this.sidewalkViolationCooldown = 3.5; // 3.5s cooldown
    }

    // 3. Excessive Speeding Check (> 95 km/h in city mission zones)
    if (carSpeedKmh > 100 && this.speedViolationCooldown <= 0) {
      this.recordViolation({
        id: `spd_${now}`,
        type: 'SPEEDING',
        message: 'Speed Limit Exceeded! -30 pts',
        pointsDelta: -30,
        coinsDelta: -15,
        timestamp: now,
      });
      this.speedViolationCooldown = 5.0; // 5s cooldown
    }

    // 4. Safe Clean Driving Streak Bonus (every 25s of zero infractions)
    if (this.cleanDrivingTimer >= 25 && carSpeedKmh > 20) {
      this.cleanDrivingTimer = 0;
      this.recordViolation({
        id: `clean_${now}`,
        type: 'CLEAN_STREAK',
        message: 'Clean Driving Bonus! +50 pts (+20 Coins)',
        pointsDelta: 50,
        coinsDelta: 20,
        timestamp: now,
        isBonus: true,
      });
    }
  }

  public recordCollision(type: 'VEHICLE' | 'OBSTACLE', impactSpeed: number) {
    const now = Date.now();
    if (now - this.lastViolationTime < 800) return; // debounce quick multi-contacts

    const pointsLost = Math.round(Math.min(100, Math.max(30, impactSpeed * 1.5)));
    const coinsLost = Math.round(pointsLost * 0.4);

    this.recordViolation({
      id: `col_${now}`,
      type: 'COLLISION',
      message: type === 'VEHICLE' ? `Traffic Collision! -${pointsLost} pts` : `Impact with Barrier! -${pointsLost} pts`,
      pointsDelta: -pointsLost,
      coinsDelta: -coinsLost,
      timestamp: now,
    });
  }

  private recordViolation(violation: TrafficViolation) {
    this.lastViolationTime = violation.timestamp;
    if (!violation.isBonus) {
      this.cleanDrivingTimer = 0; // reset streak on error
    }
    this.violationsLog.push(violation);
    if (this.onViolationCallback) {
      this.onViolationCallback(violation);
    }
  }

  public getViolationsCount(): number {
    return this.violationsLog.filter(v => !v.isBonus).length;
  }

  public getTotalPointsDelta(): number {
    return this.violationsLog.reduce((acc, v) => acc + v.pointsDelta, 0);
  }

  public getTotalCoinsDelta(): number {
    return this.violationsLog.reduce((acc, v) => acc + v.coinsDelta, 0);
  }

  public reset() {
    this.violationsLog = [];
    this.cleanDrivingTimer = 0;
    this.redLightViolationCooldown.clear();
  }
}
