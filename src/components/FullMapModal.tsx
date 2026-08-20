import React, { useState, useRef, useEffect } from 'react';
import { MapLocationCategory, MapPointOfInterest, NavigationRoute, PlayerMapPosition } from '../types/game';
import { METROPOLIS_POIS, ROAD_NODES, ROAD_SEGMENTS } from '../game/mapData';
import {
  X,
  Navigation,
  MapPin,
  Plus,
  Minus,
  LocateFixed,
  Fuel,
  Building,
  Shield,
  Car,
  ShoppingBag,
  Layers,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { sound } from '../services/audio';

interface FullMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerMapPos?: PlayerMapPosition;
  navigationRoute?: NavigationRoute | null;
  onSetDestination: (target: { id?: string; name: string; category?: MapLocationCategory; position: { x: number; z: number } }) => void;
  onClearDestination: () => void;
}

const CATEGORY_TABS: { id: MapLocationCategory | 'ALL'; label: string; icon: React.ReactNode }[] = [
  { id: 'ALL', label: 'All Places', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'LANDMARK', label: 'Landmarks', icon: <Building className="w-3.5 h-3.5" /> },
  { id: 'GAS', label: 'Fuel', icon: <Fuel className="w-3.5 h-3.5" /> },
  { id: 'PARKING', label: 'Parking', icon: <Car className="w-3.5 h-3.5" /> },
  { id: 'SHOPPING', label: 'Shops', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  { id: 'SERVICES', label: 'Services', icon: <Shield className="w-3.5 h-3.5" /> },
];

export const FullMapModal: React.FC<FullMapModalProps> = ({
  isOpen,
  onClose,
  playerMapPos,
  navigationRoute,
  onSetDestination,
  onClearDestination,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Map Pan & Zoom Transform State
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(0.9);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected Landmark State
  const [selectedPoi, setSelectedPoi] = useState<MapPointOfInterest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MapLocationCategory | 'ALL'>('ALL');
  const [showPoiList, setShowPoiList] = useState<boolean>(false);

  // Center pan on player whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (playerMapPos) {
        setPan({ x: -playerMapPos.x * zoom, y: -playerMapPos.z * zoom });
      } else {
        setPan({ x: 0, y: 0 });
      }
    }
  }, [isOpen]);

  // Render Map Canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to container
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    const width = canvas.width;
    const height = canvas.height;
    const centerScreenX = width / 2 + pan.x;
    const centerScreenY = height / 2 + pan.y;

    // Clear background - deep night urban grid
    ctx.fillStyle = '#0a1020';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerScreenX, centerScreenY);

    const scale = zoom;

    const toLocal = (wx: number, wz: number) => ({
      x: wx * scale,
      y: wz * scale,
    });

    // 1. Draw City Districts / Grid Blocks
    const blockSize = 90;
    const spacing = 108;
    for (let gx = -2; gx <= 2; gx++) {
      for (let gz = -2; gz <= 2; gz++) {
        const bx = gx * spacing;
        const bz = gz * spacing;
        const p = toLocal(bx - blockSize / 2, bz - blockSize / 2);
        const w = blockSize * scale;
        const h = blockSize * scale;

        // Block colors per district
        if (gx === -1 && gz === 0) {
          ctx.fillStyle = '#064e3b'; // Grand Park
        } else if (gx === 1 && gz === -1) {
          ctx.fillStyle = '#0284c7'; // Waterfront
        } else if (gx === 0 && gz === 0) {
          ctx.fillStyle = '#1e293b'; // Central Downtown
        } else if (gx === -2 && gz === -2) {
          ctx.fillStyle = '#1e293b'; // Airport
        } else {
          ctx.fillStyle = '#111e33'; // Urban Commercial/Residential
        }

        ctx.fillRect(p.x, p.y, w, h);

        // Block boundary outline
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, w, h);
      }
    }

    // 2. Draw Road Network
    ROAD_SEGMENTS.forEach(seg => {
      const n1 = ROAD_NODES[seg.fromNode];
      const n2 = ROAD_NODES[seg.toNode];
      if (!n1 || !n2) return;

      const p1 = toLocal(n1.x, n1.z);
      const p2 = toLocal(n2.x, n2.z);

      // Asphalt Road Base
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#273549';
      ctx.lineWidth = seg.type === 'HIGHWAY' ? 18 * scale : 14 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Road Lane Line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
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

      // Outer glow
      ctx.strokeStyle = '#087cf7';
      ctx.lineWidth = 8 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Bright inner core
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5 * scale;
      ctx.stroke();
    }

    // 4. Draw Landmarks / POIs
    METROPOLIS_POIS.forEach(poi => {
      const p = toLocal(poi.position.x, poi.position.z);
      const isSelected = selectedPoi?.id === poi.id;
      const isDestination = navigationRoute?.destination.name === poi.name;

      // Pulse circle for selected/dest
      if (isSelected || isDestination) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14 * scale, 0, Math.PI * 2);
        ctx.fillStyle = isDestination ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)';
        ctx.fill();
      }

      // Icon Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isSelected || isDestination ? 7.5 : 5.5) * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label Text (if zoomed in or selected)
      if (zoom >= 0.7 || isSelected || isDestination) {
        ctx.font = `bold ${Math.max(10, Math.min(13, 11 * scale))}px system-ui, sans-serif`;
        ctx.fillStyle = isDestination ? '#fbbf24' : isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(poi.name, p.x, p.y + 16 * scale);
      }
    });

    // 5. Draw Player Vehicle Marker
    if (playerMapPos) {
      const pPos = toLocal(playerMapPos.x, playerMapPos.z);

      ctx.save();
      ctx.translate(pPos.x, pPos.y);
      ctx.rotate(playerMapPos.heading);

      // Radar Pulse Wave
      ctx.beginPath();
      ctx.arc(0, 0, 16 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 184, 255, 0.2)';
      ctx.fill();

      // Direction Arrow
      ctx.beginPath();
      ctx.moveTo(0, -11 * scale);
      ctx.lineTo(8 * scale, 9 * scale);
      ctx.lineTo(0, 5 * scale);
      ctx.lineTo(-8 * scale, 9 * scale);
      ctx.closePath();
      ctx.fillStyle = '#00b8ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }, [isOpen, pan, zoom, selectedPoi, navigationRoute, playerMapPos]);

  // Handle Touch/Mouse Drag to Pan Map
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Canvas Click to Select POI or Place Waypoint
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;
    const centerScreenX = width / 2 + pan.x;
    const centerScreenY = height / 2 + pan.y;

    // Convert screen coord to world coord
    const worldX = (clickX - centerScreenX) / zoom;
    const worldZ = (clickY - centerScreenY) / zoom;

    // Check if clicked near any POI (radius = 28m)
    const clickedPoi = METROPOLIS_POIS.find(poi => {
      const dist = Math.hypot(poi.position.x - worldX, poi.position.z - worldZ);
      return dist < 28;
    });

    if (clickedPoi) {
      sound.playButtonClick();
      setSelectedPoi(clickedPoi);
    } else {
      // Clicked arbitrary road location - set custom waypoint
      sound.playButtonClick();
      const customPoi: MapPointOfInterest = {
        id: `custom_${Date.now()}`,
        name: `Waypoint (${Math.round(worldX)}, ${Math.round(worldZ)})`,
        category: 'SERVICES',
        description: 'User marked GPS destination on Metropolis road grid',
        position: { x: Math.round(worldX), z: Math.round(worldZ) },
        icon: '📍',
        district: 'Metropolis',
      };
      setSelectedPoi(customPoi);
    }
  };

  const handleCenterOnPlayer = () => {
    sound.playButtonClick();
    if (playerMapPos) {
      setPan({ x: -playerMapPos.x * zoom, y: -playerMapPos.z * zoom });
    }
  };

  const handleSetDestination = (poi: MapPointOfInterest) => {
    sound.playSuccess();
    onSetDestination({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      position: { x: poi.position.x, z: poi.position.z },
    });
    onClose();
  };

  const handleClearRoute = () => {
    sound.playButtonClick();
    onClearDestination();
    setSelectedPoi(null);
  };

  const filteredPois = METROPOLIS_POIS.filter(
    p => selectedCategory === 'ALL' || p.category === selectedCategory
  );

  if (!isOpen) return null;

  return (
    <div
      id="full-map-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 safe-area-all select-none"
    >
      <div
        id="full-map-dialog"
        className="relative w-full h-full max-w-5xl max-h-[92vh] bg-slate-950/95 border border-sky-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                City Drive Metropolis
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  GPS MAP
                </span>
              </h2>
              <p className="text-xs text-slate-400">Open-World Interactive Urban Navigation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-poi-sidebar"
              onClick={() => {
                sound.playButtonClick();
                setShowPoiList(!showPoiList);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                showPoiList
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-slate-850 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Places ({filteredPois.length})</span>
            </button>

            <button
              id="btn-close-full-map"
              onClick={() => {
                sound.playButtonClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 border border-slate-700 hover:border-red-400 text-slate-300 hover:text-red-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body with Map Viewport & POI Panel */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* Map Canvas Viewport */}
          <div
            ref={containerRef}
            className="relative flex-1 h-full cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full h-full block"
            />

            {/* Map Controls Overlay (Zoom & Center) */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
              <button
                id="btn-map-zoom-in"
                onClick={() => {
                  sound.playButtonClick();
                  setZoom(z => Math.min(2.0, z + 0.25));
                }}
                className="p-2.5 rounded-xl bg-slate-900/85 backdrop-blur-sm border border-slate-700 text-sky-400 hover:text-white hover:bg-sky-600 shadow-lg active:scale-95 transition-all"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                id="btn-map-zoom-out"
                onClick={() => {
                  sound.playButtonClick();
                  setZoom(z => Math.max(0.4, z - 0.25));
                }}
                className="p-2.5 rounded-xl bg-slate-900/85 backdrop-blur-sm border border-slate-700 text-sky-400 hover:text-white hover:bg-sky-600 shadow-lg active:scale-95 transition-all"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                id="btn-map-recenter"
                onClick={handleCenterOnPlayer}
                className="p-2.5 rounded-xl bg-slate-900/85 backdrop-blur-sm border border-slate-700 text-cyan-400 hover:text-white hover:bg-cyan-600 shadow-lg active:scale-95 transition-all"
                title="Center on My Vehicle"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Landmark Floating Bottom Card */}
            {selectedPoi && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 p-4 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-2xl z-20 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full shrink-0 border border-white/60 bg-sky-400" />
                    <div>
                      <h3 className="text-sm font-black text-white">{selectedPoi.name}</h3>
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                        {selectedPoi.category} • {selectedPoi.district}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPoi(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedPoi.description}
                </p>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <button
                    id="btn-start-navigation"
                    onClick={() => handleSetDestination(selectedPoi)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 font-bold text-xs text-white shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Start GPS Route</span>
                  </button>

                  {navigationRoute && (
                    <button
                      id="btn-cancel-route"
                      onClick={handleClearRoute}
                      className="p-2 rounded-xl bg-slate-850 hover:bg-red-500/20 border border-slate-700 hover:border-red-400 text-slate-400 hover:text-red-300 transition-colors"
                      title="Clear Active Navigation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* POI Sidebar Drawer (Toggled) */}
          {showPoiList && (
            <div className="w-72 sm:w-80 border-l border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col shrink-0 z-20">
              {/* Categories Pills */}
              <div className="p-3 border-b border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
                {CATEGORY_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      sound.playButtonClick();
                      setSelectedCategory(tab.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 ${
                      selectedCategory === tab.id
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Places List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredPois.map(poi => {
                  const isSelected = selectedPoi?.id === poi.id;
                  const isDestination = navigationRoute?.destination.name === poi.name;
                  return (
                    <div
                      key={poi.id}
                      onClick={() => {
                        sound.playButtonClick();
                        setSelectedPoi(poi);
                        setPan({ x: -poi.position.x * zoom, y: -poi.position.z * zoom });
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isDestination
                          ? 'bg-amber-500/15 border-amber-400/50 text-white'
                          : isSelected
                          ? 'bg-sky-500/15 border-sky-400/50 text-white'
                          : 'bg-slate-850/50 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0 bg-sky-400" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{poi.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{poi.description}</p>
                        </div>
                      </div>

                      {isDestination ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Your Vehicle</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Destination</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Parks & Landmarks</span>
            </span>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tap any road or landmark to set GPS navigation
          </span>
        </div>
      </div>
    </div>
  );
};
