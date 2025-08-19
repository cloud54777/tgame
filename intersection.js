import { CONFIG } from "./config.js";
export class Intersection {
    constructor(centerX, centerY) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.size = CONFIG.INTERSECTION_SIZE;
        this.roadWidth = CONFIG.ROAD_WIDTH;
        this.laneWidth = CONFIG.LANE_WIDTH;
        
        this.calculatePositions();
    }

    initialize() {
        this.calculatePositions();
    }

    calculatePositions() {
        const halfSize = this.size / 2;
        const halfRoad = this.roadWidth / 2;
        const laneOffset = this.laneWidth / 2;
        
        // Stop line positions (before intersection)
       // Stop line positions (before intersection, always close to center)
const stopLineOffset = halfSize + 5;
this.stopLines = {
    [CONFIG.DIRECTIONS.NORTH]: {
        x1: this.centerX - halfRoad,
        y1: this.centerY - stopLineOffset,
        x2: this.centerX + halfRoad,
        y2: this.centerY - stopLineOffset
    },
    [CONFIG.DIRECTIONS.EAST]: {
        x1: this.centerX + stopLineOffset,
        y1: this.centerY - halfRoad,
        x2: this.centerX + stopLineOffset,
        y2: this.centerY + halfRoad
    },
    [CONFIG.DIRECTIONS.SOUTH]: {
        x1: this.centerX - halfRoad,
        y1: this.centerY + stopLineOffset,
        x2: this.centerX + halfRoad,
        y2: this.centerY + stopLineOffset
    },
    [CONFIG.DIRECTIONS.WEST]: {
        x1: this.centerX - stopLineOffset,
        y1: this.centerY - halfRoad,
        x2: this.centerX - stopLineOffset,
        y2: this.centerY + halfRoad
    }
};
        // Traffic light positions
        this.lightPositions = {
            [CONFIG.DIRECTIONS.NORTH]: {
                x: this.centerX - 25,
                y: this.centerY - halfSize - 40
            },
            [CONFIG.DIRECTIONS.EAST]: {
                x: this.centerX + halfSize + 15,
                y: this.centerY - 25
            },
            [CONFIG.DIRECTIONS.SOUTH]: {
                x: this.centerX + 25,
                y: this.centerY + halfSize + 15
            },
            [CONFIG.DIRECTIONS.WEST]: {
                x: this.centerX - halfSize - 40,
                y: this.centerY + 25
            }
        };

        // Car spawn points - now with lane support
        this.spawnPoints = {
            [CONFIG.DIRECTIONS.NORTH]: {
                left: { x: this.centerX - laneOffset, y: 0 },
                right: { x: this.centerX + laneOffset, y: 0 }
            },
            [CONFIG.DIRECTIONS.EAST]: {
                left: { x: CONFIG.CANVAS_WIDTH, y: this.centerY - laneOffset },
                right: { x: CONFIG.CANVAS_WIDTH, y: this.centerY + laneOffset }
            },
            [CONFIG.DIRECTIONS.SOUTH]: {
                left: { x: this.centerX + laneOffset, y: CONFIG.CANVAS_HEIGHT },
                right: { x: this.centerX - laneOffset, y: CONFIG.CANVAS_HEIGHT }
            },
            [CONFIG.DIRECTIONS.WEST]: {
                left: { x: 0, y: this.centerY + laneOffset },
                right: { x: 0, y: this.centerY - laneOffset }
            }
        };

        // Exit points - now with lane support
        this.exitPoints = {
            [CONFIG.DIRECTIONS.NORTH]: {
                left: { x: this.centerX - laneOffset, y: 0 },
                right: { x: this.centerX + laneOffset, y: 0 }
            },
            [CONFIG.DIRECTIONS.EAST]: {
                left: { x: CONFIG.CANVAS_WIDTH, y: this.centerY - laneOffset },
                right: { x: CONFIG.CANVAS_WIDTH, y: this.centerY + laneOffset }
            },
            [CONFIG.DIRECTIONS.SOUTH]: {
                left: { x: this.centerX + laneOffset, y: CONFIG.CANVAS_HEIGHT },
                right: { x: this.centerX - laneOffset, y: CONFIG.CANVAS_HEIGHT }
            },
            [CONFIG.DIRECTIONS.WEST]: {
                left: { x: 0, y: this.centerY + laneOffset },
                right: { x: 0, y: this.centerY - laneOffset }
            }
        };
    }

    render(ctx) {
        this.drawRoads(ctx);
        this.drawIntersection(ctx);
        this.drawLaneMarkings(ctx);
        this.drawStopLines(ctx);
    }

    drawRoads(ctx) {
        const halfRoad = this.roadWidth / 2;
        
        ctx.fillStyle = '#444444';
        
        // Vertical road (North-South)
        ctx.fillRect(
            this.centerX - halfRoad,
            0,
            this.roadWidth,
            CONFIG.CANVAS_HEIGHT
        );
        
        // Horizontal road (East-West)
        ctx.fillRect(
            0,
            this.centerY - halfRoad,
            CONFIG.CANVAS_WIDTH,
            this.roadWidth
        );
    }

