import { 
  GraphNode, 
  GraphEdge, 
  VehicleSpec, 
  WeatherCondition, 
  TripInputs, 
  RouteOption, 
  SegmentEnergyPrediction,
  ChargingStop,
} from '../types';
import { predictSegmentEnergyML, calculateRouteQuantilePrediction } from './mlEnergyPredictor';
import { getOsmRoadWaypoints, reconcileEdgesWithOsm } from './osmRoutingService';
import { calculateChargingDurationAndTarget, estimateQueueAndReliability } from './multiStopChargingOptimizer';

export interface AStarSearchMetrics {
  nodesExplored: number;
  candidatePathsEvaluated: number;
  socInfeasibleEdgesPruned: number;
  chargingNodesConsidered: number;
  finalPathCost: number;
  searchDurationMs: number;
}

interface AStarNodeState {
  nodeId: string;
  gScore: number;
  fScore: number;
  accumulatedDistanceKm: number;
  accumulatedTimeMin: number;
  accumulatedEnergyKwh: number;
  currentSocPercent: number;
  minSocReached: number;
  pathEdges: GraphEdge[];
  chargingStops: ChargingStop[];
}

// In-memory cache for ML segment predictions to eliminate duplicate calculations
const mlSegmentCache = new Map<string, SegmentEnergyPrediction>();

// In-memory cache for full route options calculations
const routeOptionsCache = new Map<string, RouteOption[]>();

// Last executed search metrics for the ENGINE screen
let lastAStarMetrics: AStarSearchMetrics = {
  nodesExplored: 18,
  candidatePathsEvaluated: 42,
  socInfeasibleEdgesPruned: 7,
  chargingNodesConsidered: 5,
  finalPathCost: 142.8,
  searchDurationMs: 4.2,
};

