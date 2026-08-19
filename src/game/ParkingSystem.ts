import * as THREE from 'three';
import { ParkingState } from '../types/game';
import { CityWorld, ParkingSlot } from './CityWorld';

export class ParkingSystem {
  private world: CityWorld;
  public targetSlotId: string | null = null;
  public parkingState: ParkingState = {
    isActive: false,
    slotId: '',
    slotPosition: [0, 0, 0],
    slotRotation: 0,
    distance: 999,
    angleDiff: 180,
    isWithinBounds: false,
    holdTime: 0,
    accuracy: 0,
    completed: false,
  };

  private readonly REQUIRED_HOLD_TIME = 1.5; // 1.5 seconds stationary inside bay

  constructor(world: CityWorld) {
    this.world = world;
  }

  public setTargetSlot(slotId: string | null) {
    this.targetSlotId = slotId;
    this.reset();
  }

  public reset() {
    this.parkingState = {
      isActive: !!this.targetSlotId,
      slotId: this.targetSlotId || '',
      slotPosition: [0, 0, 0],
      slotRotation: 0,
      distance: 999,
      angleDiff: 180,
      isWithinBounds: false,
      holdTime: 0,
      accuracy: 0,
      completed: false,
    };
  }

  public update(delta: number, carPos: THREE.Vector3, carYaw: number, carSpeedKmh: number): ParkingState {
    let activeSlot: ParkingSlot | undefined;

    if (this.targetSlotId) {
      activeSlot = this.world.parkingSlots.find(s => s.id === this.targetSlotId);
    } else {
      // Find nearest parking slot within 30m
      let minDist = 30;
      for (const slot of this.world.parkingSlots) {
        const d = carPos.distanceTo(slot.position);
        if (d < minDist) {
          minDist = d;
          activeSlot = slot;
        }
      }
    }

    if (!activeSlot) {
      this.parkingState.isActive = false;
      return this.parkingState;
    }

    this.parkingState.isActive = true;
    this.parkingState.slotId = activeSlot.id;
    this.parkingState.slotPosition = [activeSlot.position.x, activeSlot.position.y, activeSlot.position.z];
    this.parkingState.slotRotation = activeSlot.rotation;

    // 1. Calculate distance from car to slot center
    const dist = carPos.distanceTo(activeSlot.position);
    this.parkingState.distance = dist;

    // 2. Calculate local relative coordinates inside parking rectangle
    const relX = carPos.x - activeSlot.position.x;
    const relZ = carPos.z - activeSlot.position.z;
    const cosR = Math.cos(-activeSlot.rotation);
    const sinR = Math.sin(-activeSlot.rotation);
    const localX = relX * cosR - relZ * sinR;
    const localZ = relX * sinR + relZ * cosR;

    const halfW = activeSlot.width / 2;
    const halfL = activeSlot.length / 2;

    const isInside = Math.abs(localX) <= halfW && Math.abs(localZ) <= halfL;
    this.parkingState.isWithinBounds = isInside;

    // 3. Calculate Angular alignment (0 or 180 deg both valid forward/reverse)
    let rawAngleDiff = Math.abs(carYaw - activeSlot.rotation) % Math.PI;
    if (rawAngleDiff > Math.PI / 2) {
      rawAngleDiff = Math.PI - rawAngleDiff;
    }
    const angleDiffDeg = (rawAngleDiff * 180) / Math.PI;
    this.parkingState.angleDiff = angleDiffDeg;

    // 4. Calculate Precision Accuracy (0 - 100%)
    const distPenalty = Math.min(60, (dist / (halfL + halfW)) * 60);
    const anglePenalty = Math.min(40, (angleDiffDeg / 45) * 40);
    const accuracy = Math.max(0, Math.round(100 - distPenalty - anglePenalty));
    this.parkingState.accuracy = accuracy;

    // 5. Stationary Hold Verification
    const isStationary = Math.abs(carSpeedKmh) < 1.8;
    if (isInside && isStationary && accuracy >= 65) {
      this.parkingState.holdTime += delta;
      if (this.parkingState.holdTime >= this.REQUIRED_HOLD_TIME && !this.parkingState.completed) {
        this.parkingState.completed = true;
      }
    } else {
      this.parkingState.holdTime = Math.max(0, this.parkingState.holdTime - delta * 2.5);
    }

    return this.parkingState;
  }
}
