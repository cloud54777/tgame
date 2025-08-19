import { CONFIG } from './config.js';
import { utils } from './utils.js';

export class Vehicle {
    constructor({ id, direction, intersection, route = null }) {
        this.id = id;
        this.fromDirection = direction;
        this.intersection = intersection;
        
        // Route and turning logic
        this.route = route || this.generateRandomRoute();
        this.turnType = this.calculateTurnType();
        this.toDirection = this.calculateToDirection();
        
        // Lane and position properties
        this.lane = this.assignInitialLane();
        this.v = 0; // Lateral position within lane (-1 to 1, 0 = center)
        this.targetLane = this.lane;
        this.laneChangeProgress = 0;
        this.isChangingLanes = false;
        
        // Position and movement
        const spawnPoint = intersection.getSpawnPoint(direction, this.lane);
        this.x = spawnPoint.x;
        this.y = spawnPoint.y;
        this.angle = this.getInitialAngle();
        
        // Trajectory following
        this.trajectoryProgress = 0;
        this.currentTrajectory = null;
        this.trajectoryStarted = false;
        
        // Properties
        this.speed = 0;
        this.maxSpeed = CONFIG.DEFAULT_SETTINGS.CAR_SPEED;
        this.width = CONFIG.CAR_WIDTH;
        this.height = CONFIG.CAR_HEIGHT;
        this.color = CONFIG.CAR_COLORS[Math.floor(Math.random() * CONFIG.CAR_COLORS.length)];
        
        // State
        this.state = 'approaching'; // approaching, lane_changing, waiting, turning, exiting, completed
        this.waitStartTime = null;
        this.totalWaitTime = 0;
        this.isInIntersection = false;
        
        // Pre-intersection preparation
        this.hasCheckedLaneChange = false;
        this.laneChangeDistance = 100; // Distance before intersection to change lanes
    }

    generateRandomRoute() {
        // Generate a random route (sequence of directions)
        const directions = [CONFIG.DIRECTIONS.NORTH, CONFIG.DIRECTIONS.EAST, CONFIG.DIRECTIONS.SOUTH, CONFIG.DIRECTIONS.WEST];
        const possibleDestinations = directions.filter(dir => dir !== this.fromDirection);
        const destination = possibleDestinations[Math.floor(Math.random() * possibleDestinations.length)];
        
        return [this.fromDirection, destination];
    }

    calculateTurnType() {
        if (!this.route || this.route.length < 2) return CONFIG.TURN_TYPES.STRAIGHT;
        
        const from = this.route[0];
        const to = this.route[1];
        
        const directions = [CONFIG.DIRECTIONS.NORTH, CONFIG.DIRECTIONS.EAST, CONFIG.DIRECTIONS.SOUTH, CONFIG.DIRECTIONS.WEST];
        const fromIndex = directions.indexOf(from);
        const toIndex = directions.indexOf(to);
        
        const diff = (toIndex - fromIndex + 4) % 4;
        
        switch (diff) {
            case 0: return CONFIG.TURN_TYPES.STRAIGHT; // Same direction (shouldn't happen)
            case 1: return CONFIG.TURN_TYPES.RIGHT;
            case 2: return CONFIG.TURN_TYPES.STRAIGHT;
            case 3: return CONFIG.TURN_TYPES.LEFT;
            default: return CONFIG.TURN_TYPES.STRAIGHT;
        }
    }

    calculateToDirection() {
        return this.route && this.route.length > 1 ? this.route[1] : this.fromDirection;
    }

    assignInitialLane() {
        // Assign lane based on intended turn
        switch (this.turnType) {
            case CONFIG.TURN_TYPES.LEFT:
                return 'left'; // Leftmost lane
            case CONFIG.TURN_TYPES.RIGHT:
                return 'right'; // Rightmost lane
            case CONFIG.TURN_TYPES.STRAIGHT:
            default:
                return Math.random() < 0.5 ? 'left' : 'right'; // Either lane for straight
        }
    }

    getInitialAngle() {
        switch (this.fromDirection) {
            case CONFIG.DIRECTIONS.NORTH: return Math.PI / 2; // Facing south
            case CONFIG.DIRECTIONS.EAST: return Math.PI; // Facing west
            case CONFIG.DIRECTIONS.SOUTH: return -Math.PI / 2; // Facing north
            case CONFIG.DIRECTIONS.WEST: return 0; // Facing east
            default: return 0;
        }
    }