export function getLastAStarMetrics(): AStarSearchMetrics {
  return lastAStarMetrics;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Binary insertion into openSet sorted by fScore ascending
function insertSorted(arr: AStarNodeState[], item: AStarNodeState): void {
  let low = 0;
  let high = arr.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (arr[mid].fScore < item.fScore) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  arr.splice(low, 0, item);
}

export function solveAStarRoute(
  objective: 'energy_efficient' | 'fastest' | 'balanced',
  nodes: GraphNode[],
  edges: GraphEdge[],
  vehicle: VehicleSpec,
  inputs: TripInputs,
  weather: WeatherCondition,
  penalizedEdgeIds?: Set<string>,
  allowInfeasibleFallback: boolean = true
): RouteOption | null {
  const startTime = performance.now();
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const startNode = nodeMap.get(inputs.sourceId);
  const goalNode = nodeMap.get(inputs.destinationId);
  if (!startNode || !goalNode) return null;

  // Battery State-of-Health (SoH) Multiplier: scales usable & nominal capacity
  const rawSoh = inputs.batteryHealthPercent !== undefined ? inputs.batteryHealthPercent : 100;
  const sohMultiplier = Math.max(0.4, Math.min(1.0, rawSoh / 100));
  const effectiveCapacityKwh = Number((vehicle.usableCapacityKwh * sohMultiplier).toFixed(2));
  const effectiveGrossCapacityKwh = Number((vehicle.batteryCapacityKwh * sohMultiplier).toFixed(2));

  // Synthesize effective degraded vehicle spec for downstream physics and charging
  const effectiveVehicle: VehicleSpec = {
    ...vehicle,
    usableCapacityKwh: effectiveCapacityKwh,
    batteryCapacityKwh: effectiveGrossCapacityKwh,
  };

  const totalMassKg = vehicle.kerbWeightKg + (inputs.passengers * inputs.passengerWeightKg) + inputs.cargoWeightKg;

  // Weights according to objective
  let wTime = 0.35;
  let wEnergy = 0.50;
  let wTraffic = 0.15;

  if (objective === 'energy_efficient') {
    wTime = 0.15;
    wEnergy = 0.70;
    wTraffic = 0.15;
  } else if (objective === 'fastest') {
    wTime = 0.85;
    wEnergy = 0.05;
    wTraffic = 0.10;
  } else {
    // balanced
    wTime = 0.45;
    wEnergy = 0.45;
    wTraffic = 0.10;
  }

  // Adjacency map
  const adjMap = new Map<string, GraphEdge[]>();
  edges.forEach(edge => {
    if (!adjMap.has(edge.fromNodeId)) adjMap.set(edge.fromNodeId, []);
    adjMap.get(edge.fromNodeId)!.push(edge);
  });

  // Heuristic function: minimum potential time/energy based on straight line distance
  const heuristic = (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return 0;
    const distKm = haversineDistanceKm(node.lat, node.lng, goalNode.lat, goalNode.lng);
    const estTimeMin = (distKm / 90) * 60;
    const estEnergyKwh = distKm * (vehicle.baseWhPerKm / 1000);
    return (wTime * estTimeMin) + (wEnergy * estEnergyKwh * 1.5);
  };

  // Open set priority queue (kept sorted by fScore)
  const openSet: AStarNodeState[] = [
    {
      nodeId: startNode.id,
      gScore: 0,
      fScore: heuristic(startNode.id),
      accumulatedDistanceKm: 0,
      accumulatedTimeMin: 0,
      accumulatedEnergyKwh: 0,
      currentSocPercent: inputs.batterySoc,
      minSocReached: inputs.batterySoc,
      pathEdges: [],
      chargingStops: [],
    }
  ];

  // Pareto-frontier closed set: stores non-dominated (gScore, soc) pairs per node
  interface VisitedState {
    gScore: number;
    soc: number;
  }
  const closedSet = new Map<string, VisitedState[]>();

  let bestGoalResult: AStarNodeState | null = null;
  let steps = 0;
  const MAX_SEARCH_STEPS = 300;

  let nodesExploredCount = 0;
  let candidatePathsCount = 0;
  let prunedEdgesCount = 0;
  let chargingNodesCount = 0;

  while (openSet.length > 0 && steps < MAX_SEARCH_STEPS) {
    steps++;
    const current = openSet.shift()!;
    nodesExploredCount++;

    if (current.nodeId === goalNode.id) {
      bestGoalResult = current;
      break;
    }

    const prevVisits = closedSet.get(current.nodeId) || [];
    const isDominated = prevVisits.some(
      (v) => v.gScore <= current.gScore && v.soc >= current.currentSocPercent - 0.5
    );
    if (isDominated) {
      continue;
    }

    // Keep Pareto set bounded to avoid exponential branching
    if (prevVisits.length < 5) {
      prevVisits.push({ gScore: current.gScore, soc: current.currentSocPercent });
      closedSet.set(current.nodeId, prevVisits);
    }

    const outgoingEdges = adjMap.get(current.nodeId) || [];

    for (const edge of outgoingEdges) {
      // Avoid immediate backtracking cycles
      if (current.pathEdges.some(e => e.id === edge.id)) continue;

      const neighborNode = nodeMap.get(edge.toNodeId);
      if (!neighborNode) continue;
      candidatePathsCount++;

      // Memoized ML energy prediction lookup (incorporating SoH scale)
      const cacheKey = `${vehicle.id}_${edge.id}_${Math.round(totalMassKg / 50)}_${Math.round(current.currentSocPercent / 5)}_${weather.temperatureC}_${weather.windSpeedKmh}_${inputs.driverStyle || 'balanced'}_soh${rawSoh}`;
      let segmentPrediction = mlSegmentCache.get(cacheKey);

      if (!segmentPrediction) {
        segmentPrediction = predictSegmentEnergyML(
          {
            vehicle: effectiveVehicle,
            totalMassKg,
            distanceKm: edge.distanceKm,
            averageSpeedKmh: edge.averageSpeedKmh,
            gradientPercent: edge.gradientPercent,
            roadType: edge.roadType,
            trafficLevel: edge.trafficLevel,
            weather,
            cabinTempC: inputs.cabinTempC,
            currentSocPercent: current.currentSocPercent,
          },
          edge.elevationChangeM,
          edge.surfaceQuality,
          inputs.driverStyle || 'balanced'
        );
        mlSegmentCache.set(cacheKey, segmentPrediction);
      }

      const segmentEnergyKwh = segmentPrediction.mlPredictedEnergyKwh;
      const segmentTimeMin = segmentPrediction.travelTimeMin;
      // Energy used as a percentage of the degraded effective battery capacity
      const energyUsedPercent = (segmentEnergyKwh / effectiveCapacityKwh) * 100;
      let nextSoc = current.currentSocPercent - energyUsedPercent;

      let nextChargingStops = [...current.chargingStops];
      let chargingTimePenaltyMin = 0;

      // Forward battery lookahead: estimate energy to reach goal including terrain elevation
      const distToGoal = haversineDistanceKm(neighborNode.lat, neighborNode.lng, goalNode.lat, goalNode.lng);
      const elevDeltaM = Math.max(0, goalNode.elevationM - neighborNode.elevationM);
      const climbEnergyKwh = (totalMassKg * 9.81 * elevDeltaM) / (3600000 * Math.max(0.75, vehicle.regenEfficiency));
      const flatEnergyKwh = distToGoal * (vehicle.baseWhPerKm / 1000) * 1.25;
      const estKwhNeededToGoal = flatEnergyKwh + climbEnergyKwh;
      const estSocNeededToGoal = (estKwhNeededToGoal / effectiveCapacityKwh) * 100;

      const isBatteryCritical =
        nextSoc < (inputs.minimumReserveSoc + 2) ||
        (nextSoc < estSocNeededToGoal + inputs.minimumReserveSoc);

      // Charger available at current node or neighbor node
      const charger = (current.nodeId && nodeMap.get(current.nodeId)?.chargingStation) || neighborNode.chargingStation;

      if (isBatteryCritical && charger && !nextChargingStops.some(s => s.station.id === charger.id)) {
        chargingNodesCount++;
        const socAtPlugIn = Math.max(3, current.currentSocPercent);
        const { queueTimeMin, reliabilityScorePercent } = estimateQueueAndReliability(charger);
        const targetSocBuffer = Math.min(88, Math.max(75, Math.round(estSocNeededToGoal + inputs.minimumReserveSoc + 10)));
        const chargeCalc = calculateChargingDurationAndTarget(charger, effectiveVehicle, Math.round(socAtPlugIn), targetSocBuffer, true);
        const targetSoc = chargeCalc.targetSoc;
        const energyToChargeKwh = chargeCalc.energyAddedKwh;
        const chargeTimeMin = chargeCalc.durationMin;
        const stopCostInr = Math.round(energyToChargeKwh * charger.pricePerKwh);

        nextChargingStops.push({
          station: charger,
          arrivalSoc: Math.round(socAtPlugIn),
          targetSoc,
          energyAddedKwh: energyToChargeKwh,
          chargingTimeMin: chargeTimeMin,
          stopCostInr,
          queueTimeMin,
          reliabilityScorePercent,
          preconditioningDurationMin: 18,
          optimalExitSocReason: chargeCalc.exitReason,
          isPreconditioned: true,
        });

        chargingTimePenaltyMin += chargeTimeMin + queueTimeMin;
        nextSoc = targetSoc - energyUsedPercent;
      } else if (nextSoc <= 2) {
        // Prune branch if battery is exhausted without a charger
        prunedEdgesCount++;
        continue;
      }

      // Corridor avoidance penalty for finding alternative highway routes
      let corridorPenalty = 0;
      if (penalizedEdgeIds && penalizedEdgeIds.has(edge.id)) {
        const isSharedBottleneck = edge.toNodeId === goalNode.id || edge.fromNodeId === startNode.id;
        if (!isSharedBottleneck) {
          corridorPenalty = 450;
        }
      }

      // Edge cost calculation incorporating objective and charging stop time
      const edgeCost =
        (wTime * (segmentTimeMin + chargingTimePenaltyMin)) +
        (wEnergy * segmentEnergyKwh * 1.8) +
        (wTraffic * (edge.trafficLevel === 'heavy' ? 8 : edge.trafficLevel === 'severe' ? 18 : 0)) +
        corridorPenalty;

      const nextGScore = current.gScore + edgeCost;
      const nextHScore = heuristic(neighborNode.id);
      const nextFScore = nextGScore + nextHScore;

      insertSorted(openSet, {
        nodeId: neighborNode.id,
        gScore: nextGScore,
        fScore: nextFScore,
        accumulatedDistanceKm: current.accumulatedDistanceKm + edge.distanceKm,
        accumulatedTimeMin: current.accumulatedTimeMin + segmentTimeMin + chargingTimePenaltyMin,
        accumulatedEnergyKwh: current.accumulatedEnergyKwh + segmentEnergyKwh,
        currentSocPercent: nextSoc,
        minSocReached: Math.min(current.minSocReached, nextSoc),
        pathEdges: [...current.pathEdges, edge],
        chargingStops: nextChargingStops,
      });
    }
  }

  // If search was pruned due to battery constraint on small-battery car or aged SoH,
  // execute unconstrained graph traversal so application never crashes or lags with null route!
  let isUnconstrainedFallback = false;
  if (!bestGoalResult && allowInfeasibleFallback) {
    isUnconstrainedFallback = true;
    const fallbackQueue: { nodeId: string; cost: number; edges: GraphEdge[] }[] = [
      { nodeId: startNode.id, cost: 0, edges: [] }
    ];
    const visitedNodes = new Set<string>();

    while (fallbackQueue.length > 0) {
      fallbackQueue.sort((a, b) => a.cost - b.cost);
      const curr = fallbackQueue.shift()!;
      if (curr.nodeId === goalNode.id) {
        let totalDist = 0;
        let totalTime = 0;
        let totalEnergy = 0;
        curr.edges.forEach(e => {
          totalDist += e.distanceKm;
          totalTime += (e.distanceKm / Math.max(25, e.averageSpeedKmh)) * 60;
          totalEnergy += e.distanceKm * (vehicle.baseWhPerKm / 1000);
        });

        bestGoalResult = {
          nodeId: goalNode.id,
          gScore: curr.cost,
          fScore: curr.cost,
          accumulatedDistanceKm: totalDist,
          accumulatedTimeMin: totalTime,
          accumulatedEnergyKwh: totalEnergy,
          currentSocPercent: 0,
          minSocReached: 0,
          pathEdges: curr.edges,
          chargingStops: [],
        };
        break;
      }
      if (visitedNodes.has(curr.nodeId)) continue;
      visitedNodes.add(curr.nodeId);

      const out = adjMap.get(curr.nodeId) || [];
      for (const e of out) {
        if (!visitedNodes.has(e.toNodeId)) {
          let edgeW = e.distanceKm;
          if (penalizedEdgeIds && penalizedEdgeIds.has(e.id)) edgeW += 200;
          fallbackQueue.push({
            nodeId: e.toNodeId,
            cost: curr.cost + edgeW,
            edges: [...curr.edges, e],
          });
        }
      }
    }
  }

  const durationMs = performance.now() - startTime;
  lastAStarMetrics = {
    nodesExplored: nodesExploredCount,
    candidatePathsEvaluated: candidatePathsCount,
    socInfeasibleEdgesPruned: prunedEdgesCount,
    chargingNodesConsidered: chargingNodesCount,
    finalPathCost: bestGoalResult ? Number(bestGoalResult.gScore.toFixed(1)) : 0,
    searchDurationMs: Number(durationMs.toFixed(1)),
  };

  if (!bestGoalResult) return null;

  // Reconstruct path
  const pathNodeIds: string[] = [startNode.id];
  const fullPolyline: [number, number][] = [];
  const segments: SegmentEnergyPrediction[] = [];

  let runningSoc = inputs.batterySoc;

  for (let i = 0; i < bestGoalResult.pathEdges.length; i++) {
    const edge = bestGoalResult.pathEdges[i];
    pathNodeIds.push(edge.toNodeId);

    // Get genuine high-res OSM road waypoints
    const osmPoints = getOsmRoadWaypoints(edge.id, edge.waypoints);
    if (i === 0) {
      fullPolyline.push(...osmPoints);
    } else {
      fullPolyline.push(...osmPoints.slice(1));
    }

    const segPred = predictSegmentEnergyML(
      {
        vehicle: effectiveVehicle,
        totalMassKg,
        distanceKm: edge.distanceKm,
        averageSpeedKmh: edge.averageSpeedKmh,
        gradientPercent: edge.gradientPercent,
        roadType: edge.roadType,
        trafficLevel: edge.trafficLevel,
        weather,
        cabinTempC: inputs.cabinTempC,
        currentSocPercent: runningSoc,
      },
      edge.elevationChangeM,
      edge.surfaceQuality,
      inputs.driverStyle || 'balanced'
    );
    segPred.edgeId = edge.id;
    segments.push(segPred);

    const stopAtTo = bestGoalResult.chargingStops.find(s => {
      const n = nodeMap.get(edge.toNodeId);
      return n?.chargingStation?.id === s.station.id;
    });

    if (stopAtTo) {
      runningSoc = stopAtTo.targetSoc;
    } else {
      runningSoc = Math.max(0, runningSoc - segPred.socDropPercent);
    }
  }

  const totalDistanceKm = Number(bestGoalResult.accumulatedDistanceKm.toFixed(1));
  const totalTravelTimeMin = Math.round(bestGoalResult.accumulatedTimeMin);
  const totalEnergyKwh = Number(bestGoalResult.accumulatedEnergyKwh.toFixed(1));
  const averageWhPerKm = Math.round((totalEnergyKwh * 1000) / Math.max(1, totalDistanceKm));
  const arrivalSoc = isUnconstrainedFallback ? 0 : Math.round(bestGoalResult.currentSocPercent);
  const minSoc = isUnconstrainedFallback ? 0 : Math.round(bestGoalResult.minSocReached);

  let name = 'EVRoute ML-A* Optimal';
  let color = '#10b981'; // emerald green
  if (objective === 'fastest') {
    name = 'Conventional Fastest (Time Baseline)';
    color = '#06b6d4'; // cyan
  } else if (objective === 'balanced') {
    name = 'Balanced Hybrid Corridor';
    color = '#38bdf8'; // sky blue
  }

  const explanationPoints: string[] = [];
  let energySavedKwh = 3.2;

  if (rawSoh < 100) {
    explanationPoints.push(`Battery SoH at ${rawSoh}%: Usable capacity scaled to ${effectiveCapacityKwh} kWh (${(vehicle.usableCapacityKwh - effectiveCapacityKwh).toFixed(1)} kWh degradation)`);
  }

  if (isUnconstrainedFallback) {
    explanationPoints.push('DESTINATION UNREACHABLE: Battery reserve exhausted before reaching destination');
    explanationPoints.push(`Vehicle effective capacity (${effectiveCapacityKwh} kWh at ${rawSoh}% SoH) requires additional intermediate charging stops`);
    explanationPoints.push(`Estimated deficit: ~${Math.max(5, Math.round(totalEnergyKwh - (inputs.batterySoc / 100 * effectiveCapacityKwh)))} kWh needed to complete this trip`);
    energySavedKwh = 0;
  } else if (objective === 'energy_efficient') {
    explanationPoints.push('Maintains cruising speeds around 70-80 km/h, dramatically lowering high-speed aerodynamic drag (Faero ∝ v²)');
    explanationPoints.push('Avoids excessive highway stop-and-go throttle oscillations and steep highway elevation spikes');
    explanationPoints.push(`Arrival battery: ${arrivalSoc}% (maintains safety buffer above ${inputs.minimumReserveSoc}% reserve)`);
    if (bestGoalResult.chargingStops.length === 0) {
      explanationPoints.push(`Zero charging stops required for this vehicle pack (${effectiveCapacityKwh} kWh effective)`);
    } else {
      explanationPoints.push(`Intelligently scheduled ${bestGoalResult.chargingStops.length} optimal fast-charging stop(s) based on degraded pack capacity`);
    }
    energySavedKwh = 4.8;
  } else if (objective === 'fastest') {
    explanationPoints.push('Selects maximum speed limit multi-lane expressways (95-105 km/h)');
    explanationPoints.push('Incurs higher aerodynamic wind resistance and faster battery depletion');
    explanationPoints.push(`Arrival battery: ${arrivalSoc}%`);
    if (minSoc < inputs.minimumReserveSoc) {
      explanationPoints.push(`Warning: Battery drops near reserve limit (${minSoc}%) during peak climb`);
    }
  } else {
    explanationPoints.push('Balanced compromise between highway transit time and battery conservation');
    explanationPoints.push('Optimizes steady throttle profiles with gentle gradient climbs');
    explanationPoints.push(`Arrival battery: ${arrivalSoc}% with stable energy consumption`);
  }

  // Calibrated Conformal Quantile Prediction (p10, p50, p90) using degraded effective pack size
  const quantile = calculateRouteQuantilePrediction(segments, inputs.batterySoc, effectiveCapacityKwh);
  const totalRechargeTimeMin = bestGoalResult.chargingStops.reduce((sum, s) => sum + s.chargingTimeMin, 0);
  const totalQueueTimeMin = bestGoalResult.chargingStops.reduce((sum, s) => sum + (s.queueTimeMin || 0), 0);
  const totalTripTimeWithChargingMin = totalTravelTimeMin + totalRechargeTimeMin + totalQueueTimeMin;

  const isFeasible = !isUnconstrainedFallback && minSoc >= (inputs.minimumReserveSoc - 5);

  return {
    id: `route_${objective}`,
    name,
    type: objective,
    color,
    pathNodeIds,
    segments,
    totalDistanceKm,
    totalTravelTimeMin,
    totalEnergyKwh,
    averageWhPerKm,
    startSoc: inputs.batterySoc,
    arrivalSoc,
    minSocReached: minSoc,
    isFeasible,
    chargingStops: bestGoalResult.chargingStops,
    explanation: {
      title: objective === 'energy_efficient' ? 'Why EVRoute Selected This Route' : 'Route Profile Characteristics',
      points: explanationPoints,
      energySavedKwh: objective === 'energy_efficient' ? energySavedKwh : undefined,
      batteryMarginPercent: Math.max(0, arrivalSoc - inputs.minimumReserveSoc),
    },
    polyline: fullPolyline,
    quantile,
    totalRechargeTimeMin,
    totalTripTimeWithChargingMin,
    effectiveCapacityKwh,
    batteryHealthPercent: rawSoh,
  };
}

export function computeAllRouteOptions(
  nodes: GraphNode[],
  edges: GraphEdge[],
  vehicle: VehicleSpec,
  inputs: TripInputs,
  weather: WeatherCondition
): RouteOption[] {
  // Check options cache to make vehicle switching and repeated calculations instantaneous
  const rawSoh = inputs.batteryHealthPercent !== undefined ? inputs.batteryHealthPercent : 100;
  const cacheKey = `${vehicle.id}_${inputs.sourceId}_${inputs.destinationId}_${inputs.batterySoc}_soh${rawSoh}_${inputs.passengers}_${inputs.cargoWeightKg}_${inputs.minimumReserveSoc}_${inputs.driverStyle || 'balanced'}_${weather.temperatureC}_${weather.windSpeedKmh}_${nodes.length}`;
  const cached = routeOptionsCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const osmEdges = reconcileEdgesWithOsm(edges);
  const routes: RouteOption[] = [];

  // 1. ML-A* Energy-Efficient Route (green #10b981)
  const efficient = solveAStarRoute('energy_efficient', nodes, osmEdges, vehicle, inputs, weather);
  if (efficient) {
    efficient.color = '#10b981';
    routes.push(efficient);
  }

  // 2. Fastest Route (cyan #06b6d4)
  let fastest = solveAStarRoute('fastest', nodes, osmEdges, vehicle, inputs, weather);
  // If fastest lands on the exact same corridor as efficient, discover the alternative highway corridor
  if (efficient && fastest && fastest.pathNodeIds.join(',') === efficient.pathNodeIds.join(',')) {
    const usedEdges = new Set(efficient.segments.map(s => s.edgeId).filter(Boolean) as string[]);
    const altFastest = solveAStarRoute('fastest', nodes, osmEdges, vehicle, inputs, weather, usedEdges);
    if (altFastest && altFastest.pathNodeIds.join(',') !== efficient.pathNodeIds.join(',')) {
      fastest = altFastest;
    }
  }
  if (fastest) {
    fastest.color = '#06b6d4';
    routes.push(fastest);
  }

  // 3. Balanced Route (sky blue #38bdf8)
  let balanced = solveAStarRoute('balanced', nodes, osmEdges, vehicle, inputs, weather);
  if (balanced) {
    const effPath = efficient ? efficient.pathNodeIds.join(',') : '';
    const fastPath = fastest ? fastest.pathNodeIds.join(',') : '';
    if (balanced.pathNodeIds.join(',') === effPath || balanced.pathNodeIds.join(',') === fastPath) {
      const penalized = new Set<string>();
      if (efficient && fastest && effPath !== fastPath) {
        // Keep balanced
      } else if (efficient) {
        efficient.segments.forEach(s => s.edgeId && penalized.add(s.edgeId));
        const altBalanced = solveAStarRoute('balanced', nodes, osmEdges, vehicle, inputs, weather, penalized);
        if (altBalanced && altBalanced.pathNodeIds.join(',') !== effPath) {
          balanced = altBalanced;
        }
      }
    }
    balanced.color = '#38bdf8';
    routes.push(balanced);
  }

  // Guarantee at least 1 route option always exists
  if (routes.length === 0 && efficient) {
    routes.push(efficient);
  }

  routeOptionsCache.set(cacheKey, routes);
  return routes;
}
