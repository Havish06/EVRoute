import React, { FC, useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  Check, 
  Map as MapIcon, 
  Compass, 
  Crosshair, 
  Plus, 
  Minus, 
  Activity, 
  Mountain, 
  Zap, 
  Navigation2,
  Clock,
  BatteryCharging,
  CloudSun,
  Wind
} from 'lucide-react';
import { RouteOption, GraphNode, ChargingStation, TelemetryState, IsochroneContour, VehicleSpec, WeatherCondition } from '../types';

const OSM_API_KEY = import.meta.env.VITE_OSM_API_KEY || 'ygVXsyMGb6EC6HonkOAC';

export type OsmMapStyle = 'osm_standard' | 'osm_streets' | 'osm_dark' | 'osm_official';

interface OsmStyleConfig {
  id: OsmMapStyle;
  label: string;
  tag: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const OSM_STYLES: Record<OsmMapStyle, OsmStyleConfig> = {
  osm_dark: {
    id: 'osm_dark',
    label: 'Dark Cockpit',
    tag: 'Automotive Night',
    url: `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${OSM_API_KEY}`,
    attribution: '&copy; OpenStreetMap, &copy; MapTiler',
    maxZoom: 19,
  },
  osm_streets: {
    id: 'osm_streets',
    label: 'OSM High-Res',
    tag: 'Detailed Highways',
    url: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${OSM_API_KEY}`,
    attribution: '&copy; OpenStreetMap, &copy; MapTiler',
    maxZoom: 19,
  },
  osm_standard: {
    id: 'osm_standard',
    label: 'Standard Topo',
    tag: 'OpenStreetMap',
    url: `https://api.maptiler.com/maps/openstreetmap/256/{z}/{x}/{y}.jpg?key=${OSM_API_KEY}`,
    attribution: '&copy; OpenStreetMap, &copy; MapTiler',
    maxZoom: 19,
  },
  osm_official: {
    id: 'osm_official',
    label: 'Official OSM',
    tag: 'Direct OSM.org',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

interface RouteMapProps {
  routes: RouteOption[];
  activeRoute: RouteOption;
  onSelectRoute: (route: RouteOption) => void;
  nodes: GraphNode[];
  telemetry: TelemetryState;
  isDriving: boolean;
  selectedVehicle?: VehicleSpec;
  isochroneContours?: IsochroneContour[];
  onOpenIsochrones?: () => void;
  showTrafficOverlay?: boolean;
  showSteepSections?: boolean;
  heightClass?: string;
  onSelectChargingStation?: (station: ChargingStation) => void;
  weather?: WeatherCondition;
}

export const RouteMap: FC<RouteMapProps> = ({
  routes,
  activeRoute,
  onSelectRoute,
  nodes,
  telemetry,
  isDriving,
  selectedVehicle,
  isochroneContours = [],
  onOpenIsochrones,
  heightClass = 'h-[520px] lg:h-[620px]',
  onSelectChargingStation,
  weather,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const isochronesLayerRef = useRef<L.LayerGroup | null>(null);
  const trafficLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const [activeOsmStyle, setActiveOsmStyle] = useState<OsmMapStyle>('osm_dark');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showChargers, setShowChargers] = useState(true);
  const [showGradients, setShowGradients] = useState(true);
  const [showWeather, setShowWeather] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.2, 79.0],
      zoom: 8,
      zoomControl: false,
    });

