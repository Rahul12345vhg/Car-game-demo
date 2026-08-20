import * as THREE from 'three';
import { CityWorld } from './CityWorld';

export interface AIVehicle {
  mesh: THREE.Group;
  collider: THREE.Box3;
  speed: number;
  targetSpeed: number;
  direction: THREE.Vector3;
  laneAxis: 'X' | 'Z';
  lanePosition: number; // constant coordinate on opposite axis
  stoppedForSignal: boolean;
  stoppedForObstacle: boolean;
  length: number;
  width: number;
  honkCooldown: number;
}

export class TrafficSystem {
  public scene: THREE.Scene;
  public world: CityWorld;
  public aiVehicles: AIVehicle[] = [];
  private carGeometries: THREE.BoxGeometry[] = [];
  private carMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, world: CityWorld, density: 'low' | 'medium' | 'high' = 'medium') {
    this.scene = scene;
    this.world = world;

    this.initSharedAssets();
    this.spawnTraffic(density);
  }

  private initSharedAssets() {
    this.carGeometries = [
      new THREE.BoxGeometry(1.8, 1.2, 3.8), // Sedan
      new THREE.BoxGeometry(1.9, 1.4, 4.2), // SUV
      new THREE.BoxGeometry(1.8, 1.1, 4.0), // Coupe
      new THREE.BoxGeometry(2.0, 1.8, 4.8), // Delivery Van
    ];

    const colors = [
      0x1677ff, // Electric Blue
      0xef4444, // Crimson Red
      0x22c55e, // Emerald Green
      0xffd43b, // Solar Yellow
      0x7c3aed, // Royal Purple
      0xff8a00, // Blaze Orange
      0xffffff, // Pure White
      0x00cfff, // Cyber Cyan
      0xec4899, // Hot Pink
      0x38bdf8, // Sky Blue
    ];

    this.carMaterials = colors.map(c => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.25,
      metalness: 0.65,
    }));
  }

  public spawnTraffic(density: 'low' | 'medium' | 'high') {
    // Clear existing
    this.aiVehicles.forEach(v => this.scene.remove(v.mesh));
    this.aiVehicles = [];

    const count = density === 'low' ? 10 : density === 'medium' ? 18 : 26;
    const halfGrid = Math.floor(this.world.cityGridSize / 2);
    const spacing = this.world.blockSize + this.world.roadWidth;

    const roadCoords: number[] = [];
    for (let i = -halfGrid; i <= halfGrid + 1; i++) {
      roadCoords.push(i * spacing - spacing / 2 + this.world.roadWidth / 2);
    }

    for (let i = 0; i < count; i++) {
      const isXAxis = Math.random() > 0.5;
      const roadCoord = roadCoords[Math.floor(Math.random() * roadCoords.length)];
      // Choose lane offset (-4.5 = negative dir, +4.5 = positive dir)
      const isPositiveDir = Math.random() > 0.5;
      const laneOffset = isPositiveDir ? 4.5 : -4.5;
      const laneCoord = roadCoord + laneOffset;

      const randomTravelPos = (Math.random() * 2 - 1) * (halfGrid * spacing);

      const typeIdx = Math.floor(Math.random() * this.carGeometries.length);
      const matIdx = Math.floor(Math.random() * this.carMaterials.length);

      const group = new THREE.Group();
      const body = new THREE.Mesh(this.carGeometries[typeIdx], this.carMaterials[matIdx]);
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);

      // Simple Glass Cab
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.8 });
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.8), glassMat);
      cab.position.set(0, 1.1, -0.2);
      group.add(cab);

      // Headlights & Taillights
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.05), hlMat);
      hlL.position.set(-0.6, 0.6, 1.9);
      group.add(hlL);

      const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.05), hlMat);
      hlR.position.set(0.6, 0.6, 1.9);
      group.add(hlR);

      const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.05), tlMat);
      tlL.position.set(-0.6, 0.6, -1.9);
      group.add(tlL);

      const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.05), tlMat);
      tlR.position.set(0.6, 0.6, -1.9);
      group.add(tlR);

      // Orientation & Position
      let dirVec: THREE.Vector3;
      if (isXAxis) {
        group.position.set(randomTravelPos, 0, laneCoord);
        if (isPositiveDir) {
          group.rotation.y = Math.PI / 2; // moving +X
          dirVec = new THREE.Vector3(1, 0, 0);
        } else {
          group.rotation.y = -Math.PI / 2; // moving -X
          dirVec = new THREE.Vector3(-1, 0, 0);
        }
      } else {
        group.position.set(laneCoord, 0, randomTravelPos);
        if (isPositiveDir) {
          group.rotation.y = 0; // moving +Z
          dirVec = new THREE.Vector3(0, 0, 1);
        } else {
          group.rotation.y = Math.PI; // moving -Z
          dirVec = new THREE.Vector3(0, 0, -1);
        }
      }

      this.scene.add(group);

      const collider = new THREE.Box3().setFromObject(group);

      this.aiVehicles.push({
        mesh: group,
        collider,
        speed: 12 + Math.random() * 8, // 12-20 m/s (~45-72 km/h)
        targetSpeed: 14 + Math.random() * 6,
        direction: dirVec,
        laneAxis: isXAxis ? 'X' : 'Z',
        lanePosition: laneCoord,
        stoppedForSignal: false,
        stoppedForObstacle: false,
        length: 4.2,
        width: 1.9,
        honkCooldown: 0,
      });
    }
  }

  /**
   * Updates all AI traffic physics, signal compliance, car-following, and collision boxes
   */
  public update(delta: number, playerCarPos: THREE.Vector3, onHonk?: () => void) {
    const worldLimit = (Math.floor(this.world.cityGridSize / 2) + 1) * (this.world.blockSize + this.world.roadWidth);

    this.aiVehicles.forEach((vehicle, vIdx) => {
      vehicle.honkCooldown = Math.max(0, vehicle.honkCooldown - delta);

      // 1. Check distance to next traffic signal
      let mustStop = false;
      const vPos = vehicle.mesh.position;

      for (const signal of this.world.trafficSignals) {
        if (signal.state === 'RED' || signal.state === 'YELLOW') {
          // Check if signal governs this vehicle's direction
          const isRelevant =
            (vehicle.laneAxis === 'Z' && signal.direction === 'north-south') ||
            (vehicle.laneAxis === 'X' && signal.direction === 'east-west');

          if (isRelevant) {
            const dist = vPos.distanceTo(signal.position);
            // Check if approaching stop line ahead (within 16m and moving towards it)
            if (dist < 18 && dist > 2) {
              const toSignal = new THREE.Vector3().subVectors(signal.position, vPos);
              if (toSignal.dot(vehicle.direction) > 0) {
                mustStop = true;
                break;
              }
            }
          }
        }
      }

      // 2. Check distance to other AI cars in same lane ahead
      for (let j = 0; j < this.aiVehicles.length; j++) {
        if (vIdx === j) continue;
        const other = this.aiVehicles[j];
        if (other.laneAxis === vehicle.laneAxis && Math.abs(other.lanePosition - vehicle.lanePosition) < 2) {
          const toOther = new THREE.Vector3().subVectors(other.mesh.position, vPos);
          const forwardDist = toOther.dot(vehicle.direction);
          if (forwardDist > 0 && forwardDist < 12) {
            mustStop = true;
            break;
          }
        }
      }

      // 3. Check distance to Player car
      const toPlayer = new THREE.Vector3().subVectors(playerCarPos, vPos);
      const playerDist = toPlayer.length();
      if (playerDist < 11) {
        const forwardPlayerDist = toPlayer.dot(vehicle.direction);
        if (forwardPlayerDist > 0 && forwardPlayerDist < 10) {
          mustStop = true;
          if (vehicle.honkCooldown <= 0 && onHonk && playerDist < 6) {
            onHonk();
            vehicle.honkCooldown = 5.0; // 5s cooldown
          }
        }
      }

      // 4. Smooth Acceleration / Braking
      if (mustStop) {
        vehicle.speed = Math.max(0, vehicle.speed - delta * 24); // brake
      } else {
        vehicle.speed = Math.min(vehicle.targetSpeed, vehicle.speed + delta * 8); // accelerate
      }

      // 5. Move along direction
      vehicle.mesh.position.addScaledVector(vehicle.direction, vehicle.speed * delta);

      // 6. Wrap around city boundary to keep traffic continuous
      if (vehicle.laneAxis === 'X') {
        if (vehicle.mesh.position.x > worldLimit) vehicle.mesh.position.x = -worldLimit;
        if (vehicle.mesh.position.x < -worldLimit) vehicle.mesh.position.x = worldLimit;
      } else {
        if (vehicle.mesh.position.z > worldLimit) vehicle.mesh.position.z = -worldLimit;
        if (vehicle.mesh.position.z < -worldLimit) vehicle.mesh.position.z = worldLimit;
      }

      // 7. Update Bounding Box for player collision
      vehicle.collider.setFromObject(vehicle.mesh);
    });
  }
}