    update(deltaTime, lightStates) {
        const dt = deltaTime / 1000;

        // Check for lane change before intersection
        if (!this.hasCheckedLaneChange && this.shouldPrepareLaneChange()) {
            this.prepareLaneChangeForTurn();
            this.hasCheckedLaneChange = true;
        }

        switch (this.state) {
            case 'approaching':
                this.updateApproaching(dt, lightStates);
                break;
            case 'lane_changing':
                this.updateLaneChanging(dt, lightStates);
                break;
            case 'waiting':
                this.updateWaiting(dt, lightStates);
                break;
            case 'turning':
                this.updateTurning(dt);
                break;
            case 'exiting':
                this.updateExiting(dt);
                break;
        }

        // Update position based on current trajectory or normal movement
        if (this.currentTrajectory && this.state === 'turning') {
            this.followTrajectory(dt);
        } else if (this.speed > 0) {
            this.x += Math.cos(this.angle) * this.speed * dt;
            this.y += Math.sin(this.angle) * this.speed * dt;
        }

        // Update intersection status
        this.isInIntersection = this.intersection.isInIntersection(this.x, this.y);
    }

    shouldPrepareLaneChange() {
        const distanceToIntersection = this.getDistanceToIntersection();
        return distanceToIntersection <= this.laneChangeDistance && distanceToIntersection > 50;
    }

    prepareLaneChangeForTurn() {
        let requiredLane = null;
        
        switch (this.turnType) {
            case CONFIG.TURN_TYPES.LEFT:
                requiredLane = 'left';
                break;
            case CONFIG.TURN_TYPES.RIGHT:
                requiredLane = 'right';
                break;
            case CONFIG.TURN_TYPES.STRAIGHT:
                // Can use either lane, no change needed
                return;
        }

        if (requiredLane && this.lane !== requiredLane) {
            this.initiateLaneChange(requiredLane);
        }
    }

    initiateLaneChange(targetLane) {
        if (this.isChangingLanes) return;
        
        this.targetLane = targetLane;
        this.isChangingLanes = true;
        this.laneChangeProgress = 0;
        this.state = 'lane_changing';
    }

    updateApproaching(dt, lightStates) {
        const stopLine = this.intersection.getStopLinePosition(this.fromDirection);
        const distanceToStop = this.getDistanceToStopLine(stopLine);
        
        // Check for cars ahead
        const carAhead = this.checkForCarAhead();
        const shouldStop = carAhead && this.getDistanceToCarAhead(carAhead) < 35;
        
        if (distanceToStop <= 30 || shouldStop) {
            if (lightStates[this.fromDirection] === CONFIG.LIGHT_STATES.RED || shouldStop) {
                this.state = 'waiting';
                this.speed = 0;
                if (!shouldStop) {
                    this.waitStartTime = Date.now();
                }
                return;
            }
        }
        
        // Continue approaching
        this.speed = Math.min(this.maxSpeed, this.speed + 30 * dt);
        
        // Check if we've reached the intersection
        if (this.isInIntersection && !this.trajectoryStarted) {
            this.startTurning();
        }
    }

    updateLaneChanging(dt, lightStates) {
        // Continue lane change
        this.laneChangeProgress += dt * 2; // 0.5 seconds to change lanes
        
        if (this.laneChangeProgress >= 1) {
            // Lane change complete
            this.lane = this.targetLane;
            this.isChangingLanes = false;
            this.laneChangeProgress = 0;
            this.v = 0; // Center in new lane
            this.state = 'approaching';
        } else {
            // Interpolate lateral position
            const startV = this.lane === 'left' ? -0.5 : 0.5;
            const endV = this.targetLane === 'left' ? -0.5 : 0.5;
            this.v = utils.lerp(startV, endV, this.laneChangeProgress);
        }
        
        // Continue moving forward during lane change
        this.speed = Math.min(this.maxSpeed * 0.8, this.speed + 20 * dt);
        
        // Check if we need to stop
        const stopLine = this.intersection.getStopLinePosition(this.fromDirection);
        const distanceToStop = this.getDistanceToStopLine(stopLine);
        
        if (distanceToStop <= 30 && lightStates[this.fromDirection] === CONFIG.LIGHT_STATES.RED) {
            this.state = 'waiting';
            this.speed = 0;
            this.waitStartTime = Date.now();
        }
    }

