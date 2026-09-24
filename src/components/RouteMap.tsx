import React, { FC, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Check, Map as MapIcon } from 'lucide-react';
import { RouteOption, GraphNode, ChargingStation, TelemetryState } from '../types';

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
  osm_standard: {
    id: 'osm_standard',
    label: 'OSM Standard',
    tag: 'OpenStreetMap',
    url: `https://api.maptiler.com/maps/openstreetmap/256/{z}/{x}/{y}.jpg?key=${OSM_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">MapTiler</a>',
    maxZoom: 19,
  },
  osm_streets: {
    id: 'osm_streets',
    label: 'OSM Streets v2',
    tag: 'High-Res Roads',
    url: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${OSM_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">MapTiler</a>',
    maxZoom: 19,
  },
  osm_dark: {
    id: 'osm_dark',
    label: 'OSM Night Drive',
    tag: 'High Contrast',
    url: `https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=${OSM_API_KEY}`,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://www.maptiler.com/" target="_blank" rel="noopener noreferrer">MapTiler</a>',
    maxZoom: 19,
  },
  osm_official: {
    id: 'osm_official',
    label: 'Standard OSM.org',
    tag: 'Direct OSM Tiles',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
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
}

export const RouteMap: FC<RouteMapProps> = ({
  routes,
  activeRoute,
  onSelectRoute,
  nodes,
  telemetry,
  isDriving,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  const [activeOsmStyle, setActiveOsmStyle] = useState<OsmMapStyle>('osm_standard');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

  // Initialize Map with OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [12.2, 79.0],
      zoom: 8,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial OpenStreetMap tile layer using API key
    const initialConfig = OSM_STYLES[activeOsmStyle];
    const tileLayer = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      maxZoom: initialConfig.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    polylinesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when user selects a different OpenStreetMap style
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

    // Ensure tile layer stays beneath markers and vector route polylines
    newTileLayer.bringToBack();
    tileLayerRef.current = newTileLayer;
  }, [activeOsmStyle]);

  // Update routes, polylines, and markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !polylinesLayerRef.current || !markersLayerRef.current) return;

    polylinesLayerRef.current.clearLayers();
    markersLayerRef.current.clearLayers();

    if (!activeRoute || routes.length === 0) return;

    // Draw alternative routes first (behind active route)
    routes.forEach((route) => {
      const isSelected = route.id === activeRoute.id;
      if (!isSelected && route.polyline.length > 0) {
        const polyline = L.polyline(route.polyline, {
          color: route.color || '#94a3b8',
          weight: 4,
          opacity: 0.5,
          dashArray: '6, 6',
        });

        polyline.bindTooltip(`
          <div class="text-xs p-1">
            <strong>${route.name}</strong><br/>
            ${route.totalDistanceKm} km · ${Math.floor(route.totalTravelTimeMin / 60)}h ${route.totalTravelTimeMin % 60}m<br/>
            Energy: ${route.totalEnergyKwh} kWh
          </div>
        `, { sticky: true });

        polyline.on('click', () => {
          onSelectRoute(route);
        });

        polylinesLayerRef.current?.addLayer(polyline);
      }
    });

    // Draw active route with high-contrast glowing casing and primary color
    if (activeRoute.polyline.length > 0) {
      // Glow casing
      const casing = L.polyline(activeRoute.polyline, {
        color: '#022c22',
        weight: 9,
        opacity: 0.4,
      });
      polylinesLayerRef.current.addLayer(casing);

      // Core line
      const activePolyline = L.polyline(activeRoute.polyline, {
        color: activeRoute.color || '#10b981',
        weight: 5,
        opacity: 0.95,
      });

      activePolyline.bindTooltip(`
        <div class="text-xs p-1 font-sans">
          <strong class="text-emerald-700 font-bold">${activeRoute.name}</strong><br/>
          <strong>Distance:</strong> ${activeRoute.totalDistanceKm} km<br/>
          <strong>Predicted Energy:</strong> ${activeRoute.totalEnergyKwh} kWh<br/>
          <strong>Arrival Battery:</strong> ${activeRoute.arrivalSoc}%
        </div>
      `, { sticky: true });

      polylinesLayerRef.current.addLayer(activePolyline);

      // Fit bounds if not actively driving
      if (!isDriving) {
        map.fitBounds(activePolyline.getBounds(), { padding: [40, 40] });
      }
    }

    // Add Node Markers (Origin, Destination, Chargers)
    nodes.forEach((node) => {
      if (node.isOrigin) {
        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([node.lat, node.lng], { icon });
        marker.bindPopup(`
          <div class="text-xs p-1">
            <span class="font-bold text-emerald-600 block">SOURCE / ORIGIN</span>
            <strong>${node.name}</strong><br/>
            Elevation: ${node.elevationM} m
          </div>
        `);
        markersLayerRef.current?.addLayer(marker);
      } else if (node.isDestination) {
        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: `
            <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([node.lat, node.lng], { icon });
        marker.bindPopup(`
          <div class="text-xs p-1">
            <span class="font-bold text-rose-600 block">DESTINATION</span>
            <strong>${node.name}</strong><br/>
            Summit Elevation: ${node.elevationM} m
          </div>
        `);
        markersLayerRef.current?.addLayer(marker);
      } else if (node.chargingStation) {
        const cs = node.chargingStation;
        // Check if this station is an active mandatory charging stop in the current route
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
            <div class="w-7 h-7 rounded-full bg-slate-800 border-2 border-amber-400/80 shadow-md flex items-center justify-center text-amber-400 font-bold hover:scale-110 transition-transform">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            </div>
          `;

        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: iconHtml,
          iconSize: activeStop ? [36, 36] : [28, 28],
          iconAnchor: activeStop ? [18, 18] : [14, 14],
        });

        const marker = L.marker([node.lat, node.lng], { icon });
        marker.bindPopup(`
          <div class="text-xs p-1 font-sans">
            <div class="flex items-center gap-1.5 ${activeStop ? 'text-amber-500' : 'text-amber-400'} font-bold mb-1">
              <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
              <span>${cs.name}</span>
            </div>
            ${activeStop ? `
              <div class="mb-2 p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono">
                <strong class="text-amber-400 block font-sans">⚡ Mandatory Injected Stop</strong>
                Arrive: <span class="font-bold text-slate-100">${activeStop.arrivalSoc}%</span> ➔ Charge to: <span class="font-bold text-emerald-400">${activeStop.targetSoc}%</span><br/>
                Energy Added: <span class="text-amber-300 font-bold">+${activeStop.energyAddedKwh} kWh</span> (${activeStop.chargingTimeMin} mins)
              </div>
            ` : ''}
            <div class="space-y-0.5 text-slate-400">
              <div><strong class="text-slate-200">Operator:</strong> ${cs.operator}</div>
              <div><strong class="text-slate-200">Speed:</strong> <span class="font-bold text-amber-400">${cs.powerKw} kW DC Fast</span></div>
              <div><strong class="text-slate-200">Plugs:</strong> ${cs.connectorTypes.join(', ')} (${cs.availablePorts}/${cs.totalPorts} available)</div>
              <div><strong class="text-slate-200">Tariff:</strong> ₹${cs.pricePerKwh} / kWh</div>
              <div class="text-[10px] text-slate-500 mt-1">Amenities: ${cs.amenities.join(' · ')}</div>
            </div>
          </div>
        `);
        markersLayerRef.current?.addLayer(marker);
      } else {
        // Minor waypoint dot
        const icon = L.divIcon({
          className: 'custom-map-icon',
          html: `<div class="w-2.5 h-2.5 rounded-full bg-slate-600 border border-white/80"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        const marker = L.marker([node.lat, node.lng], { icon });
        marker.bindTooltip(`${node.name} (${node.elevationM}m)`, { direction: 'top', offset: [0, -5] });
        markersLayerRef.current?.addLayer(marker);
      }
    });

    // Invalidate size to guarantee smooth render in tabs / iframes
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [routes, activeRoute, nodes, isDriving]);

  // Live Vehicle Position Marker during Telemetry Simulation
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
    <div className="relative w-full h-[460px] lg:h-[530px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Route Legend & Map Overlay */}
      <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-lg max-w-[260px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            A* Search Candidates
          </span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
            {routes.length} paths
          </span>
        </div>
        <div className="space-y-1.5">
          {routes.map((r) => {
            const isSelected = r.id === activeRoute.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRoute(r)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-white font-semibold ring-1 ring-emerald-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="truncate">{r.name.replace(' (Time Baseline)', '')}</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 flex-shrink-0 ml-2">
                  {r.totalEnergyKwh} kWh
                </span>
              </button>
            );
          })}
        </div>

        {/* OpenStreetMap Route Routing Status */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            OSM Road Network
          </span>
          <span className="font-mono text-slate-400">
            {activeRoute.polyline.length.toLocaleString()} road pts
          </span>
        </div>
      </div>

      {/* Map Legend Indicators at Bottom Left */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 shadow-lg text-[11px] flex items-center gap-3 text-slate-300 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Origin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Destination</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Fast DC Charger</span>
        </div>
      </div>

      {/* OpenStreetMap Layer Switcher */}
      <div className="absolute top-4 right-14 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl shadow-lg text-xs font-semibold transition-all hover:border-slate-700 cursor-pointer"
            title="Switch OpenStreetMap Layer Style"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{OSM_STYLES[activeOsmStyle].label}</span>
          </button>

          {isStyleMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl space-y-1 z-30">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1 flex items-center justify-between">
                <span>OpenStreetMap Tiles</span>
                <span className="text-emerald-400 font-mono text-[9px]">API Active</span>
              </div>
              {Object.values(OSM_STYLES).map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setActiveOsmStyle(style.id);
                    setIsStyleMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    activeOsmStyle === style.id
                      ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-medium">{style.label}</div>
                    <div className="text-[10px] text-slate-500">{style.tag}</div>
                  </div>
                  {activeOsmStyle === style.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
