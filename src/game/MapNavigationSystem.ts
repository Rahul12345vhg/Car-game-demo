import { MapLocationCategory, MapPointOfInterest, NavigationRoute, RoadNode } from '../types/game';
import { METROPOLIS_POIS, ROAD_NODES, ROAD_SEGMENTS } from './mapData';

interface PriorityQueueItem {
  nodeId: string;
  priority: number;
}

export class MapNavigationSystem {
  private nodesMap: Map<string, RoadNode> = new Map();
  private activeRoute: NavigationRoute | null = null;
  private onDestinationReachedCallback?: (destination: NavigationRoute['destination'], totalDistanceM: number) => void;

  constructor(onDestinationReached?: (destination: NavigationRoute['destination'], totalDistanceM: number) => void) {
    this.onDestinationReachedCallback = onDestinationReached;
    // Build node map
    for (const node of ROAD_NODES) {
      this.nodesMap.set(node.id, node);
    }
  }

  public getActiveRoute(): NavigationRoute | null {
    return this.activeRoute;
  }

  public clearRoute() {
    this.activeRoute = null;
  }

  public getAllPois(): MapPointOfInterest[] {
    return METROPOLIS_POIS;
  }

  public getPoiById(id: string): MapPointOfInterest | undefined {
    return METROPOLIS_POIS.find(p => p.id === id);
  }

  public findNearestNode(pos: { x: number; z: number }): RoadNode {
    let nearestNode = ROAD_NODES[0];
    let minDistanceSq = Infinity;

    for (const node of ROAD_NODES) {
      const dx = node.x - pos.x;
      const dz = node.z - pos.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        nearestNode = node;
      }
    }

