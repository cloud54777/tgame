import { CONFIG } from './config.js';

export class RoutingManager {
    constructor() {
        this.routeTemplates = this.initializeRouteTemplates();
        this.turnProbabilities = {
            straight: 0.6,  // 60% straight
            left: 0.2,      // 20% left turn
            right: 0.2      // 20% right turn
        };
    }

    initializeRouteTemplates() {
        const directions = [CONFIG.DIRECTIONS.NORTH, CONFIG.DIRECTIONS.EAST, CONFIG.DIRECTIONS.SOUTH, CONFIG.DIRECTIONS.WEST];
        const templates = {};

        directions.forEach(from => {
            templates[from] = {
                straight: this.getStraightDestination(from),
                left: this.getLeftDestination(from),
                right: this.getRightDestination(from)
            };
        });

        return templates;
    }

    getStraightDestination(fromDirection) {
        const directions = [CONFIG.DIRECTIONS.NORTH, CONFIG.DIRECTIONS.EAST, CONFIG.DIRECTIONS.SOUTH, CONFIG.DIRECTIONS.WEST];
        const fromIndex = directions.indexOf(fromDirection);
        return directions[(fromIndex + 2) % 4]; // Opposite direction
    }

    getLeftDestination(fromDirection) {
        const directions = [CONFIG.DIRECTIONS.NORTH, CONFIG.DIRECTIONS.EAST, CONFIG.DIRECTIONS.SOUTH, CONFIG.DIRECTIONS.WEST];
        const fromIndex = directions.indexOf(fromDirection);
        return directions[(fromIndex + 3) % 4]; // 90 degrees counter-clockwise
    }

    getRightDestination(fromDirection) {
        const directions = [CONFIG.DIRECTIONS.NORTH, CONFIG.DIRECTIONS.EAST, CONFIG.DIRECTIONS.SOUTH, CONFIG.DIRECTIONS.WEST];
        const fromIndex = directions.indexOf(fromDirection);
        return directions[(fromIndex + 1) % 4]; // 90 degrees clockwise
    }

    generateRoute(fromDirection, turnRate = null) {
        const effectiveTurnRate = turnRate !== null ? turnRate : CONFIG.DEFAULT_SETTINGS.TURN_RATE;
        const random = Math.random();

        let turnType;
        let toDirection;

        if (random < this.turnProbabilities.straight) {
            turnType = CONFIG.TURN_TYPES.STRAIGHT;
            toDirection = this.routeTemplates[fromDirection].straight;
        } else if (random < this.turnProbabilities.straight + (effectiveTurnRate / 2)) {
            turnType = CONFIG.TURN_TYPES.LEFT;
            toDirection = this.routeTemplates[fromDirection].left;
        } else if (random < this.turnProbabilities.straight + effectiveTurnRate) {
            turnType = CONFIG.TURN_TYPES.RIGHT;
            toDirection = this.routeTemplates[fromDirection].right;
        } else {
            // Default to straight if probabilities don't add up
            turnType = CONFIG.TURN_TYPES.STRAIGHT;
            toDirection = this.routeTemplates[fromDirection].straight;
        }

        return {
            route: [fromDirection, toDirection],
            turnType: turnType,
            fromDirection: fromDirection,
            toDirection: toDirection
        };
    }

    getRouteForScenario(scenario, fromDirection) {
        // Predefined scenarios for testing
        switch (scenario) {
            case 'all_straight':
                return {
                    route: [fromDirection, this.getStraightDestination(fromDirection)],
                    turnType: CONFIG.TURN_TYPES.STRAIGHT,
                    fromDirection: fromDirection,
                    toDirection: this.getStraightDestination(fromDirection)
                };
            case 'all_left':
                return {
                    route: [fromDirection, this.getLeftDestination(fromDirection)],
                    turnType: CONFIG.TURN_TYPES.LEFT,
                    fromDirection: fromDirection,
                    toDirection: this.getLeftDestination(fromDirection)
                };
            case 'all_right':
                return {
                    route: [fromDirection, this.getRightDestination(fromDirection)],
                    turnType: CONFIG.TURN_TYPES.RIGHT,
                    fromDirection: fromDirection,
                    toDirection: this.getRightDestination(fromDirection)
                };
            default:
                return this.generateRoute(fromDirection);
        }
    }

    updateTurnProbabilities(straight, left, right) {
        // Normalize probabilities to sum to 1
        const total = straight + left + right;
        if (total > 0) {
            this.turnProbabilities.straight = straight / total;
            this.turnProbabilities.left = left / total;
            this.turnProbabilities.right = right / total;
        }
    }

    getTurnStatistics() {
        return { ...this.turnProbabilities };
    }
}

// Singleton instance
export const routingManager = new RoutingManager();