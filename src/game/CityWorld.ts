import * as THREE from 'three';
import { TimeOfDay, GraphicsQuality } from '../types/game';

export interface TrafficSignal {
  id: string;
  position: THREE.Vector3;
  direction: 'north-south' | 'east-west';
  state: 'RED' | 'YELLOW' | 'GREEN';
  redMesh: THREE.Mesh;
  yellowMesh: THREE.Mesh;
  greenMesh: THREE.Mesh;
  stopLineZ?: number;
  stopLineX?: number;
}

export interface ParkingSlot {
  id: string;
  position: THREE.Vector3;
  rotation: number; // yaw angle in radians
  width: number;
  length: number;
  mesh: THREE.Group;
  guideMesh?: THREE.Mesh;
}

export interface ObstacleCollider {
  box: THREE.Box3;
  type: 'BUILDING' | 'BARRIER' | 'POLE' | 'TREE' | 'CURB';
}

export class CityWorld {
  public scene: THREE.Scene;
  public colliders: ObstacleCollider[] = [];
  public trafficSignals: TrafficSignal[] = [];
  public parkingSlots: ParkingSlot[] = [];
  public waypointMesh: THREE.Group | null = null;
  public coinPickups: { mesh: THREE.Mesh; id: string; collected: boolean }[] = [];

  // Lighting references
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private streetLights: THREE.PointLight[] = [];
  private trafficSignalTimer: number = 0;

  // Constants
  public readonly blockSize = 90; // size of city block
  public readonly roadWidth = 18; // 4-lane avenue width
  public readonly cityGridSize = 5; // 5x5 blocks = ~540x540m city

  constructor(scene: THREE.Scene, quality: GraphicsQuality = 'HIGH', timeOfDay: TimeOfDay = 'DAY') {
    this.scene = scene;

    // Base Atmospheric & Ambient Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    this.sunLight.position.set(120, 180, 100);
    this.sunLight.castShadow = quality !== 'LOW';
    if (this.sunLight.castShadow) {
      this.sunLight.shadow.mapSize.width = quality === 'HIGH' ? 2048 : 1024;
      this.sunLight.shadow.mapSize.height = quality === 'HIGH' ? 2048 : 1024;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 400;
      const d = 160;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.sunLight);

    this.buildCity(quality);
    this.setTimeOfDay(timeOfDay);
  }

