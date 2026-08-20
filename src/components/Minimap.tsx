import React, { useRef, useEffect, useState } from 'react';
import { NavigationRoute, PlayerMapPosition } from '../types/game';
import { METROPOLIS_POIS, ROAD_NODES, ROAD_SEGMENTS } from '../game/mapData';
import {
  Maximize2,
  Navigation,
  Compass,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowUp,
  RotateCcw,
  Flag,
  LocateFixed,
} from 'lucide-react';
import { sound } from '../services/audio';

interface MinimapProps {
  playerMapPos?: PlayerMapPosition;
  navigationRoute?: NavigationRoute | null;
  onOpenFullMap: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  playerMapPos,
  navigationRoute,
  onOpenFullMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [headingUp, setHeadingUp] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(0.85); // zoom factor

  const mapSize = 140; // minimap pixel dimension

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerScreenX = width / 2;
    const centerScreenY = height / 2;

    const playerX = playerMapPos?.x ?? 0;
    const playerZ = playerMapPos?.z ?? 0;
    const playerHeading = playerMapPos?.heading ?? 0;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // Clip to rounded squircle / circle
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, 16);
    ctx.clip();

    // Map background - deep dark navy
    ctx.fillStyle = '#0b1329';
    ctx.fillRect(0, 0, width, height);

    // Apply camera transformation centered on player
    ctx.save();
    ctx.translate(centerScreenX, centerScreenY);

    if (headingUp) {
      // Rotate map so car faces UP
      ctx.rotate(-playerHeading);
    }

    const scale = zoomLevel * 0.45; // pixel per meter

    // Function to transform world (x, z) to canvas local (x', y')
    const toLocal = (wx: number, wz: number) => {
      const dx = (wx - playerX) * scale;
      const dy = (wz - playerZ) * scale;
      return { x: dx, y: dy };
    };

    // 1. Draw City Grid / Ground Blocks
    const blockSize = 90;
    const spacing = 108;
    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -2; gz <= 2; gz++) {
        const bx = gx * spacing;
        const bz = gz * spacing;
        const p = toLocal(bx - blockSize / 2, bz - blockSize / 2);
        const w = blockSize * scale;
        const h = blockSize * scale;

        // Block fill
        if (gx === -1 && gz === 0) {
          ctx.fillStyle = '#064e3b'; // Grand park
        } else if (gx === 1 && gz === -1) {
          ctx.fillStyle = '#0369a1'; // Waterfront
        } else if (gx === 0 && gz === 0) {
          ctx.fillStyle = '#1e293b'; // Downtown Pinnacle
        } else {
          ctx.fillStyle = '#111c30'; // Urban block
        }
        ctx.fillRect(p.x, p.y, w, h);
      }
    }

    // 2. Draw Road Segments (Asphalt & Lane Markings)
    ROAD_SEGMENTS.forEach(seg => {
      const n1 = ROAD_NODES[seg.fromNode];
      const n2 = ROAD_NODES[seg.toNode];
      if (!n1 || !n2) return;

      const p1 = toLocal(n1.x, n1.z);
      const p2 = toLocal(n2.x, n2.z);

      // Road background (Dark Slate)
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = seg.type === 'HIGHWAY' ? 14 * scale : 10 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Road Centerline
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 3. Draw GPS Navigation Route Line
    if (navigationRoute && navigationRoute.waypoints.length > 1) {
      ctx.beginPath();
      const firstWp = toLocal(navigationRoute.waypoints[0].x, navigationRoute.waypoints[0].z);
      ctx.moveTo(firstWp.x, firstWp.y);

      for (let i = 1; i < navigationRoute.waypoints.length; i++) {
        const wp = toLocal(navigationRoute.waypoints[i].x, navigationRoute.waypoints[i].z);
        ctx.lineTo(wp.x, wp.y);
      }

      // Glowing route stroke
      ctx.strokeStyle = '#087cf7';
      ctx.lineWidth = 6 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Bright route inner core
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
    }

    // 4. Draw Landmarks / POI Icons
    METROPOLIS_POIS.forEach(poi => {
      const p = toLocal(poi.position.x, poi.position.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // 5. Draw Active Destination Pin
    if (navigationRoute?.destination) {
      const destPos = toLocal(navigationRoute.destination.position.x, navigationRoute.destination.position.z);
      ctx.beginPath();
      ctx.arc(destPos.x, destPos.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Restore translation / rotation
    ctx.restore();

    // 6. Draw Player Vehicle Chevron Marker at Center
    ctx.save();
    ctx.translate(centerScreenX, centerScreenY);
    if (!headingUp) {
      // If north is always up, rotate the car chevron by player heading
      ctx.rotate(playerHeading);
    }

    // Player Arrow / Car Marker
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fillStyle = '#00b8ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // 7. Outer Border
    ctx.restore(); // restore clipping
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, width - 2, height - 2, 16);
    ctx.stroke();
  }, [playerMapPos, navigationRoute, headingUp, zoomLevel]);

  // Determine Turn Icon based on navigation turn instruction
  const getTurnIcon = () => {
    if (!navigationRoute?.currentInstruction) return null;
    const inst = navigationRoute.currentInstruction;
    if (inst.includes('left') || inst.includes('Left')) {
      return <ArrowUpLeft className="w-5 h-5 text-emerald-400" />;
    }
    if (inst.includes('right') || inst.includes('Right')) {
      return <ArrowUpRight className="w-5 h-5 text-emerald-400" />;
    }
    if (inst.includes('U-turn') || inst.includes('turn around')) {
      return <RotateCcw className="w-5 h-5 text-amber-400" />;
    }
    if (inst.includes('Arrived') || inst.includes('Destination')) {
      return <Flag className="w-5 h-5 text-amber-400 animate-bounce" />;
    }
    return <ArrowUp className="w-5 h-5 text-sky-400" />;
  };

  return (
    <div id="game-minimap-container" className="flex flex-col items-start gap-1 pointer-events-auto">
      {/* Top GPS Instruction Pill */}
      {navigationRoute && (
        <div
          onClick={() => {
            sound.playButtonClick();
            onOpenFullMap();
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-white shadow-lg cursor-pointer active:scale-95 transition-all max-w-[210px]"
        >
          <div className="shrink-0">{getTurnIcon()}</div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-100 truncate leading-tight">
              {navigationRoute.currentInstruction || navigationRoute.destination.name}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-cyan-300 font-semibold">
              <span>{Math.round(navigationRoute.remainingDistanceMeters)} m</span>
              <span>•</span>
              <span>{Math.round(navigationRoute.estimatedTimeSeconds)}s</span>
            </div>
          </div>
        </div>
      )}

      {/* Minimap Viewport */}
      <div className="relative group">
        <canvas
          ref={canvasRef}
          width={mapSize}
          height={mapSize}
          onClick={() => {
            sound.playButtonClick();
            onOpenFullMap();
          }}
          className="rounded-2xl shadow-xl shadow-cyan-950/50 cursor-pointer border border-sky-500/30 hover:border-cyan-400 transition-colors"
          style={{ width: `${mapSize}px`, height: `${mapSize}px` }}
        />

        {/* Floating Quick Action Overlays */}
        {/* Fullscreen Map Button */}
        <button
          id="btn-expand-full-map"
          onClick={e => {
            e.stopPropagation();
            sound.playButtonClick();
            onOpenFullMap();
          }}
          title="Open Metropolis City Map"
          className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-sky-400 hover:text-white hover:bg-sky-600 transition-colors active:scale-90"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Heading / North Orientation Toggle */}
        <button
          id="btn-toggle-map-orientation"
          onClick={e => {
            e.stopPropagation();
            sound.playButtonClick();
            setHeadingUp(!headingUp);
          }}
          title={headingUp ? 'Heading-Up Mode' : 'North-Up Mode'}
          className={`absolute bottom-1.5 left-1.5 p-1.5 rounded-lg backdrop-blur-sm border text-xs font-bold transition-all active:scale-90 ${
            headingUp
              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
              : 'bg-slate-900/80 border-slate-700 text-slate-400'
          }`}
        >
          <Compass className={`w-3.5 h-3.5 ${headingUp ? 'text-sky-400' : 'text-slate-400'}`} />
        </button>

        {/* Zoom Level Toggle */}
        <button
          id="btn-toggle-minimap-zoom"
          onClick={e => {
            e.stopPropagation();
            sound.playButtonClick();
            setZoomLevel(prev => (prev >= 1.2 ? 0.6 : prev + 0.3));
          }}
          title="Toggle Zoom"
          className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-sky-400 hover:text-white transition-all active:scale-90"
        >
          <LocateFixed className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