    updateWaiting(dt, lightStates) {
        this.speed = 0;
        
        if (this.waitStartTime) {
            this.totalWaitTime = Date.now() - this.waitStartTime;
        }
        
        if (lightStates[this.fromDirection] === CONFIG.LIGHT_STATES.GREEN || 
            lightStates[this.fromDirection] === CONFIG.LIGHT_STATES.YELLOW) {
            this.state = 'approaching';
            this.waitStartTime = null;
        }
    }

    startTurning() {
        this.state = 'turning';
        this.trajectoryStarted = true;
        this.trajectoryProgress = 0;
        this.currentTrajectory = this.intersection.getTrajectory(this.fromDirection, this.toDirection, this.turnType);
        
        if (!this.currentTrajectory) {
            // Fallback to straight line
            this.currentTrajectory = this.intersection.getStraightTrajectory(this.fromDirection, this.toDirection);
        }
    }

    updateTurning(dt) {
        this.speed = Math.min(this.maxSpeed * 1.1, this.speed + 35 * dt);
        
        // Check if trajectory is complete
        if (this.trajectoryProgress >= 1) {
            this.state = 'exiting';
            this.currentTrajectory = null;
            this.trajectoryStarted = false;
            
            // Assign final lane on exit road
            this.assignExitLane();
        }
    }

    updateExiting(dt) {
        this.speed = this.maxSpeed;
        
        // Check if car has exited canvas
        const hasExited = this.x < -50 || this.x > CONFIG.CANVAS_WIDTH + 50 || 
                         this.y < -50 || this.y > CONFIG.CANVAS_HEIGHT + 50;
        
        if (hasExited) {
            this.state = 'completed';
        }
    }

