import { CONFIG } from './config.js';
import { utils } from './utils.js';

export class Road {
    constructor(direction, intersection) {
        this.direction = direction;
        this.intersection = intersection;
        this.lanes = {
            left: [],
            right: []
        };
        this.laneWidth = CONFIG.LANE_WIDTH;
    }

    addVehicle(vehicle, lane = null) {
        const targetLane = lane || vehicle.lane || 'right';
        if (this.lanes[targetLane]) {
            this.lanes[targetLane].push(vehicle);
            vehicle.lane = targetLane;
        }
    }

    removeVehicle(vehicle) {
        Object.keys(this.lanes).forEach(laneKey => {
            const index = this.lanes[laneKey].indexOf(vehicle);
            if (index !== -1) {
                this.lanes[laneKey].splice(index, 1);
            }
        });
    }

    getVehiclesInLane(lane) {
        return this.lanes[lane] || [];
    }

    getAllVehicles() {
        return [...this.lanes.left, ...this.lanes.right];
    }

    canChangeLanes(vehicle, targetLane) {
        if (!this.lanes[targetLane]) return false;
        
        const vehiclesInTargetLane = this.lanes[targetLane];
        const safeDistance = 40; // Minimum safe distance
        
        // Check for conflicts in target lane
        for (const otherVehicle of vehiclesInTargetLane) {
            const distance = this.getDistanceBetweenVehicles(vehicle, otherVehicle);
            if (distance < safeDistance) {
                return false;
            }
        }
        
        return true;
    }

    getDistanceBetweenVehicles(vehicle1, vehicle2) {
        return utils.getDistance(vehicle1.x, vehicle1.y, vehicle2.x, vehicle2.y);
    }

    performLaneChange(vehicle, targetLane) {
        if (!this.canChangeLanes(vehicle, targetLane)) {
            return false;
        }
        
        // Remove from current lane
        this.removeVehicle(vehicle);
        
        // Add to target lane
        this.addVehicle(vehicle, targetLane);
        
        return true;
    }

    getOptimalLaneForTurn(turnType) {
        switch (turnType) {
            case CONFIG.TURN_TYPES.LEFT:
                return 'left';
            case CONFIG.TURN_TYPES.RIGHT:
                return 'right';
            case CONFIG.TURN_TYPES.STRAIGHT:
            default:
                // For straight, either lane is fine, choose less congested
                const leftCount = this.lanes.left.length;
                const rightCount = this.lanes.right.length;
                return leftCount <= rightCount ? 'left' : 'right';
        }
    }

    getLanePosition(lane) {
        const laneOffset = this.laneWidth / 4; // Quarter lane width from center
        
        switch (this.direction) {
            case CONFIG.DIRECTIONS.NORTH:
            case CONFIG.DIRECTIONS.SOUTH:
                return {
                    left: this.intersection.centerX - laneOffset,
                    right: this.intersection.centerX + laneOffset
                };
            case CONFIG.DIRECTIONS.EAST:
            case CONFIG.DIRECTIONS.WEST:
                return {
                    left: this.intersection.centerY - laneOffset,
                    right: this.intersection.centerY + laneOffset
                };
            default:
                return { left: 0, right: 0 };
        }
    }

    getSpawnPosition(lane) {
        const lanePositions = this.getLanePosition(lane);
        const laneCenter = lanePositions[lane];
        
        switch (this.direction) {
            case CONFIG.DIRECTIONS.NORTH:
                return { x: laneCenter, y: 0 };
            case CONFIG.DIRECTIONS.EAST:
                return { x: CONFIG.CANVAS_WIDTH, y: laneCenter };
            case CONFIG.DIRECTIONS.SOUTH:
                return { x: laneCenter, y: CONFIG.CANVAS_HEIGHT };
            case CONFIG.DIRECTIONS.WEST:
                return { x: 0, y: laneCenter };
            default:
                return { x: 0, y: 0 };
        }
    }

    update(deltaTime) {
        // Update all vehicles in all lanes
        Object.keys(this.lanes).forEach(laneKey => {
            this.lanes[laneKey].forEach(vehicle => {
                // Road-specific updates can go here
                // For now, vehicles handle their own updates
            });
        });
    }

    render(ctx) {
        // Render lane markings
        this.renderLaneMarkings(ctx);
    }

    renderLaneMarkings(ctx) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        const lanePositions = this.getLanePosition('center');
        
        // Draw center line between lanes
        switch (this.direction) {
            case CONFIG.DIRECTIONS.NORTH:
            case CONFIG.DIRECTIONS.SOUTH:
                ctx.beginPath();
                ctx.moveTo(this.intersection.centerX, 0);
                ctx.lineTo(this.intersection.centerX, CONFIG.CANVAS_HEIGHT);
                ctx.stroke();
                break;
            case CONFIG.DIRECTIONS.EAST:
            case CONFIG.DIRECTIONS.WEST:
                ctx.beginPath();
                ctx.moveTo(0, this.intersection.centerY);
                ctx.lineTo(CONFIG.CANVAS_WIDTH, this.intersection.centerY);
                ctx.stroke();
                break;
        }
        
        ctx.setLineDash([]);
    }
}

export class RoadNetwork {
    constructor(intersection) {
        this.intersection = intersection;
        this.roads = {};
        
        // Create roads for each direction
        Object.values(CONFIG.DIRECTIONS).forEach(direction => {
            this.roads[direction] = new Road(direction, intersection);
        });
    }

    getRoad(direction) {
        return this.roads[direction];
    }

    addVehicleToRoad(vehicle, direction, lane = null) {
        const road = this.getRoad(direction);
        if (road) {
            road.addVehicle(vehicle, lane);
        }
    }

    removeVehicleFromRoad(vehicle, direction) {
        const road = this.getRoad(direction);
        if (road) {
            road.removeVehicle(vehicle);
        }
    }

    transferVehicle(vehicle, fromDirection, toDirection, toLane = null) {
        this.removeVehicleFromRoad(vehicle, fromDirection);
        this.addVehicleToRoad(vehicle, toDirection, toLane);
    }

    getAllVehicles() {
        const allVehicles = [];
        Object.values(this.roads).forEach(road => {
            allVehicles.push(...road.getAllVehicles());
        });
        return allVehicles;
    }

    update(deltaTime) {
        Object.values(this.roads).forEach(road => {
            road.update(deltaTime);
        });
    }

    render(ctx) {
        Object.values(this.roads).forEach(road => {
            road.render(ctx);
        });
    }
}