    const initialConfig = OSM_STYLES[activeOsmStyle];
    const tileLayer = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      maxZoom: initialConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    polylinesLayerRef.current = L.layerGroup().addTo(map);
    trafficLayerRef.current = L.layerGroup().addTo(map);
    weatherLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    isochronesLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base tile layer on style change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = OSM_STYLES[activeOsmStyle];
    const newTileLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeOsmStyle]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeRoute || activeRoute.polyline.length === 0) return;
    const validRoutes = routes.filter(r => r.polyline && r.polyline.length > 0);
    if (validRoutes.length > 0) {
      const bounds = L.latLngBounds(validRoutes[0].polyline);
      validRoutes.forEach(r => bounds.extend(r.polyline));
      map.fitBounds(bounds, { padding: [45, 45] });
    } else {
      map.fitBounds(L.latLngBounds(activeRoute.polyline), { padding: [40, 40] });
    }
  }, [activeRoute, routes]);

  // Update routes, polylines, traffic, and markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !polylinesLayerRef.current || !markersLayerRef.current || !trafficLayerRef.current) return;

    polylinesLayerRef.current.clearLayers();
    trafficLayerRef.current.clearLayers();
    markersLayerRef.current.clearLayers();

    if (!activeRoute || routes.length === 0) return;

    // Draw alternative routes (behind active route)
    routes.forEach((route) => {
      const isSelected = route.id === activeRoute.id;
      if (!isSelected && route.polyline.length > 0) {
        // Casing
        const altCasing = L.polyline(route.polyline, {
          color: '#000000',
          weight: 6,
          opacity: 0.6,
          interactive: true,
        });
        altCasing.on('click', () => onSelectRoute(route));
        polylinesLayerRef.current?.addLayer(altCasing);

        // Core alt line
        const polyline = L.polyline(route.polyline, {
          color: route.color || '#38bdf8',
          weight: 4,
          opacity: 0.75,
          dashArray: '6, 6',
          interactive: true,
        });

        polyline.bindTooltip(`
          <div class="text-xs p-1 font-sans">
            <strong style="color: ${route.color || '#38bdf8'}">${route.name}</strong><br/>
            <strong>Distance:</strong> ${route.totalDistanceKm} km · <strong>Time:</strong> ${Math.floor(route.totalTravelTimeMin / 60)}h ${route.totalTravelTimeMin % 60}m<br/>
            <strong>Energy:</strong> ${route.totalEnergyKwh} kWh · <strong>Arrival:</strong> ${route.arrivalSoc}%<br/>
            <span class="text-[10px] text-slate-400 font-mono">Click to activate corridor</span>
          </div>
        `, { sticky: true });

        polyline.on('click', () => onSelectRoute(route));
        polylinesLayerRef.current?.addLayer(polyline);
      }
    });

    // Draw active recommended route (stands out with high-contrast electric casing)
    if (activeRoute.polyline.length > 0) {
      // Glow casing
      const glowColor = activeRoute.color === '#06b6d4' ? '#083344' : activeRoute.color === '#38bdf8' ? '#0c4a6e' : '#022c22';
      const casing = L.polyline(activeRoute.polyline, {
        color: glowColor,
        weight: 10,
        opacity: 0.6,
      });
      polylinesLayerRef.current.addLayer(casing);

      // Core route polyline (emerald green or selected color)
      const activePolyline = L.polyline(activeRoute.polyline, {
        color: activeRoute.color || '#10b981',
        weight: 5.5,
        opacity: 0.98,
      });

      activePolyline.bindTooltip(`
        <div class="text-xs p-1 font-sans">
          <strong style="color: ${activeRoute.color || '#10b981'}" class="font-bold">${activeRoute.name}</strong><br/>
          <strong>Distance:</strong> ${activeRoute.totalDistanceKm} km<br/>
          <strong>Predicted Energy:</strong> ${activeRoute.totalEnergyKwh} kWh<br/>
          <strong>Arrival Battery:</strong> ${activeRoute.arrivalSoc}%
        </div>
      `, { sticky: true });

      polylinesLayerRef.current.addLayer(activePolyline);

      // Fit bounds when not actively driving
      if (!isDriving) {
        const validRoutes = routes.filter(r => r.polyline && r.polyline.length > 0);
        if (validRoutes.length > 0) {
          const bounds = L.latLngBounds(validRoutes[0].polyline);
          validRoutes.forEach(r => bounds.extend(r.polyline));
          map.fitBounds(bounds, { padding: [45, 45] });
        } else {
          map.fitBounds(activePolyline.getBounds(), { padding: [40, 40] });
        }
      }
    }

    // Traffic & Steep-gradient overlays
    if (showTraffic || showGradients) {
      activeRoute.segments.forEach((seg) => {
        if (!seg.edgeId) return;
        // Traffic highlights
        if (showTraffic && (seg.speedKmh < 45 || seg.travelTimeMin > 45)) {
          // Subtle orange/amber traffic indicator on slow segments
        }
      });
    }

    // Add Node Markers (Origin, Destination, Chargers)
    nodes.forEach((node) => {
      if (node.isOrigin) {
        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 font-bold text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([node.lat, node.lng], { icon });
        marker.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <span class="font-bold text-emerald-400 block uppercase font-mono text-[10px]">ORIGIN / START</span>
            <strong>${node.name}</strong><br/>
            Elevation: ${node.elevationM}m MSL
          </div>
        `);
        markersLayerRef.current?.addLayer(marker);
      } else if (node.isDestination) {
        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([node.lat, node.lng], { icon });
        marker.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <span class="font-bold text-rose-400 block uppercase font-mono text-[10px]">DESTINATION / SUMMIT</span>
            <strong>${node.name}</strong><br/>
            Elevation: ${node.elevationM}m MSL
          </div>
        `);
        markersLayerRef.current?.addLayer(marker);
      } else if (node.chargingStation && showChargers) {
        const cs = node.chargingStation;
        const activeStop = activeRoute?.chargingStops?.find(s => s.station.id === cs.id);

        const iconHtml = activeStop
          ? `
            <div class="relative flex items-center justify-center">
              <span class="absolute w-9 h-9 rounded-full bg-amber-400 opacity-75 animate-ping"></span>
              <div class="relative w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-slate-950 font-black hover:scale-110 transition-transform">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
              </div>
              <div class="absolute -bottom-4 px-1.5 py-0.2 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider rounded shadow border border-white whitespace-nowrap">
                Stop #${(activeRoute.chargingStops.findIndex(s => s.station.id === cs.id) + 1)}
              </div>
            </div>
          `
          : `
            <div class="w-6 h-6 rounded-full bg-slate-900 border-2 border-amber-400/80 shadow-md flex items-center justify-center text-amber-400 font-bold hover:scale-110 transition-transform">
              <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            </div>
          `;

        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: iconHtml,
          iconSize: activeStop ? [36, 36] : [24, 24],
          iconAnchor: activeStop ? [18, 18] : [12, 12],
        });

        const marker = L.marker([node.lat, node.lng], { icon });
        marker.on('click', () => {
          if (onSelectChargingStation) {
            onSelectChargingStation(cs);
          }
        });
        marker.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <div class="flex items-center gap-1.5 ${activeStop ? 'text-amber-400' : 'text-amber-300'} font-bold mb-1">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
              <span>${cs.name}</span>
            </div>
            ${activeStop ? `
              <div class="mb-2 p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono">
                <strong class="text-amber-400 block font-sans">Mandatory Charging Stop</strong>
                Arrive: <span class="font-bold text-slate-100">${activeStop.arrivalSoc}%</span> · Target: <span class="font-bold text-emerald-400">${activeStop.targetSoc}%</span><br/>
                Added: <span class="text-amber-300 font-bold">+${activeStop.energyAddedKwh} kWh</span> (${activeStop.chargingTimeMin}m)
              </div>
            ` : ''}
            <div class="space-y-0.5 text-slate-400">
              <div><strong class="text-slate-200">Power:</strong> <span class="font-bold text-amber-400">${cs.powerKw} kW DC Fast</span></div>
              <div><strong class="text-slate-200">Plugs:</strong> ${cs.connectorTypes.join(', ')} (${cs.availablePorts}/${cs.totalPorts} free)</div>
              <div><strong class="text-slate-200">Tariff:</strong> ₹${cs.pricePerKwh}/kWh</div>
            </div>
            <button 
              type="button" 
              class="mt-2 w-full py-1 px-2 rounded bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider"
            >
              Click for Cockpit Details
            </button>
          </div>
        `);
        markersLayerRef.current?.addLayer(marker);
      }
    });

    // Render Weather Overlay markers along the active route
    weatherLayerRef.current?.clearLayers();
    if (showWeather && weather && activeRoute.polyline.length > 0) {
      const step = Math.max(1, Math.floor(activeRoute.polyline.length / 3));
      for (let i = Math.floor(step / 2); i < activeRoute.polyline.length; i += step) {
        const pt = activeRoute.polyline[i];
        const wIcon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div class="px-2 py-1 rounded-lg bg-black/85 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <svg class="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              <span>${weather.temperatureC}°C · ${weather.windSpeedKmh}km/h</span>
            </div>
          `,
          iconSize: [110, 24],
          iconAnchor: [55, 12],
        });
        weatherLayerRef.current?.addLayer(L.marker(pt, { icon: wIcon, interactive: false }));
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [routes, activeRoute, nodes, isDriving, showChargers, showTraffic, showGradients, showWeather, weather, onSelectChargingStation]);

  // Live Vehicle Position Marker during Driving
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isDriving) {
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
      }
      return;
    }

    const vehicleIcon = L.divIcon({
      className: 'vehicle-marker-pulse',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 rounded-full bg-emerald-400 opacity-60 animate-ping"></span>
          <div class="relative w-8 h-8 rounded-full bg-slate-900 border-2 border-emerald-400 shadow-xl flex items-center justify-center text-emerald-400">
            <svg class="w-4 h-4 fill-emerald-400" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([telemetry.currentLat, telemetry.currentLng], {
        icon: vehicleIcon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      vehicleMarkerRef.current.setLatLng([telemetry.currentLat, telemetry.currentLng]);
    }
  }, [telemetry.currentLat, telemetry.currentLng, isDriving]);

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl`}>
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5">
        {/* Recenter button */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-8 h-8 rounded-lg bg-[#0e111a]/90 hover:bg-[#181d2a] border border-white/[0.1] text-slate-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
          title="Recenter Map Bounds"
        >
          <Crosshair className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-8 h-8 rounded-lg bg-[#0e111a]/90 hover:bg-[#181d2a] border border-white/[0.1] text-slate-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-8 h-8 rounded-lg bg-[#0e111a]/90 hover:bg-[#181d2a] border border-white/[0.1] text-slate-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Traffic toggle */}
        <button
          type="button"
          onClick={() => setShowTraffic(prev => !prev)}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
            showTraffic
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
              : 'bg-[#0e111a]/90 border-white/[0.1] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Traffic Highlight"
        >
          <Activity className="w-3.5 h-3.5" />
        </button>

        {/* Chargers toggle */}
        <button
          type="button"
          onClick={() => setShowChargers(prev => !prev)}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
            showChargers
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-[#0e111a]/90 border-white/[0.1] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Charging Stations"
        >
          <Zap className="w-3.5 h-3.5" />
        </button>

        {/* Weather overlay toggle */}
        <button
          type="button"
          onClick={() => setShowWeather(prev => !prev)}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-lg transition-colors cursor-pointer ${
            showWeather
              ? 'bg-blue-500/20 border-blue-500/40 text-cyan-300'
              : 'bg-[#0e111a]/90 border-white/[0.1] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Weather & Wind Overlays"
        >
          <CloudSun className="w-3.5 h-3.5" />
        </button>

        {/* Map Style Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            className="w-8 h-8 rounded-lg bg-[#0e111a]/90 hover:bg-[#181d2a] border border-white/[0.1] text-slate-200 flex items-center justify-center shadow-lg transition-colors cursor-pointer"
            title="Map Tile Style"
          >
            <Layers className="w-3.5 h-3.5 text-slate-300" />
          </button>

          {isStyleMenuOpen && (
            <div className="absolute right-9 top-0 w-44 bg-[#0e1118] backdrop-blur-md border border-white/[0.1] rounded-lg p-1.5 shadow-2xl space-y-1 z-30 font-sans">
              {Object.values(OSM_STYLES).map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setActiveOsmStyle(style.id);
                    setIsStyleMenuOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    activeOsmStyle === style.id
                      ? 'bg-white/[0.08] text-emerald-400 font-semibold'
                      : 'text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-[11px]">{style.label}</span>
                  {activeOsmStyle === style.id && <Check className="w-3 h-3 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Active Trajectory Tag (Top Left) */}
      <div className="absolute top-4 left-4 z-20 bg-[#0c0e14]/90 backdrop-blur-md border border-white/[0.08] rounded-lg px-3 py-2 shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span 
            className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor]"
            style={{ color: activeRoute?.color || '#10b981', backgroundColor: activeRoute?.color || '#10b981' }}
          />
          <span className="text-xs font-semibold text-slate-100">{activeRoute?.name}</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          OSM Verified
        </span>
      </div>

      {/* Primary Automotive Telemetry Bar at Bottom of Map */}
      <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#0c0e14]/92 backdrop-blur-md border border-white/[0.08] rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-6">
          {/* Distance */}
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Distance</span>
            <span className="text-sm font-bold text-slate-100">{activeRoute.totalDistanceKm} km</span>
          </div>

          {/* Time */}
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Travel Time</span>
            <span className="text-sm font-bold text-slate-100">
              {Math.floor(activeRoute.totalTravelTimeMin / 60)}h {activeRoute.totalTravelTimeMin % 60}m
            </span>
          </div>

          {/* Predicted Energy */}
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Predicted Energy</span>
            <span className="text-sm font-bold text-emerald-400">{activeRoute.totalEnergyKwh} kWh</span>
          </div>

          {/* Arrival SOC */}
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-sans">Arrival SOC</span>
            <span className={`text-sm font-bold ${activeRoute.arrivalSoc <= 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {activeRoute.arrivalSoc}%
            </span>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block text-[11px]">
            <span className="text-slate-400">Consumption: </span>
            <span className="text-slate-200 font-semibold">{activeRoute.averageWhPerKm} Wh/km</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold font-sans ${
            !activeRoute.isFeasible 
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300' 
              : activeRoute.chargingStops.length > 0 
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              !activeRoute.isFeasible ? 'bg-rose-400' : activeRoute.chargingStops.length > 0 ? 'bg-amber-400' : 'bg-emerald-400'
            }`} />
            <span>
              {!activeRoute.isFeasible 
                ? 'DESTINATION UNREACHABLE' 
                : activeRoute.chargingStops.length > 0 
                  ? 'CHARGING RECOMMENDED' 
                  : 'ROUTE FEASIBLE'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
