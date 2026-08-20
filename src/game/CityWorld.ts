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
  public navPathGroup: THREE.Group = new THREE.Group();
  public destinationBeacon: THREE.Group | null = null;
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
    this.scene.add(this.navPathGroup);

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
      this.sunLight.shadow.camera.far = 450;
      const d = 180;
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
      this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.0012);
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.8;
      this.sunLight.position.set(120, 180, 100);
      this.ambientLight.color.setHex(0xf0fdf4);
      this.ambientLight.intensity = 1.0;
      this.streetLights.forEach(l => (l.visible = false));
    } else if (time === 'DUSK') {
      // SUNSET: Orange, Pink, Purple sky with warm sunlight
      this.scene.background = new THREE.Color(0xff8a00);
      this.scene.fog = new THREE.FogExp2(0x7c3aed, 0.0016);
      this.sunLight.color.setHex(0xff8a00);
      this.sunLight.intensity = 1.5;
      this.sunLight.position.set(180, 45, 60);
      this.ambientLight.color.setHex(0xfce7f3);
      this.ambientLight.intensity = 0.85;
      this.streetLights.forEach(l => (l.visible = true));
    } else {
      // NIGHT: Deep sapphire blue, purple and bright cyan city streetlights
      this.scene.background = new THREE.Color(0x172554);
      this.scene.fog = new THREE.FogExp2(0x1e1b4b, 0.0018);
      this.sunLight.color.setHex(0x93c5fd);
      this.sunLight.intensity = 0.85;
      this.sunLight.position.set(80, 140, -50);
      this.ambientLight.color.setHex(0x38bdf8);
      this.ambientLight.intensity = 0.75;
      this.streetLights.forEach(l => (l.visible = true));
    }
  }

  private buildCity(quality: GraphicsQuality) {
    const halfGrid = Math.floor(this.cityGridSize / 2);
    const spacing = this.blockSize + this.roadWidth;

    // Ground Base - Lush Greenery under city
    const groundGeo = new THREE.PlaneGeometry(900, 900);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.85,
      metalness: 0.05,
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

        // Specialized Landmarks vs Standard Urban Blocks
        if (gx === 0 && gz === 0) {
          // Central Tower & Plaza
          this.buildCentralTowerBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === -1 && gz === 0) {
          // Grand Park
          this.buildGrandParkBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === 1 && gz === 0) {
          // City Drive Mall
          this.buildMallBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === 0 && gz === 1) {
          // Metro Gas & Fuel Station
          this.buildGasStationBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === -1 && gz === -1) {
          // Metropolis General Hospital
          this.buildHospitalBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === 0 && gz === -1) {
          // Metro Police Precinct
          this.buildPoliceBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === 1 && gz === -1) {
          // Tuning Garage & Dealership
          this.buildGarageBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === -2 && gz === -2) {
          // Metropolis International Airport Terminal
          this.buildAirportBlock(blockCenterX, blockCenterZ, quality);
        } else if (gx === 1 && gz === -1) {
          // Riverside Waterfront
          this.buildWaterfrontBlock(blockCenterX, blockCenterZ, quality);
        } else {
          // Procedural Urban Block (High-rises, offices, residential)
          this.buildCityBlock(blockCenterX, blockCenterZ, gx, gz, quality);
        }

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

  // 1. Central Tower (Metropolis Pinnacle)
  private buildCentralTowerBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    // Plaza ground
    const plazaGeo = new THREE.BoxGeometry(this.blockSize - 4, 0.4, this.blockSize - 4);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(cx, 0.2, cz);
    this.scene.add(plaza);

    // Central Megatower (Stepped design, 95m tall)
    const baseHeight = 35;
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(38, baseHeight, 38), baseMat);
    baseMesh.position.set(cx, baseHeight / 2 + 0.3, cz);
    this.scene.add(baseMesh);

    const midHeight = 35;
    const midMesh = new THREE.Mesh(new THREE.BoxGeometry(26, midHeight, 26), baseMat);
    midMesh.position.set(cx, baseHeight + midHeight / 2 + 0.3, cz);
    this.scene.add(midMesh);

    const topHeight = 25;
    const topMesh = new THREE.Mesh(new THREE.BoxGeometry(16, topHeight, 16), baseMat);
    topMesh.position.set(cx, baseHeight + midHeight + topHeight / 2 + 0.3, cz);
    this.scene.add(topMesh);

    // Spire & glowing red/cyan aircraft warning beacon
    const spireGeo = new THREE.CylinderGeometry(0.3, 1.2, 22, 8);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.set(cx, baseHeight + midHeight + topHeight + 11 + 0.3, cz);
    this.scene.add(spire);

    const beaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(cx, baseHeight + midHeight + topHeight + 22 + 0.3, cz);
    this.scene.add(beacon);

    // Colliders
    this.colliders.push({ box: new THREE.Box3().setFromObject(baseMesh), type: 'BUILDING' });

    // Plaza Water Fountain
    const fountainMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1 });
    const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 1.2, 16), fountainMat);
    fountain.position.set(cx, 0.8, cz + 28);
    this.scene.add(fountain);
    this.colliders.push({ box: new THREE.Box3().setFromObject(fountain), type: 'BARRIER' });

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 2. Grand Park Block
  private buildGrandParkBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    // Grass Field
    const grassGeo = new THREE.BoxGeometry(this.blockSize - 2, 0.35, this.blockSize - 2);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.set(cx, 0.18, cz);
    this.scene.add(grass);

    // Central Obelisk Monument
    const obeliskGeo = new THREE.CylinderGeometry(0.8, 2.4, 18, 4);
    const obeliskMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const obelisk = new THREE.Mesh(obeliskGeo, obeliskMat);
    obelisk.position.set(cx, 9.2, cz);
    obelisk.rotation.y = Math.PI / 4;
    this.scene.add(obelisk);
    this.colliders.push({ box: new THREE.Box3().setFromObject(obelisk), type: 'POLE' });

    // Trees throughout park
    const treePositions = [
      [-25, -25], [25, -25], [-25, 25], [25, 25],
      [-32, 0], [32, 0], [0, -32], [0, 32],
      [-14, -14], [14, 14], [-14, 14], [14, -14]
    ];
    treePositions.forEach(([tx, tz]) => {
      this.addTree(cx + tx, cz + tz);
    });

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 3. City Drive Mall Block
  private buildMallBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    const mallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 });

    // Main Shopping Complex (L-Shape)
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(60, 22, 35), mallMat);
    b1.position.set(cx - 8, 11 + 0.25, cz - 15);
    this.scene.add(b1);
    this.colliders.push({ box: new THREE.Box3().setFromObject(b1), type: 'BUILDING' });

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(32, 18, 40), mallMat);
    b2.position.set(cx + 20, 9 + 0.25, cz + 15);
    this.scene.add(b2);
    this.colliders.push({ box: new THREE.Box3().setFromObject(b2), type: 'BUILDING' });

    // Glass Atrium
    const atrium = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 16, 16), glassMat);
    atrium.position.set(cx - 10, 8 + 0.25, cz + 15);
    this.scene.add(atrium);
    this.colliders.push({ box: new THREE.Box3().setFromObject(atrium), type: 'BUILDING' });

    // Glowing Mall Sign
    const signMat = new THREE.MeshBasicMaterial({ color: 0x00b8ff });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(22, 3, 0.5), signMat);
    sign.position.set(cx - 8, 20, cz + 3);
    this.scene.add(sign);

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 4. Metro Gas & Service Station
  private buildGasStationBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    // Fuel Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(45, 1.2, 28), canopyMat);
    canopy.position.set(cx, 7.5, cz);
    this.scene.add(canopy);

    // 4 Support Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const pCoords = [[-15, -9], [15, -9], [-15, 9], [15, 9]];
    pCoords.forEach(([px, pz]) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7.5, 1.2), pillarMat);
      p.position.set(cx + px, 3.75, cz + pz);
      this.scene.add(p);
      this.colliders.push({ box: new THREE.Box3().setFromObject(p), type: 'POLE' });
    });

    // Fuel Pumps (4 islands)
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    [-8, 8].forEach(px => {
      [-5, 5].forEach(pz => {
        const pump = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 2.8), pumpMat);
        pump.position.set(cx + px, 1.1, cz + pz);
        this.scene.add(pump);
        this.colliders.push({ box: new THREE.Box3().setFromObject(pump), type: 'BARRIER' });
      });
    });

    // Convenience Store Building in back
    const shopMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const shop = new THREE.Mesh(new THREE.BoxGeometry(55, 9, 20), shopMat);
    shop.position.set(cx, 4.5, cz - 26);
    this.scene.add(shop);
    this.colliders.push({ box: new THREE.Box3().setFromObject(shop), type: 'BUILDING' });

    // Gas Price Totem Sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 12, 1.5), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    sign.position.set(cx + 28, 6, cz + 20);
    this.scene.add(sign);
    this.colliders.push({ box: new THREE.Box3().setFromObject(sign), type: 'POLE' });

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 5. Hospital Block
  private buildHospitalBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    const hospMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Hospital Main Ward
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(50, 26, 45), hospMat);
    h1.position.set(cx, 13 + 0.25, cz);
    this.scene.add(h1);
    this.colliders.push({ box: new THREE.Box3().setFromObject(h1), type: 'BUILDING' });

    // Red Cross Emblem on facade
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(7, 2, 0.4), crossMat);
    crossH.position.set(cx, 20, cz + 22.7);
    this.scene.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 0.4), crossMat);
    crossV.position.set(cx, 20, cz + 22.7);
    this.scene.add(crossV);

    // Rooftop Helipad
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.3, 16), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    pad.position.set(cx, 26.4, cz);
    this.scene.add(pad);

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 6. Police Precinct Block
  private buildPoliceBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    const policeMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4, metalness: 0.3 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(55, 20, 50), policeMat);
    b.position.set(cx, 10 + 0.25, cz);
    this.scene.add(b);
    this.colliders.push({ box: new THREE.Box3().setFromObject(b), type: 'BUILDING' });

    // Police Beacon Light
    const bLight = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    bLight.position.set(cx, 21, cz);
    this.scene.add(bLight);

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 7. Garage / Dealership Block
  private buildGarageBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    const garMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.5 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 45), garMat);
    b.position.set(cx, 7 + 0.25, cz);
    this.scene.add(b);
    this.colliders.push({ box: new THREE.Box3().setFromObject(b), type: 'BUILDING' });

    // Tuning Neon Banner
    const neon = new THREE.Mesh(new THREE.BoxGeometry(24, 2.5, 0.4), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    neon.position.set(cx, 12, cz + 22.8);
    this.scene.add(neon);

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 8. Airport Terminal Block
  private buildAirportBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    // Tarmac & Runway
    const tarmac = new THREE.Mesh(new THREE.BoxGeometry(this.blockSize - 2, 0.3, this.blockSize - 2), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }));
    tarmac.position.set(cx, 0.15, cz);
    this.scene.add(tarmac);

    // Terminal Building
    const termMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.2 });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(65, 12, 28), termMat);
    terminal.position.set(cx, 6 + 0.25, cz + 20);
    this.scene.add(terminal);
    this.colliders.push({ box: new THREE.Box3().setFromObject(terminal), type: 'BUILDING' });

    // Air Traffic Control Tower
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.5, 34, 12), termMat);
    tower.position.set(cx - 25, 17, cz - 20);
    this.scene.add(tower);
    this.colliders.push({ box: new THREE.Box3().setFromObject(tower), type: 'BUILDING' });

    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 3.5, 6, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    cabin.position.set(cx - 25, 34, cz - 20);
    this.scene.add(cabin);

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  // 9. Waterfront Block
  private buildWaterfrontBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    // Canal Water
    const water = new THREE.Mesh(new THREE.PlaneGeometry(this.blockSize - 4, this.blockSize - 4), new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(cx, 0.1, cz);
    this.scene.add(water);

    this.addStreetLightsAroundBlock(cx, cz, quality);
  }

  private addSidewalk(cx: number, cz: number) {
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Clean light gray sidewalk
      roughness: 0.7,
      metalness: 0.1,
    });
    const sidewalkGeo = new THREE.BoxGeometry(this.blockSize, 0.25, this.blockSize);
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(cx, 0.125, cz);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    const sidewalkBox = new THREE.Box3().setFromObject(sidewalk);
    this.colliders.push({ box: sidewalkBox, type: 'CURB' });
  }

  private addStreetLightsAroundBlock(cx: number, cz: number, quality: GraphicsQuality) {
    this.addStreetLight(cx - this.blockSize / 2 + 3, cz, quality);
    this.addStreetLight(cx + this.blockSize / 2 - 3, cz, quality);
    this.addStreetLight(cx, cz - this.blockSize / 2 + 3, quality);
    this.addStreetLight(cx, cz + this.blockSize / 2 - 3, quality);
  }

  private buildCityBlock(cx: number, cz: number, gx: number, gz: number, quality: GraphicsQuality) {
    this.addSidewalk(cx, cz);

    // Colorful Modern Buildings: Blue, Purple, Orange, Yellow, White, Gray, Pink, Cyan
    const buildingColors = [
      0x1677ff, // Primary Electric Blue
      0x7c3aed, // Purple
      0xff8a00, // Blaze Orange
      0xfacc15, // Yellow
      0xf8fafc, // Pure White
      0x475569, // Slate Gray
      0x00cfff, // Bright Cyan
      0xec4899, // Hot Pink
    ];
    const windowColors = [0xffd43b, 0x00cfff, 0xffffff, 0xec4899];

    const subSize = (this.blockSize - 8) / 2;
    const offsets = [
      { x: -subSize / 2 - 1, z: -subSize / 2 - 1 },
      { x: subSize / 2 + 1, z: -subSize / 2 - 1 },
      { x: -subSize / 2 - 1, z: subSize / 2 + 1 },
      { x: subSize / 2 + 1, z: subSize / 2 + 1 },
    ];

    offsets.forEach((offset, idx) => {
      const seed = Math.abs(Math.sin(gx * 12.9898 + gz * 78.233 + idx * 43.123));
      const height = 18 + Math.floor(seed * 65);
      const bColor = buildingColors[(Math.abs(gx * 3 + gz * 5 + idx)) % buildingColors.length];

      const bMat = new THREE.MeshStandardMaterial({
        color: bColor,
        roughness: 0.35,
        metalness: 0.45,
      });

      const bGeo = new THREE.BoxGeometry(subSize - 2, height, subSize - 2);
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(cx + offset.x, height / 2 + 0.25, cz + offset.z);
      bMesh.castShadow = quality !== 'LOW';
      bMesh.receiveShadow = true;
      this.scene.add(bMesh);

      const bBox = new THREE.Box3().setFromObject(bMesh);
      this.colliders.push({ box: bBox, type: 'BUILDING' });

      if (quality !== 'LOW') {
        const winGeo = new THREE.PlaneGeometry(subSize - 4, height * 0.7);
        const winColor = windowColors[idx % windowColors.length];
        const winMat = new THREE.MeshBasicMaterial({
          color: winColor,
          transparent: true,
          opacity: 0.45,
        });

        const wFront = new THREE.Mesh(winGeo, winMat);
        wFront.position.set(cx + offset.x, height * 0.5 + 0.25, cz + offset.z + (subSize - 2) / 2 + 0.05);
        this.scene.add(wFront);

        const wBack = new THREE.Mesh(winGeo, winMat);
        wBack.position.set(cx + offset.x, height * 0.5 + 0.25, cz + offset.z - (subSize - 2) / 2 - 0.05);
        wBack.rotation.y = Math.PI;
        this.scene.add(wBack);
      }
    });

    this.addStreetLightsAroundBlock(cx, cz, quality);

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

    const lampGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd43b });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(x, 6.8, z);
    this.scene.add(lamp);

    if (quality === 'HIGH') {
      const pLight = new THREE.PointLight(0xffd43b, 2.2, 24, 1.4);
      pLight.position.set(x, 6.5, z);
      this.scene.add(pLight);
      this.streetLights.push(pLight);
    }

    const poleBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 3.5, z), new THREE.Vector3(0.5, 7, 0.5));
    this.colliders.push({ box: poleBox, type: 'POLE' });
  }

  private addTree(x: number, z: number) {
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(x, 1.25, z);
    this.scene.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(1.6, 3.8, 7);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.set(x, 3.8, z);
    this.scene.add(leaves);

    const treeBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 2, z), new THREE.Vector3(1.2, 4, 1.2));
    this.colliders.push({ box: treeBox, type: 'TREE' });
  }

  private buildRoadNetwork(halfGrid: number, spacing: number) {
    const totalSpan = (halfGrid * 2 + 1) * spacing + 60;
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Visible dark slate asphalt
      roughness: 0.8,
      metalness: 0.15,
    });

    const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffd43b });
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

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

      // Center yellow double lines
      const yellowLineXGeo = new THREE.PlaneGeometry(totalSpan, 0.25);
      const yLineX = new THREE.Mesh(yellowLineXGeo, yellowLineMat);
      yLineX.rotation.x = -Math.PI / 2;
      yLineX.position.set(0, 0.04, roadCoord);
      this.scene.add(yLineX);

      const yellowLineZGeo = new THREE.PlaneGeometry(0.25, totalSpan);
      const yLineZ = new THREE.Mesh(yellowLineZGeo, yellowLineMat);
      yLineZ.rotation.x = -Math.PI / 2;
      yLineZ.position.set(roadCoord, 0.04, 0);
      this.scene.add(yLineZ);

      // White lane dividers
      const whiteLaneOffsets = [-4.5, 4.5];
      whiteLaneOffsets.forEach(off => {
        const wLineXGeo = new THREE.PlaneGeometry(totalSpan, 0.18);
        const wLineX = new THREE.Mesh(wLineXGeo, whiteLineMat);
        wLineX.rotation.x = -Math.PI / 2;
        wLineX.position.set(0, 0.035, roadCoord + off);
        this.scene.add(wLineX);

        const wLineZGeo = new THREE.PlaneGeometry(0.18, totalSpan);
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

      const boxGeo = new THREE.BoxGeometry(0.55, 1.4, 0.4);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x09090b });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(px, 5.2, pz);
      if (po.dir === 'east-west') {
        box.rotation.y = Math.PI / 2;
      }
      this.scene.add(box);

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
    this.createParkingSlot('slot_1', new THREE.Vector3(25, 0.05, 54), 0, 3.2, 6.0);
    this.createParkingSlot('slot_reverse_pro', new THREE.Vector3(-83, 0.05, -54), Math.PI / 2, 3.0, 5.8);
    this.createParkingSlot('slot_practice_1', new THREE.Vector3(-25, 0.05, 54), 0, 3.2, 6.0);
    this.createParkingSlot('slot_practice_2', new THREE.Vector3(133, 0.05, -54), Math.PI / 2, 3.2, 6.0);
  }

  private createParkingSlot(id: string, pos: THREE.Vector3, rot: number, width: number, length: number) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rot;

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

    const guideGeo = new THREE.PlaneGeometry(width - 0.2, length - 0.2);
    const guideMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const guide = new THREE.Mesh(guideGeo, guideMat);
    guide.rotation.x = -Math.PI / 2;
    guide.position.set(0, 0.025, 0);
    group.add(guide);

    this.scene.add(group);

    this.parkingSlots.push({
      id,
      position: pos,
      rotation: rot,
      width,
      length,
      mesh: group,
      guideMesh: guide,
    });
  }

  private spawnCollectibleCoins() {
    const coinGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.2, 16);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });

    const coinSpawns = [
      { x: 0, z: 25 }, { x: 0, z: 75 }, { x: 0, z: -25 }, { x: 0, z: -75 },
      { x: 25, z: 0 }, { x: 75, z: 0 }, { x: -25, z: 0 }, { x: -75, z: 0 },
      { x: 108, z: 25 }, { x: 108, z: -25 }, { x: -108, z: 25 }, { x: -108, z: -25 },
      { x: 162, z: 108 }, { x: -162, z: 108 }, { x: 162, z: -108 }, { x: -162, z: -108 },
      { x: 216, z: 0 }, { x: -216, z: 0 }, { x: 0, z: 216 }, { x: 0, z: -216 }
    ];

    coinSpawns.forEach((spawn, idx) => {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.set(spawn.x, 1.2, spawn.z);
      coin.rotation.x = Math.PI / 2;
      this.scene.add(coin);
      this.coinPickups.push({ mesh: coin, id: `coin_${idx}`, collected: false });
    });
  }

  /**
   * 3D In-World Navigation Route Ribbon / Ground Markers
   */
  public updateNavigationPath(waypoints: { x: number; z: number }[], active: boolean) {
    // Clear old ribbon elements
    while (this.navPathGroup.children.length > 0) {
      const obj = this.navPathGroup.children[0];
      this.navPathGroup.remove(obj);
    }

    if (!active || waypoints.length < 2) {
      return;
    }

    const pathMat = new THREE.MeshBasicMaterial({
      color: 0x087cf7,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });

    const chevronMat = new THREE.MeshBasicMaterial({
      color: 0x00b8ff,
      transparent: true,
      opacity: 0.85,
    });

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      if (dist < 0.5) continue;

      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.z + p2.z) / 2;

      // Road Path Stripe
      const segGeo = new THREE.PlaneGeometry(1.6, dist);
      const seg = new THREE.Mesh(segGeo, pathMat);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = -angle;
      seg.position.set(midX, 0.08, midZ);
      this.navPathGroup.add(seg);

      // Glowing Direction Chevrons along segment
      const numChevrons = Math.max(1, Math.floor(dist / 14));
      for (let c = 1; c <= numChevrons; c++) {
        const t = c / (numChevrons + 1);
        const cx = p1.x + (p2.x - p1.x) * t;
        const cz = p1.z + (p2.z - p1.z) * t;

        const chevGeo = new THREE.ConeGeometry(0.8, 1.4, 3);
        const chev = new THREE.Mesh(chevGeo, chevronMat);
        chev.rotation.x = -Math.PI / 2;
        chev.rotation.z = -angle;
        chev.position.set(cx, 0.1, cz);
        this.navPathGroup.add(chev);
      }
    }
  }

  public updateDestinationMarker(pos: { x: number; z: number } | null, name: string) {
    if (this.destinationBeacon) {
      this.scene.remove(this.destinationBeacon);
      this.destinationBeacon = null;
    }

    if (!pos) return;

    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    // Glowing Amber Beacon Beam
    const cylGeo = new THREE.CylinderGeometry(2.2, 2.2, 28, 16, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const cylinder = new THREE.Mesh(cylGeo, cylMat);
    cylinder.position.y = 14;
    group.add(cylinder);

    // Ground Target Ring
    const ringGeo = new THREE.RingGeometry(2.0, 3.8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    group.add(ring);

    // Floating Pin
    const pinGeo = new THREE.ConeGeometry(1.6, 3.2, 8);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.rotation.x = Math.PI;
    pin.position.y = 16;
    group.add(pin);

    this.scene.add(group);
    this.destinationBeacon = group;
  }

  public createWaypointBeacon(position: THREE.Vector3): THREE.Group {
    if (this.waypointMesh) {
      this.scene.remove(this.waypointMesh);
    }

    const group = new THREE.Group();
    group.position.copy(position);

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

    const arrowGeo = new THREE.ConeGeometry(1.2, 2.5, 8);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = Math.PI;
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

  public update(delta: number) {
    // 1. Traffic Signals State Machine
    this.trafficSignalTimer += delta;
    const cycleTime = 20;
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

    // 3. Animate Destination Beacon
    if (this.destinationBeacon) {
      this.destinationBeacon.rotation.y += delta * 1.8;
      const pin = this.destinationBeacon.children[2];
      if (pin) {
        pin.position.y = 16 + Math.sin(Date.now() * 0.005) * 0.8;
      }
    }

    // 4. Animate Collectible Coins
    this.coinPickups.forEach(coin => {
      if (!coin.collected) {
        coin.mesh.rotation.z += delta * 2.5;
        coin.mesh.position.y = 1.0 + Math.sin(Date.now() * 0.004 + coin.mesh.position.x) * 0.2;
      }
    });

    // 5. Pulse Parking Guides
    this.parkingSlots.forEach(slot => {
      if (slot.guideMesh) {
        const mat = slot.guideMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 + Math.sin(Date.now() * 0.004) * 0.15;
      }
    });
  }
}
