// Re-export Vehicle as Car for backward compatibility
export { Vehicle as Car } from './vehicle.js';
import { Vehicle } from './vehicle.js';
import { routingManager } from './routingMA.js';

export class CarManager {
    constructor(intersection) {
        this.intersection = intersection;
        this.cars = [];
        this.nextCarId = 1;
        this.spawnTimer = 0;
        this.settings = { ...CONFIG.DEFAULT_SETTINGS };
        
        // Callbacks
        this.onCarCompleted = null;
        
        // Set reference in intersection for car-to-car communication
        this.intersection.carManager = this;
    }

    initialize(settings) {
        this.settings = { ...settings };
        this.cars = [];
        this.nextCarId = 1;
        this.spawnTimer = 0;
    }

    update(deltaTime, lightStates) {
        // Update spawn timer
        this.spawnTimer += deltaTime;
        
        // Spawn new cars
        const spawnInterval = (10000 / this.settings.CAR_SPAWN_RATE); // Convert rate to interval
        if (this.spawnTimer >= spawnInterval) {
            this.spawnCar();
            this.spawnTimer = 0;
        }

        // Update existing cars
        this.cars.forEach(car => {
            car.maxSpeed = this.settings.CAR_SPEED;
            car.update(deltaTime, lightStates);
        });

        // Remove completed cars
        const completedCars = this.cars.filter(car => car.isCompleted());
        completedCars.forEach(car => {
            if (this.onCarCompleted) {
                this.onCarCompleted(car);
            }
        });

        this.cars = this.cars.filter(car => !car.isCompleted());
    }

    spawnCar() {
        // Randomly choose a direction to spawn from
        const directions = [CONFIG.DIRECTIONS.NORTH, CONFIG.DIRECTIONS.EAST, CONFIG.DIRECTIONS.SOUTH, CONFIG.DIRECTIONS.WEST];
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        // Generate route for the new car
        const routeInfo = routingManager.generateRoute(direction, this.settings.TURN_RATE);
        
        // Choose a lane based on the intended turn
        const lane = routeInfo.turnType === CONFIG.TURN_TYPES.LEFT ? 'left' : 
                    routeInfo.turnType === CONFIG.TURN_TYPES.RIGHT ? 'right' :
                    Math.random() < 0.5 ? 'left' : 'right';
        
        // Check if there's space to spawn in the chosen lane
        const spawnPoint = this.intersection.getSpawnPoint(direction, lane);
        if (!spawnPoint) return;
        
        const tooClose = this.cars.some(car => {
            const distance = utils.getDistance(car.x, car.y, spawnPoint.x, spawnPoint.y);
            return car.fromDirection === direction && car.lane === lane && distance < 60;
        });

        if (!tooClose) {
            const car = new Vehicle({
                id: this.nextCarId++,
                direction: direction,
                intersection: this.intersection,
                route: routeInfo.route
            });
            this.cars.push(car);
        }
    }

    render(ctx) {
        this.cars.forEach(car => car.render(ctx));
    }

    reset() {
        this.cars = [];
        this.nextCarId = 1;
        this.spawnTimer = 0;
    }

    updateSettings(settings) {
        this.settings = { ...settings };
    }

    // Getters for external systems
    getCars() {
        return [...this.cars];
    }

    getWaitingCars(direction) {
        return this.cars.filter(car => car.getDirection() === direction && car.isWaiting());
    }

    getCurrentCarCount() {
        return this.cars.length;
    }
}