    followTrajectory(dt) {
        if (!this.currentTrajectory) return;
        
        // Advance along trajectory
        const trajectorySpeed = 0.8; // Speed along trajectory (0-1 per second)
        this.trajectoryProgress += trajectorySpeed * dt;
        this.trajectoryProgress = Math.min(this.trajectoryProgress, 1);
        
        // Get current position on trajectory
        const point = this.getTrajectoryPoint(this.trajectoryProgress);
        if (point) {
            this.x = point.x;
            this.y = point.y;
            
            // Update angle to face trajectory direction
            if (this.trajectoryProgress < 0.95) {
                const nextPoint = this.getTrajectoryPoint(this.trajectoryProgress + 0.05);
                if (nextPoint) {
                    this.angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x);
                }
            }
        }
    }

    getTrajectoryPoint(progress) {
        if (!this.currentTrajectory) return null;
        
        const index = Math.floor(progress * (this.currentTrajectory.length - 1));
        const nextIndex = Math.min(index + 1, this.currentTrajectory.length - 1);
        
        if (index === nextIndex) {
            return this.currentTrajectory[index];
        }
        
        const localProgress = (progress * (this.currentTrajectory.length - 1)) - index;
        const current = this.currentTrajectory[index];
        const next = this.currentTrajectory[nextIndex];
        
        return {
            x: utils.lerp(current.x, next.x, localProgress),
            y: utils.lerp(current.y, next.y, localProgress)
        };
    }

    assignExitLane() {
        // Assign lane on exit road based on turn type
        switch (this.turnType) {
            case CONFIG.TURN_TYPES.LEFT:
                this.lane = 'right'; // Left turns end up in right lane of new road
                break;
            case CONFIG.TURN_TYPES.RIGHT:
                this.lane = 'left'; // Right turns end up in left lane of new road
                break;
            case CONFIG.TURN_TYPES.STRAIGHT:
            default:
                this.lane = this.lane; // Keep same relative lane
                break;
        }
        
        this.v = this.lane === 'left' ? -0.5 : 0.5;
    }

    getDistanceToIntersection() {
        const centerX = this.intersection.centerX;
        const centerY = this.intersection.centerY;
        
        switch (this.fromDirection) {
            case CONFIG.DIRECTIONS.NORTH:
                return Math.abs(this.y - (centerY - CONFIG.INTERSECTION_SIZE / 2));
            case CONFIG.DIRECTIONS.EAST:
                return Math.abs(this.x - (centerX + CONFIG.INTERSECTION_SIZE / 2));
            case CONFIG.DIRECTIONS.SOUTH:
                return Math.abs(this.y - (centerY + CONFIG.INTERSECTION_SIZE / 2));
            case CONFIG.DIRECTIONS.WEST:
                return Math.abs(this.x - (centerX - CONFIG.INTERSECTION_SIZE / 2));
            default:
                return 0;
        }
    }

    getDistanceToStopLine(stopLine) {
        switch (this.fromDirection) {
            case CONFIG.DIRECTIONS.NORTH:
                return Math.abs(this.y - stopLine.y1);
            case CONFIG.DIRECTIONS.EAST:
                return Math.abs(this.x - stopLine.x1);
            case CONFIG.DIRECTIONS.SOUTH:
                return Math.abs(this.y - stopLine.y1);
            case CONFIG.DIRECTIONS.WEST:
                return Math.abs(this.x - stopLine.x1);
            default:
                return 0;
        }
    }

    checkForCarAhead() {
        const allCars = this.intersection.carManager ? this.intersection.carManager.getCars() : [];
        
        let closestCar = null;
        let closestDistance = Infinity;
        
        for (const otherCar of allCars) {
            if (otherCar.id === this.id || otherCar.fromDirection !== this.fromDirection || otherCar.lane !== this.lane) {
                continue;
            }
            
            let isAhead = false;
            let distance = 0;
            
            switch (this.fromDirection) {
                case CONFIG.DIRECTIONS.NORTH:
                    isAhead = otherCar.y > this.y;
                    distance = otherCar.y - this.y;
                    break;
                case CONFIG.DIRECTIONS.EAST:
                    isAhead = otherCar.x < this.x;
                    distance = this.x - otherCar.x;
                    break;
                case CONFIG.DIRECTIONS.SOUTH:
                    isAhead = otherCar.y < this.y;
                    distance = this.y - otherCar.y;
                    break;
                case CONFIG.DIRECTIONS.WEST:
                    isAhead = otherCar.x > this.x;
                    distance = otherCar.x - this.x;
                    break;
            }
            
            if (isAhead && distance > 0 && distance < closestDistance) {
                closestDistance = distance;
                closestCar = otherCar;
            }
        }
        
        return closestCar;
    }

    getDistanceToCarAhead(carAhead) {
        if (!carAhead) return Infinity;
        
        switch (this.fromDirection) {
            case CONFIG.DIRECTIONS.NORTH:
                return carAhead.y - this.y;
            case CONFIG.DIRECTIONS.EAST:
                return this.x - carAhead.x;
            case CONFIG.DIRECTIONS.SOUTH:
                return this.y - carAhead.y;
            case CONFIG.DIRECTIONS.WEST:
                return carAhead.x - this.x;
            default:
                return Infinity;
        }
    }

    render(ctx) {
        ctx.save();
        
        // Calculate actual render position including lateral offset
        const laneOffset = this.v * (CONFIG.LANE_WIDTH / 2);
        let renderX = this.x;
        let renderY = this.y;
        
        // Apply lateral offset perpendicular to direction
        switch (this.fromDirection) {
            case CONFIG.DIRECTIONS.NORTH:
            case CONFIG.DIRECTIONS.SOUTH:
                renderX += laneOffset;
                break;
            case CONFIG.DIRECTIONS.EAST:
            case CONFIG.DIRECTIONS.WEST:
                renderY += laneOffset;
                break;
        }
        
        // Move to car position and rotate
        ctx.translate(renderX, renderY);
        ctx.rotate(this.angle);
        
        // Draw car body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Draw car details
        ctx.fillStyle = '#333333';
        ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width - 4, 3);
        ctx.fillRect(-this.width / 2 + 2, this.height / 2 - 5, this.width - 4, 3);
        
        // Draw turn indicator
        if (this.turnType !== CONFIG.TURN_TYPES.STRAIGHT) {
            ctx.fillStyle = this.turnType === CONFIG.TURN_TYPES.LEFT ? '#00FF00' : '#FF8800';
            ctx.fillRect(-this.width / 2 - 2, -2, 2, 4);
        }
        
        ctx.restore();
    }

    // Getters for external systems
    isWaiting() {
        return this.state === 'waiting';
    }

    isCompleted() {
        return this.state === 'completed';
    }

    getWaitTime() {
        return this.totalWaitTime;
    }

    getDirection() {
        return this.fromDirection;
    }

    getTurnType() {
        return this.turnType;
    }

    getRoute() {
        return [...this.route];
    }
}