  public setTimeOfDay(time: TimeOfDay) {
    if (time === 'DAY') {
      this.scene.background = new THREE.Color(0x38bdf8);
      this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.0018);
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.6;
      this.sunLight.position.set(120, 180, 100);
      this.ambientLight.color.setHex(0xf8fafc);
      this.ambientLight.intensity = 0.9;
      this.streetLights.forEach(l => (l.visible = false));
    } else if (time === 'DUSK') {
      this.scene.background = new THREE.Color(0xc2410c);
      this.scene.fog = new THREE.FogExp2(0x7c2d12, 0.0022);
      this.sunLight.color.setHex(0xfb923c);
      this.sunLight.intensity = 1.2;
      this.sunLight.position.set(180, 45, 60);
      this.ambientLight.color.setHex(0xfbcfe8);
      this.ambientLight.intensity = 0.75;
      this.streetLights.forEach(l => (l.visible = true));
    } else {
      // NIGHT - rich illuminated sapphire city night with bright street lamps and bounce
      this.scene.background = new THREE.Color(0x0a1122);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.0024);
      this.sunLight.color.setHex(0x93c5fd);
      this.sunLight.intensity = 0.75;
      this.sunLight.position.set(80, 140, -50);
      this.ambientLight.color.setHex(0x38bdf8);
      this.ambientLight.intensity = 0.65;
      this.streetLights.forEach(l => (l.visible = true));
    }
  }

  private buildCity(quality: GraphicsQuality) {
    const halfGrid = Math.floor(this.cityGridSize / 2);
    const spacing = this.blockSize + this.roadWidth;

    // Ground Base
    const groundGeo = new THREE.PlaneGeometry(900, 900);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x18202c,
      roughness: 0.9,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Build Blocks and Roads
    for (let gx = -halfGrid; gx <= halfGrid; gx++) {
      for (let gz = -halfGrid; gz <= halfGrid; gz++) {
        const blockCenterX = gx * spacing;
        const blockCenterZ = gz * spacing;

        // Build City Block (Sidewalk, Buildings, Trees, Props)
        this.buildCityBlock(blockCenterX, blockCenterZ, gx, gz, quality);

        // Build Intersection Traffic Signal at corners
        const interX = blockCenterX + (this.blockSize / 2 + this.roadWidth / 2);
        const interZ = blockCenterZ + (this.blockSize / 2 + this.roadWidth / 2);
        if (gx < halfGrid && gz < halfGrid) {
          this.buildIntersection(interX, interZ, quality);
        }
      }
    }

    // Build Roads & Markings across entire grid
    this.buildRoadNetwork(halfGrid, spacing);

    // Build Dedicated Parking Bays
    this.buildParkingBays();

    // Scatter Collectible Bonus Coins
    this.spawnCollectibleCoins();
  }

  private buildCityBlock(cx: number, cz: number, gx: number, gz: number, quality: GraphicsQuality) {
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.85,
      metalness: 0.1,
    });

    // Sidewalk base
    const sidewalkGeo = new THREE.BoxGeometry(this.blockSize, 0.25, this.blockSize);
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(cx, 0.125, cz);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    // Sidewalk edge collider for off-road detection
    const sidewalkBox = new THREE.Box3().setFromObject(sidewalk);
    this.colliders.push({ box: sidewalkBox, type: 'CURB' });

    // Procedural Buildings per block (4 buildings per block)
    const buildingColors = [
      0x334155, 0x1e293b, 0x0f172a, 0x27272a, 0x3f3f46, 0x18181b, 0x292524, 0x374151
    ];
    const windowColors = [0xfef08a, 0x93c5fd, 0xa7f3d0, 0xfde047];

    const subSize = (this.blockSize - 8) / 2;
    const offsets = [
      { x: -subSize / 2 - 1, z: -subSize / 2 - 1 },
      { x: subSize / 2 + 1, z: -subSize / 2 - 1 },
      { x: -subSize / 2 - 1, z: subSize / 2 + 1 },
      { x: subSize / 2 + 1, z: subSize / 2 + 1 },
    ];

    offsets.forEach((offset, idx) => {
      // Deterministic heights based on coordinates
      const seed = Math.abs(Math.sin(gx * 12.9898 + gz * 78.233 + idx * 43.123));
      const height = 18 + Math.floor(seed * 65); // 18m to 83m skyscraper
      const bColor = buildingColors[(gx + gz + idx + 100) % buildingColors.length];

      const bMat = new THREE.MeshStandardMaterial({
        color: bColor,
        roughness: 0.4,
        metalness: 0.6,
      });

      const bGeo = new THREE.BoxGeometry(subSize - 2, height, subSize - 2);
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(cx + offset.x, height / 2 + 0.25, cz + offset.z);
      bMesh.castShadow = quality !== 'LOW';
      bMesh.receiveShadow = true;
      this.scene.add(bMesh);

      // Register collision box for building
      const bBox = new THREE.Box3().setFromObject(bMesh);
      // expand slightly for solid collision buffer
      this.colliders.push({ box: bBox, type: 'BUILDING' });

      // Window accents for night glow
      if (quality !== 'LOW') {
        const winGeo = new THREE.PlaneGeometry(subSize - 4, height * 0.7);
        const winColor = windowColors[idx % windowColors.length];
        const winMat = new THREE.MeshBasicMaterial({
          color: winColor,
          transparent: true,
          opacity: 0.28,
        });

        // 4 window facade planes
        const wFront = new THREE.Mesh(winGeo, winMat);
        wFront.position.set(cx + offset.x, height * 0.5 + 0.25, cz + offset.z + (subSize - 2) / 2 + 0.05);
        this.scene.add(wFront);

        const wBack = new THREE.Mesh(winGeo, winMat);
        wBack.position.set(cx + offset.x, height * 0.5 + 0.25, cz + offset.z - (subSize - 2) / 2 - 0.05);
        wBack.rotation.y = Math.PI;
        this.scene.add(wBack);
      }
    });

    // Street light on block perimeter
    this.addStreetLight(cx - this.blockSize / 2 + 3, cz, quality);
    this.addStreetLight(cx + this.blockSize / 2 - 3, cz, quality);
    this.addStreetLight(cx, cz - this.blockSize / 2 + 3, quality);
    this.addStreetLight(cx, cz + this.blockSize / 2 - 3, quality);

    // Decorative Trees along sidewalks
    if (quality !== 'LOW') {
      this.addTree(cx - this.blockSize / 2 + 2, cz - 15);
      this.addTree(cx - this.blockSize / 2 + 2, cz + 15);
      this.addTree(cx + this.blockSize / 2 - 2, cz - 15);
      this.addTree(cx + this.blockSize / 2 - 2, cz + 15);
    }
  }

  private addStreetLight(x: number, z: number, quality: GraphicsQuality) {
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3.5, z);
    this.scene.add(pole);

    const armGeo = new THREE.BoxGeometry(1.6, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(x, 7, z);
    this.scene.add(arm);

    const lampGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff7ed });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(x, 6.8, z);
    this.scene.add(lamp);

    if (quality === 'HIGH') {
      const pLight = new THREE.PointLight(0xffedd5, 1.8, 22, 1.5);
      pLight.position.set(x, 6.5, z);
      this.scene.add(pLight);
      this.streetLights.push(pLight);
    }

    const poleBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 3.5, z), new THREE.Vector3(0.5, 7, 0.5));
    this.colliders.push({ box: poleBox, type: 'POLE' });
  }

  private addTree(x: number, z: number) {
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 1.25, z);
    this.scene.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(1.5, 3.5, 7);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 3.8, z);
    this.scene.add(leaves);

    const treeBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 2, z), new THREE.Vector3(1.2, 4, 1.2));
    this.colliders.push({ box: treeBox, type: 'TREE' });
  }

  private buildRoadNetwork(halfGrid: number, spacing: number) {
    const totalSpan = (halfGrid * 2 + 1) * spacing + 60;
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x222a38, // Clean dark blue-gray asphalt
      roughness: 0.85,
      metalness: 0.15,
    });

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    // Road asphalt planes
    for (let i = -halfGrid; i <= halfGrid + 1; i++) {
      const roadCoord = i * spacing - spacing / 2 + this.roadWidth / 2;

      // X-axis Roads
      const roadXGeo = new THREE.PlaneGeometry(totalSpan, this.roadWidth);
      const roadX = new THREE.Mesh(roadXGeo, roadMat);
      roadX.rotation.x = -Math.PI / 2;
      roadX.position.set(0, 0.02, roadCoord);
      roadX.receiveShadow = true;
      this.scene.add(roadX);

      // Z-axis Roads
      const roadZGeo = new THREE.PlaneGeometry(this.roadWidth, totalSpan);
      const roadZ = new THREE.Mesh(roadZGeo, roadMat);
      roadZ.rotation.x = -Math.PI / 2;
      roadZ.position.set(roadCoord, 0.02, 0);
      roadZ.receiveShadow = true;
      this.scene.add(roadZ);

      // Center yellow dividing lines
      const yellowLineXGeo = new THREE.PlaneGeometry(totalSpan, 0.22);
      const yLineX = new THREE.Mesh(yellowLineXGeo, lineMat);
      yLineX.rotation.x = -Math.PI / 2;
      yLineX.position.set(0, 0.04, roadCoord);
      this.scene.add(yLineX);

      const yellowLineZGeo = new THREE.PlaneGeometry(0.22, totalSpan);
      const yLineZ = new THREE.Mesh(yellowLineZGeo, lineMat);
      yLineZ.rotation.x = -Math.PI / 2;
      yLineZ.position.set(roadCoord, 0.04, 0);
      this.scene.add(yLineZ);

      // White lane dividers
      const whiteLaneOffsets = [-4.5, 4.5];
      whiteLaneOffsets.forEach(off => {
        const wLineXGeo = new THREE.PlaneGeometry(totalSpan, 0.15);
        const wLineX = new THREE.Mesh(wLineXGeo, whiteLineMat);
        wLineX.rotation.x = -Math.PI / 2;
        wLineX.position.set(0, 0.035, roadCoord + off);
        this.scene.add(wLineX);

        const wLineZGeo = new THREE.PlaneGeometry(0.15, totalSpan);
        const wLineZ = new THREE.Mesh(wLineZGeo, whiteLineMat);
        wLineZ.rotation.x = -Math.PI / 2;
        wLineZ.position.set(roadCoord + off, 0.035, 0);
        this.scene.add(wLineZ);
      });
    }
  }

  private buildIntersection(x: number, z: number, _quality: GraphicsQuality) {
    const postGeo = new THREE.CylinderGeometry(0.15, 0.18, 5.5, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });

    // 4 Traffic Signal Posts at intersection corners
    const postOffsets = [
      { x: -this.roadWidth / 2 - 1, z: -this.roadWidth / 2 - 1, dir: 'north-south' as const },
      { x: this.roadWidth / 2 + 1, z: this.roadWidth / 2 + 1, dir: 'north-south' as const },
      { x: -this.roadWidth / 2 - 1, z: this.roadWidth / 2 + 1, dir: 'east-west' as const },
      { x: this.roadWidth / 2 + 1, z: -this.roadWidth / 2 - 1, dir: 'east-west' as const },
    ];

    postOffsets.forEach((po, pIdx) => {
      const px = x + po.x;
      const pz = z + po.z;

      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 2.75, pz);
      this.scene.add(post);

      // Light Box Housing
      const boxGeo = new THREE.BoxGeometry(0.55, 1.4, 0.4);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(px, 5.2, pz);
      if (po.dir === 'east-west') {
        box.rotation.y = Math.PI / 2;
      }
      this.scene.add(box);

      // Red, Yellow, Green bulbs
      const lightGeo = new THREE.SphereGeometry(0.12, 10, 10);
      const redMat = new THREE.MeshBasicMaterial({ color: 0x220000 });
      const yellowMat = new THREE.MeshBasicMaterial({ color: 0x222200 });
      const greenMat = new THREE.MeshBasicMaterial({ color: 0x002200 });

      const redMesh = new THREE.Mesh(lightGeo, redMat);
      redMesh.position.set(0, 0.42, 0.21);
      box.add(redMesh);

      const yellowMesh = new THREE.Mesh(lightGeo, yellowMat);
      yellowMesh.position.set(0, 0, 0.21);
      box.add(yellowMesh);

      const greenMesh = new THREE.Mesh(lightGeo, greenMat);
      greenMesh.position.set(0, -0.42, 0.21);
      box.add(greenMesh);

      this.trafficSignals.push({
        id: `signal_${x}_${z}_${pIdx}`,
        position: new THREE.Vector3(px, 0, pz),
        direction: po.dir,
        state: po.dir === 'north-south' ? 'GREEN' : 'RED',
        redMesh,
        yellowMesh,
        greenMesh,
        stopLineX: px,
        stopLineZ: pz,
      });

      const colBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(px, 2.5, pz), new THREE.Vector3(0.5, 5, 0.5));
      this.colliders.push({ box: colBox, type: 'POLE' });
    });
  }

  private buildParkingBays() {
    // Standard parking bay for Mission 2
    this.createParkingSlot('slot_1', new THREE.Vector3(25, 0.05, 54), 0, 3.2, 6.0);

    // Advanced reverse parking bay for Mission 10
    this.createParkingSlot('slot_reverse_pro', new THREE.Vector3(-83, 0.05, -54), Math.PI / 2, 3.0, 5.8);

    // Secondary practice slots
    this.createParkingSlot('slot_practice_1', new THREE.Vector3(-25, 0.05, 54), 0, 3.2, 6.0);
    this.createParkingSlot('slot_practice_2', new THREE.Vector3(133, 0.05, -54), Math.PI / 2, 3.2, 6.0);
  }

  private createParkingSlot(id: string, pos: THREE.Vector3, rot: number, width: number, length: number) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rot;

    // Painted boundary lines (White / Yellow)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const leftLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, length), lineMat);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.position.set(-width / 2, 0.03, 0);
    group.add(leftLine);

    const rightLine = new THREE.Mesh(new THREE.PlaneGeometry(0.18, length), lineMat);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.position.set(width / 2, 0.03, 0);
    group.add(rightLine);

    const backLine = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.18), lineMat);
    backLine.rotation.x = -Math.PI / 2;
    backLine.position.set(0, 0.03, -length / 2);
    group.add(backLine);

    // Glowing Animated Guide Pad
    const guideGeo = new THREE.PlaneGeometry(width - 0.2, length - 0.2);
    const guideMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const guideMesh = new THREE.Mesh(guideGeo, guideMat);
    guideMesh.rotation.x = -Math.PI / 2;
    guideMesh.position.set(0, 0.025, 0);
    group.add(guideMesh);

    // Front parking "P" icon / entrance indicator
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrowMesh = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 3), arrowMat);
    arrowMesh.rotation.x = Math.PI / 2;
    arrowMesh.position.set(0, 0.04, length / 2 - 0.8);
    group.add(arrowMesh);

    this.scene.add(group);

    this.parkingSlots.push({
      id,
      position: pos,
      rotation: rot,
      width,
      length,
      mesh: group,
      guideMesh,
    });
  }

  private spawnCollectibleCoins() {
    const coinPositions = [
      new THREE.Vector3(0, 1.0, 30),
      new THREE.Vector3(54, 1.0, 0),
      new THREE.Vector3(-54, 1.0, -54),
      new THREE.Vector3(108, 1.0, 80),
      new THREE.Vector3(-108, 1.0, 40),
      new THREE.Vector3(0, 1.0, -108),
      new THREE.Vector3(60, 1.0, -120),
      new THREE.Vector3(-80, 1.0, 100),
    ];

    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x78350f,
    });

    coinPositions.forEach((pos, idx) => {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.copy(pos);
      coin.rotation.x = Math.PI / 2;
      this.scene.add(coin);

      this.coinPickups.push({
        id: `coin_${idx}`,
        mesh: coin,
        collected: false,
      });
    });
  }

  public createWaypointBeacon(position: THREE.Vector3): THREE.Group {
    if (this.waypointMesh) {
      this.scene.remove(this.waypointMesh);
    }

    const group = new THREE.Group();
    group.position.copy(position);

    // Glowing Light Cylinder
    const cylGeo = new THREE.CylinderGeometry(2.5, 2.5, 14, 16, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const cylinder = new THREE.Mesh(cylGeo, cylMat);
    cylinder.position.y = 7;
    group.add(cylinder);

    // Ground Target Ring
    const ringGeo = new THREE.RingGeometry(1.5, 3.0, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    // Floating Downward Arrow
    const arrowGeo = new THREE.ConeGeometry(1.2, 2.5, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI; // point down
    arrow.position.y = 9.5;
    group.add(arrow);

    this.scene.add(group);
    this.waypointMesh = group;
    return group;
  }

  public removeWaypointBeacon() {
    if (this.waypointMesh) {
      this.scene.remove(this.waypointMesh);
      this.waypointMesh = null;
    }
  }

  /**
   * Periodic update loop for animated world elements (traffic lights, rotating waypoint, coins)
   */
  public update(delta: number) {
    // 1. Traffic Signals State Machine (Green 8s -> Yellow 2.5s -> Red 8s)
    this.trafficSignalTimer += delta;
    const cycleTime = 20; // 20s total cycle
    const currentPhase = this.trafficSignalTimer % cycleTime;

    this.trafficSignals.forEach(signal => {
      const isNorthSouth = signal.direction === 'north-south';
      let state: 'RED' | 'YELLOW' | 'GREEN';

      if (isNorthSouth) {
        if (currentPhase < 8) state = 'GREEN';
        else if (currentPhase < 10) state = 'YELLOW';
        else state = 'RED';
      } else {
        if (currentPhase < 10) state = 'RED';
        else if (currentPhase < 18) state = 'GREEN';
        else state = 'YELLOW';
      }

      signal.state = state;

      // Update bulb colors
      (signal.redMesh.material as THREE.MeshBasicMaterial).color.setHex(state === 'RED' ? 0xef4444 : 0x220000);
      (signal.yellowMesh.material as THREE.MeshBasicMaterial).color.setHex(state === 'YELLOW' ? 0xf59e0b : 0x222200);
      (signal.greenMesh.material as THREE.MeshBasicMaterial).color.setHex(state === 'GREEN' ? 0x22c55e : 0x002200);
    });

    // 2. Animate Waypoint Marker
    if (this.waypointMesh) {
      this.waypointMesh.rotation.y += delta * 1.5;
      const arrow = this.waypointMesh.children[2];
      if (arrow) {
        arrow.position.y = 9.5 + Math.sin(Date.now() * 0.005) * 0.6;
      }
    }

    // 3. Animate Rotating Collectible Coins
    this.coinPickups.forEach(coin => {
      if (!coin.collected) {
        coin.mesh.rotation.z += delta * 2.5;
        coin.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.004 + coin.mesh.position.x) * 0.2;
      }
    });

    // 4. Pulse Parking Guides
    this.parkingSlots.forEach(slot => {
      if (slot.guideMesh) {
        const mat = slot.guideMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 + Math.sin(Date.now() * 0.004) * 0.15;
      }
    });
  }
}
