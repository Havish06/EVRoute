import { GraphEdge, GraphNode } from '../types';
import osmGeometriesData from '../data/osmRoadGeometries.json';

export interface OsmEdgeData {
  waypoints: [number, number][];
  distanceKm: number;
  durationMin: number;
}

const OSM_GEOMETRIES: Record<string, OsmEdgeData> = (osmGeometriesData as unknown) as Record<string, OsmEdgeData>;

// In-memory cache for live fetched OSRM routes
const liveOsmCache = new Map<string, { coordinates: [number, number][]; distanceKm: number; durationMin: number }>();

/**
 * Returns genuine OpenStreetMap road waypoints for a graph edge.
 * Uses pre-computed high-resolution OSRM road geometry if available, or falls back to edge waypoints.
 * Automatically handles key aliases and ensures waypoints match the direction of traversal.
 */
export function getOsmRoadWaypoints(edgeId: string, fallback: [number, number][] = []): [number, number][] {
  // Direct lookup
  let osmData = OSM_GEOMETRIES[edgeId];

  // Alias lookup if not found directly
  if (!osmData) {
    const aliasKey = edgeId
      .replace('hairpin10', 'hairpin')
      .replace('hairpin', 'hairpin10')
      .replace('mysore', 'mysuru')
      .replace('mysuru', 'mysore');
    osmData = OSM_GEOMETRIES[aliasKey];
  }

  if (osmData && osmData.waypoints && osmData.waypoints.length > 0) {
    const waypoints = osmData.waypoints;
    // Check orientation if fallback coordinates exist
    if (fallback && fallback.length >= 2) {
      const startPt = fallback[0];
      const wpStart = waypoints[0];
      const wpEnd = waypoints[waypoints.length - 1];

      const distToStart = Math.hypot(startPt[0] - wpStart[0], startPt[1] - wpStart[1]);
      const distToEnd = Math.hypot(startPt[0] - wpEnd[0], startPt[1] - wpEnd[1]);

      // If the edge starts closer to wpEnd, reverse waypoints to match traversal direction
      if (distToEnd < distToStart) {
        return [...waypoints].reverse();
      }
    }
    return waypoints;
  }
  return fallback;
}

/**
 * Reconciles graph edges with accurate OpenStreetMap road waypoints and surveyed road distances.
 */
export function reconcileEdgesWithOsm(edges: GraphEdge[]): GraphEdge[] {
  return edges.map((edge) => {
    const osmData = OSM_GEOMETRIES[edge.id];
    if (osmData && osmData.waypoints && osmData.waypoints.length > 0) {
      return {
        ...edge,
        waypoints: osmData.waypoints,
        distanceKm: osmData.distanceKm > 0 ? osmData.distanceKm : edge.distanceKm,
      };
    }
    return edge;
  });
}

/**
 * Queries OpenStreetMap OSRM public routing API to fetch live turn-by-turn road geometry.
 * @param coordinates Array of [lat, lng] coordinates in order of traversal.
 */
export async function fetchLiveOsmRoute(
  coordinates: [number, number][]
): Promise<{ coordinates: [number, number][]; distanceKm: number; durationMin: number } | null> {
  if (coordinates.length < 2) return null;

  // Build cache key
  const cacheKey = coordinates
    .map((c) => `${c[0].toFixed(4)},${c[1].toFixed(4)}`)
    .join(';');

  if (liveOsmCache.has(cacheKey)) {
    return liveOsmCache.get(cacheKey)!;
  }

  try {
    // OSRM expects coordinates in lng,lat format
    const coordString = coordinates.map((c) => `${c[1]},${c[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      return null;
    }

    const route = data.routes[0];
    // GeoJSON coordinates are [lng, lat], convert to [lat, lng] for Leaflet
    const latLngCoordinates: [number, number][] = route.geometry.coordinates.map(
      (pt: [number, number]) => [Number(pt[1].toFixed(6)), Number(pt[0].toFixed(6))]
    );

    const result = {
      coordinates: latLngCoordinates,
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      durationMin: Number((route.duration / 60).toFixed(0)),
    };

    liveOsmCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.warn('Live OpenStreetMap route query skipped or timed out, using high-res local road cache:', error);
    return null;
  }
}

/**
 * Enriches a computed route option with full OpenStreetMap road network geometry.
 */
export function buildContinuousOsmPolyline(
  pathNodeIds: string[],
  edges: GraphEdge[],
  nodeMap: Map<string, GraphNode>
): [number, number][] {
  const fullPolyline: [number, number][] = [];

  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const fromId = pathNodeIds[i];
    const toId = pathNodeIds[i + 1];

    const edge = edges.find((e) => e.fromNodeId === fromId && e.toNodeId === toId);
    let edgeWaypoints: [number, number][] = [];

    if (edge) {
      edgeWaypoints = getOsmRoadWaypoints(edge.id, edge.waypoints);
    } else {
      const fromNode = nodeMap.get(fromId);
      const toNode = nodeMap.get(toId);
      if (fromNode && toNode) {
        edgeWaypoints = [
          [fromNode.lat, fromNode.lng],
          [toNode.lat, toNode.lng],
        ];
      }
    }

    if (edgeWaypoints.length > 0) {
      if (fullPolyline.length === 0) {
        fullPolyline.push(...edgeWaypoints);
      } else {
        fullPolyline.push(...edgeWaypoints.slice(1));
      }
    }
  }

  return fullPolyline;
}