drawIntersection(ctx) {
    const halfRoad = this.roadWidth / 2;
    const curveRadius = halfRoad; // Makes the inward curve meet nicely

    ctx.fillStyle = '#666666';
    ctx.beginPath();

    // Start top middle going clockwise
    ctx.moveTo(this.centerX - halfRoad, this.centerY - halfRoad - curveRadius);

    // Top left inward curve
    ctx.quadraticCurveTo(
        this.centerX - halfRoad, this.centerY - halfRoad,
        this.centerX - halfRoad - curveRadius, this.centerY - halfRoad
    );

    // Left top to left bottom
    ctx.lineTo(this.centerX - halfRoad - curveRadius, this.centerY + halfRoad);

    // Bottom left inward curve
    ctx.quadraticCurveTo(
        this.centerX - halfRoad, this.centerY + halfRoad,
        this.centerX - halfRoad, this.centerY + halfRoad + curveRadius
    );

    // Bottom middle to bottom right
    ctx.lineTo(this.centerX + halfRoad, this.centerY + halfRoad + curveRadius);

    // Bottom right inward curve
    ctx.quadraticCurveTo(
        this.centerX + halfRoad, this.centerY + halfRoad,
        this.centerX + halfRoad + curveRadius, this.centerY + halfRoad
    );

    // Right bottom to right top
    ctx.lineTo(this.centerX + halfRoad + curveRadius, this.centerY - halfRoad);

    // Top right inward curve
    ctx.quadraticCurveTo(
        this.centerX + halfRoad, this.centerY - halfRoad,
        this.centerX + halfRoad, this.centerY - halfRoad - curveRadius
    );

    // Back to start
    ctx.closePath();
    ctx.fill();

    // Restore normal drawing mode for anything after
    ctx.globalCompositeOperation = 'source-over';
}

    drawLaneMarkings(ctx) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);

        const halfRoad = this.roadWidth / 2;
        
        // Vertical center line (North-South road)
        ctx.beginPath();
        ctx.moveTo(this.centerX, 0);
        ctx.lineTo(this.centerX, this.centerY - halfRoad);
        ctx.moveTo(this.centerX, this.centerY + halfRoad);
        ctx.lineTo(this.centerX, CONFIG.CANVAS_HEIGHT);
        ctx.stroke();
        
        // Horizontal center line (East-West road)
        ctx.beginPath();
        ctx.moveTo(0, this.centerY);
        ctx.lineTo(this.centerX - halfRoad, this.centerY);
        ctx.moveTo(this.centerX + halfRoad, this.centerY);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, this.centerY);
        ctx.stroke();

        ctx.setLineDash([]);
    }

    drawStopLines(ctx) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        
        Object.values(this.stopLines).forEach(line => {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        });
    }

    // Helper methods for car navigation
    getStopLinePosition(direction) {
        return this.stopLines[direction];
    }

    getSpawnPoint(direction, lane = 'right') {
        return this.spawnPoints[direction] ? this.spawnPoints[direction][lane] : null;
    }

    getExitPoint(direction, lane = 'right') {
        return this.exitPoints[direction] ? this.exitPoints[direction][lane] : null;
    }