    return nearestNode;
  }

  /**
   * Calculates optimal road route using A* Graph Search
   */
  public calculateRoute(
    startPos: { x: number; z: number },
    targetPos: { x: number; z: number },
    destinationInfo: { id?: string; name: string; category?: MapLocationCategory }
  ): NavigationRoute | null {
    const startNode = this.findNearestNode(startPos);
    const goalNode = this.findNearestNode(targetPos);

    const openSet: string[] = [startNode.id];
    const cameFrom: Map<string, string> = new Map();

    const gScore: Map<string, number> = new Map();
    gScore.set(startNode.id, 0);

    const fScore: Map<string, number> = new Map();
    fScore.set(startNode.id, this.heuristic(startNode, goalNode));

    while (openSet.length > 0) {
      // Find node with lowest fScore
      let currentId = openSet[0];
      let lowestF = fScore.get(currentId) ?? Infinity;

      for (let i = 1; i < openSet.length; i++) {
        const id = openSet[i];
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = id;
        }
      }

      if (currentId === goalNode.id) {
        // Path reconstructed
        const nodePath: RoadNode[] = [];
        let curr: string | undefined = currentId;
        while (curr) {
          const n = this.nodesMap.get(curr);
          if (n) nodePath.unshift(n);
          curr = cameFrom.get(curr);
        }

        // Build full waypoints sequence [startPos, ...nodes, targetPos]
        const waypoints: { x: number; z: number }[] = [
          { x: startPos.x, z: startPos.z },
          ...nodePath.map(n => ({ x: n.x, z: n.z })),
          { x: targetPos.x, z: targetPos.z },
        ];

        // Filter out duplicate or near-identical consecutive waypoints
        const cleanWaypoints: { x: number; z: number }[] = [];
        for (let i = 0; i < waypoints.length; i++) {
          if (i === 0) {
            cleanWaypoints.push(waypoints[i]);
          } else {
            const prev = cleanWaypoints[cleanWaypoints.length - 1];
            const dist = Math.hypot(waypoints[i].x - prev.x, waypoints[i].z - prev.z);
            if (dist > 4) {
              cleanWaypoints.push(waypoints[i]);
            }
          }
        }

        let totalDist = 0;
        for (let i = 0; i < cleanWaypoints.length - 1; i++) {
          totalDist += Math.hypot(
            cleanWaypoints[i + 1].x - cleanWaypoints[i].x,
            cleanWaypoints[i + 1].z - cleanWaypoints[i].z
          );
        }

        // Approximate 50 km/h avg speed -> ~14 m/s
        const estimatedTimeSec = Math.max(10, Math.round(totalDist / 14));

        const route: NavigationRoute = {
          destination: {
            id: destinationInfo.id,
            name: destinationInfo.name,
            category: destinationInfo.category,
            position: { x: targetPos.x, z: targetPos.z },
          },
          nodes: nodePath,
          waypoints: cleanWaypoints,
          totalDistanceMeters: Math.round(totalDist),
          remainingDistanceMeters: Math.round(totalDist),
          estimatedTimeSeconds: estimatedTimeSec,
          currentInstruction: `Navigate to ${destinationInfo.name}`,
          nextInstruction: nodePath.length > 1 ? `Head towards ${nodePath[1].name || 'Main Road'}` : 'Head towards destination',
          isDestinationReached: false,
        };

        this.activeRoute = route;
        return route;
      }

      // Remove current from openSet
      const idx = openSet.indexOf(currentId);
      if (idx !== -1) openSet.splice(idx, 1);

      const currentNode = this.nodesMap.get(currentId);
      if (!currentNode) continue;

      for (const neighborId of currentNode.neighbors) {
        const neighborNode = this.nodesMap.get(neighborId);
        if (!neighborNode) continue;

        const distance = Math.hypot(neighborNode.x - currentNode.x, neighborNode.z - currentNode.z);
        const tentativeG = (gScore.get(currentId) ?? Infinity) + distance;

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          const f = tentativeG + this.heuristic(neighborNode, goalNode);
          fScore.set(neighborId, f);

          if (!openSet.includes(neighborId)) {
            openSet.push(neighborId);
          }
        }
      }
    }

    // Fallback direct path if graph isolated
    const directWaypoints = [
      { x: startPos.x, z: startPos.z },
      { x: targetPos.x, z: targetPos.z },
    ];
    const directDist = Math.hypot(targetPos.x - startPos.x, targetPos.z - startPos.z);
    const fallbackRoute: NavigationRoute = {
      destination: {
        id: destinationInfo.id,
        name: destinationInfo.name,
        category: destinationInfo.category,
        position: { x: targetPos.x, z: targetPos.z },
      },
      nodes: [startNode, goalNode],
      waypoints: directWaypoints,
      totalDistanceMeters: Math.round(directDist),
      remainingDistanceMeters: Math.round(directDist),
      estimatedTimeSeconds: Math.max(10, Math.round(directDist / 14)),
      currentInstruction: `Drive to ${destinationInfo.name}`,
      nextInstruction: 'Follow GPS marker',
      isDestinationReached: false,
    };

    this.activeRoute = fallbackRoute;
    return fallbackRoute;
  }

  private heuristic(a: RoadNode, b: RoadNode): number {
    return Math.hypot(b.x - a.x, b.z - a.z);
  }

  /**
   * Updates real-time navigation while player car is moving
   */
  public update(playerPos: { x: number; z: number }, speedKmh: number, playerHeadingRad: number): NavigationRoute | null {
    if (!this.activeRoute || this.activeRoute.isDestinationReached) {
      return this.activeRoute;
    }

    const dest = this.activeRoute.destination.position;
    const directDistToDest = Math.hypot(dest.x - playerPos.x, dest.z - playerPos.z);

    // Arrival threshold (12 meters)
    if (directDistToDest <= 12) {
      this.activeRoute.isDestinationReached = true;
      this.activeRoute.remainingDistanceMeters = 0;
      this.activeRoute.estimatedTimeSeconds = 0;
      this.activeRoute.currentInstruction = '📍 DESTINATION REACHED!';
      this.activeRoute.nextInstruction = 'Mission Complete';

      this.onDestinationReachedCallback?.(this.activeRoute.destination, this.activeRoute.totalDistanceMeters);
      return this.activeRoute;
    }

    // Find closest waypoint ahead on the route
    const waypoints = this.activeRoute.waypoints;
    let closestIndex = 0;
    let minWpDist = Infinity;

    for (let i = 0; i < waypoints.length; i++) {
      const d = Math.hypot(waypoints[i].x - playerPos.x, waypoints[i].z - playerPos.z);
      if (d < minWpDist) {
        minWpDist = d;
        closestIndex = i;
      }
    }

    // Calculate remaining road distance along waypoints from closestIndex onwards
    let remainingMeters = minWpDist;
    for (let i = closestIndex; i < waypoints.length - 1; i++) {
      remainingMeters += Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].z - waypoints[i].z);
    }

    this.activeRoute.remainingDistanceMeters = Math.round(remainingMeters);

    // Calculate dynamic ETA based on current speed or average speed
    const effectiveSpeedMs = Math.max(10, (speedKmh / 3.6) * 0.7 + 5);
    this.activeRoute.estimatedTimeSeconds = Math.max(1, Math.round(remainingMeters / effectiveSpeedMs));

    // Turn by turn instructions
    if (closestIndex < waypoints.length - 1) {
      const nextTarget = waypoints[closestIndex + 1];
      const distToNext = Math.hypot(nextTarget.x - playerPos.x, nextTarget.z - playerPos.z);

      // Compute angle between player heading and vector to next waypoint
      const targetAngle = Math.atan2(nextTarget.x - playerPos.x, nextTarget.z - playerPos.z);
      let angleDiff = targetAngle - playerHeadingRad;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const angleDeg = (angleDiff * 180) / Math.PI;

      if (remainingMeters <= 50) {
        this.activeRoute.currentInstruction = `Arriving at ${this.activeRoute.destination.name}`;
      } else if (distToNext > 25) {
        this.activeRoute.currentInstruction = `Continue straight for ${Math.round(distToNext)}m`;
      } else if (angleDeg > 35) {
        this.activeRoute.currentInstruction = `Turn Right in ${Math.round(distToNext)}m`;
      } else if (angleDeg < -35) {
        this.activeRoute.currentInstruction = `Turn Left in ${Math.round(distToNext)}m`;
      } else {
        this.activeRoute.currentInstruction = `Continue on route (${Math.round(distToNext)}m)`;
      }

      if (closestIndex + 2 < waypoints.length) {
        const subsequentTarget = waypoints[closestIndex + 2];
        this.activeRoute.nextInstruction = `Then head towards next road`;
      }
    } else {
      this.activeRoute.currentInstruction = `Arriving at ${this.activeRoute.destination.name}`;
    }

    return this.activeRoute;
  }
}