getLightPosition(direction) {
    if (!direction || typeof direction !== 'string') {
        console.warn("Invalid direction for getLightPosition:", direction);
        return undefined;
    }
    return this.lightPositions[direction];
}

    // Check if a point is within the intersection
    isInIntersection(x, y) {
        const halfRoad = this.roadWidth / 2;
        return (
            x >= this.centerX - halfRoad &&
            x <= this.centerX + halfRoad &&
            y >= this.centerY - halfRoad &&
            y <= this.centerY + halfRoad
        );
    }

    // Generate trajectory for turning movements
    getTrajectory(fromDirection, toDirection, turnType) {
        const trajectoryPoints = [];
        const numPoints = 20; // Number of points in trajectory
        
        const entryPoint = this.getPathEntryPoint(fromDirection);
        const exitPoint = this.getPathExitPoint(toDirection, turnType);
        
        if (!entryPoint || !exitPoint) return null;
        
        if (turnType === CONFIG.TURN_TYPES.STRAIGHT) {
            // Straight line trajectory
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                trajectoryPoints.push({
                    x: entryPoint.x + (exitPoint.x - entryPoint.x) * t,
                    y: entryPoint.y + (exitPoint.y - entryPoint.y) * t
                });
            }
        } else {
            // Curved trajectory for turns
            const controlPoints = this.getControlPoints(fromDirection, toDirection, turnType);
            
            for (let i = 0; i <= numPoints; i++) {
                const t = i / numPoints;
                const point = this.getBezierPoint(t, entryPoint, controlPoints.cp1, controlPoints.cp2, exitPoint);
                trajectoryPoints.push(point);
            }
        }
        
        return trajectoryPoints;
    }
    
    getStraightTrajectory(fromDirection, toDirection) {
        return this.getTrajectory(fromDirection, toDirection, CONFIG.TURN_TYPES.STRAIGHT);
    }
    
    getControlPoints(fromDirection, toDirection, turnType) {
        const centerX = this.centerX;
        const centerY = this.centerY;
        const radius = this.size / 3;
        
        let cp1, cp2;
        
        if (turnType === CONFIG.TURN_TYPES.LEFT) {
            // Left turn control points
            switch (fromDirection) {
                case CONFIG.DIRECTIONS.NORTH:
                    cp1 = { x: centerX - radius, y: centerY - radius };
                    cp2 = { x: centerX - radius, y: centerY - radius };
                    break;
                case CONFIG.DIRECTIONS.EAST:
                    cp1 = { x: centerX + radius, y: centerY - radius };
                    cp2 = { x: centerX + radius, y: centerY - radius };
                    break;
                case CONFIG.DIRECTIONS.SOUTH:
                    cp1 = { x: centerX + radius, y: centerY + radius };
                    cp2 = { x: centerX + radius, y: centerY + radius };
                    break;
                case CONFIG.DIRECTIONS.WEST:
                    cp1 = { x: centerX - radius, y: centerY + radius };
                    cp2 = { x: centerX - radius, y: centerY + radius };
                    break;
            }
        } else if (turnType === CONFIG.TURN_TYPES.RIGHT) {
            // Right turn control points
            switch (fromDirection) {
                case CONFIG.DIRECTIONS.NORTH:
                    cp1 = { x: centerX + radius, y: centerY - radius };
                    cp2 = { x: centerX + radius, y: centerY - radius };
                    break;
                case CONFIG.DIRECTIONS.EAST:
                    cp1 = { x: centerX + radius, y: centerY + radius };
                    cp2 = { x: centerX + radius, y: centerY + radius };
                    break;
                case CONFIG.DIRECTIONS.SOUTH:
                    cp1 = { x: centerX - radius, y: centerY + radius };
                    cp2 = { x: centerX - radius, y: centerY + radius };
                    break;
                case CONFIG.DIRECTIONS.WEST:
                    cp1 = { x: centerX - radius, y: centerY - radius };
                    cp2 = { x: centerX - radius, y: centerY - radius };
                    break;
            }
        }
        
        return { cp1, cp2 };
    }
    
    getBezierPoint(t, p0, p1, p2, p3) {
        const cx = 3 * (p1.x - p0.x);
        const bx = 3 * (p2.x - p1.x) - cx;
        const ax = p3.x - p0.x - cx - bx;
        
        const cy = 3 * (p1.y - p0.y);
        const by = 3 * (p2.y - p1.y) - cy;
        const ay = p3.y - p0.y - cy - by;
        
        const tSquared = t * t;
        const tCubed = tSquared * t;
        
        return {
            x: ax * tCubed + bx * tSquared + cx * t + p0.x,
            y: ay * tCubed + by * tSquared + cy * t + p0.y
        };
    }

    getPathEntryPoint(direction) {
        const halfRoad = this.roadWidth / 2;
        const laneOffset = this.laneWidth / 2;
        
        switch (direction) {
            case CONFIG.DIRECTIONS.NORTH:
                return { x: this.centerX - laneOffset, y: this.centerY - halfRoad };
            case CONFIG.DIRECTIONS.EAST:
                return { x: this.centerX + halfRoad, y: this.centerY - laneOffset };
            case CONFIG.DIRECTIONS.SOUTH:
                return { x: this.centerX + laneOffset, y: this.centerY + halfRoad };
            case CONFIG.DIRECTIONS.WEST:
                return { x: this.centerX - halfRoad, y: this.centerY + laneOffset };
        }
    }
    
    getPathExitPoint(direction, turnType) {
        const halfRoad = this.roadWidth / 2;
        const laneOffset = this.laneWidth / 2;
        
        // Determine which lane to exit into based on turn type
        let exitLaneOffset = laneOffset;
        if (turnType === CONFIG.TURN_TYPES.LEFT) {
            exitLaneOffset = -laneOffset; // Exit into right lane after left turn
        } else if (turnType === CONFIG.TURN_TYPES.RIGHT) {
            exitLaneOffset = laneOffset; // Exit into left lane after right turn
        }
        
        switch (direction) {
            case CONFIG.DIRECTIONS.NORTH:
                return { x: this.centerX + exitLaneOffset, y: this.centerY - halfRoad };
            case CONFIG.DIRECTIONS.EAST:
                return { x: this.centerX + halfRoad, y: this.centerY + exitLaneOffset };
            case CONFIG.DIRECTIONS.SOUTH:
                return { x: this.centerX - exitLaneOffset, y: this.centerY + halfRoad };
            case CONFIG.DIRECTIONS.WEST:
                return { x: this.centerX - halfRoad, y: this.centerY - exitLaneOffset };
            default:
                return { x: this.centerX, y: this.centerY };
        }
    }

    // Method to provide car manager reference to cars
    setCarManager(carManager) {
        this.carManager = carManager;
    }
    
    setRoadNetwork(roadNetwork) {
        this.roadNetwork = roadNetwork;
    }
    
    getAllCars() {
        return this.carManager ? this.carManager.getCars() : [];
    }

}

// Example usage
// ...existing code...