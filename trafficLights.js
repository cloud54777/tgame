import { CONFIG } from "./config.js";

const TrafficLightState = {
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green',
    OFF: 'off'
};

export class TrafficLightController {
    constructor() {
        this.lights = {};
        this.mode = CONFIG.MODES.FIXED;
        this.currentPhase = 0; // 0: WE green, 1: WE yellow, 2: WE red, 3: transition, 4: NS green, 5: NS yellow, 6: NS red, 7: transition
        this.phaseTimer = 0;
        this.adaptiveData = {};
        this.lastGreenChange = 0;
        this.currentGreenPair = 'WE'; // 'WE' for West-East, 'NS' for North-South
        
        this.initializeLights();
    }

    initializeLights() {
        // Initialize all lights to red
        Object.values(CONFIG.DIRECTIONS).forEach(direction => {
            this.lights[direction] = {
                state: CONFIG.LIGHT_STATES.RED,
                timer: 0
            };
        });
    }

    initialize(mode, settings) {
        this.mode = mode;
        this.settings = settings;
        this.reset();
    }

    reset() {
        this.currentPhase = 0;
        this.phaseTimer = 0;
        this.lastGreenChange = 0;
        this.currentGreenPair = 'WE';
        
        // Start with West-East green
        this.setLightState();
    }

    update(deltaTime, mode, settings) {
        this.mode = mode;
        this.settings = settings;

        if (this.mode === CONFIG.MODES.FIXED) {
            this.updateFixedTimer(deltaTime);
        } else {
            this.updateAdaptive(deltaTime);
        }
    }

    updateFixedTimer(deltaTime) {
        this.phaseTimer += deltaTime;

        switch (this.currentPhase) {
            case 0: // West-East Green
                if (this.phaseTimer >= this.settings.GREEN_DURATION) {
                    this.advancePhase();
                }
                break;
            case 1: // West-East Yellow
                if (this.phaseTimer >= this.settings.YELLOW_DURATION) {
                    this.advancePhase();
                }
                break;
            case 2: // West-East Red
                if (this.phaseTimer >= this.settings.RED_DURATION) {
                    this.advancePhase();
                }
                break;
            case 3: // All Red (transition period - 2 seconds)
                if (this.phaseTimer >= 2000) {
                    this.advancePhase();
                }
                break;
            case 4: // North-South Green
                if (this.phaseTimer >= this.settings.GREEN_DURATION) {
                    this.advancePhase();
                }
                break;
            case 5: // North-South Yellow
                if (this.phaseTimer >= this.settings.YELLOW_DURATION) {
                    this.advancePhase();
                }
                break;
            case 6: // North-South Red
                if (this.phaseTimer >= this.settings.RED_DURATION) {
                    this.advancePhase();
                }
                break;
            case 7: // All Red (transition period - 2 seconds)
                if (this.phaseTimer >= 2000) {
                    this.advancePhase();
                }
                break;
        }
    }

    updateAdaptive(deltaTime) {
        this.phaseTimer += deltaTime;
        
        // Get current state
        const currentGreenDirection = this.getCurrentGreenDirection();
        const isInTransition = this.isInTransitionPhase();
        
        if (isInTransition) {
            // During transition, just wait for it to complete
            if (this.phaseTimer >= 2000) {
                this.advancePhase();
            }
            return;
        }

        // Check if we should switch based on priority
        const shouldSwitch = this.shouldSwitchDirection();
        
        if (shouldSwitch && this.phaseTimer >= this.settings.MIN_GREEN_TIME) {
            // Start yellow phase for current direction
            if (currentGreenDirection === 'NS') {
                this.currentPhase = 5; // NS Yellow
            } else {
                this.currentPhase = 1; // WE Yellow
            }
            this.phaseTimer = 0;
            this.setLightState();
        } else {
            // Continue with current phase timing
            this.updateCurrentPhase(deltaTime);
        }
    }

    updateCurrentPhase(deltaTime) {
        const currentGreenDirection = this.getCurrentGreenDirection();
        
        if (currentGreenDirection === 'NS') {
            // North-South is green
            switch (this.currentPhase) {
                case 4: // NS Green - check if all cars have passed
                    if (this.allCarsPassedForDirection('NS')) {
                        this.advancePhase(); // Go to yellow
                    }
                    break;
                case 5: // NS Yellow
                    if (this.phaseTimer >= this.settings.YELLOW_DURATION) {
                        this.advancePhase();
                    }
                    break;
                case 6: // NS Red
                    if (this.phaseTimer >= this.settings.RED_DURATION) {
                        this.advancePhase();
                    }
                    break;
            }
        } else if (currentGreenDirection === 'WE') {
            // West-East is green
            switch (this.currentPhase) {
                case 0: // WE Green - check if all cars have passed
                    if (this.allCarsPassedForDirection('WE')) {
                        this.advancePhase(); // Go to yellow
                    }
                    break;
                case 1: // WE Yellow
                    if (this.phaseTimer >= this.settings.YELLOW_DURATION) {
                        this.advancePhase();
                    }
                    break;
                case 2: // WE Red
                    if (this.phaseTimer >= this.settings.RED_DURATION) {
                        this.advancePhase();
                    }
                    break;
            }
        }
    }

    shouldSwitchDirection() {
        if (!this.adaptiveData) return false;
        
        const currentGreenDirection = this.getCurrentGreenDirection();
        
        if (currentGreenDirection === 'NS') {
            // North-South is green, check if West-East has higher priority
            const wePriority = this.calculatePriority('WE');
            const nsPriority = this.calculatePriority('NS');
            return wePriority > nsPriority && wePriority > 10; // Threshold for switching
        } else if (currentGreenDirection === 'WE') {
            // West-East is green, check if North-South has higher priority
            const nsPriority = this.calculatePriority('NS');
            const wePriority = this.calculatePriority('WE');
            return nsPriority > wePriority && nsPriority > 10; // Threshold for switching
        }
        
        return false;
    }

    calculatePriority(pair) {
        if (!this.adaptiveData) return 0;
        
        let totalPriority = 0;
        
        if (pair === 'NS') {
            const northData = this.adaptiveData[CONFIG.DIRECTIONS.NORTH] || { carsWaiting: 0, waitTime: 0 };
            const southData = this.adaptiveData[CONFIG.DIRECTIONS.SOUTH] || { carsWaiting: 0, waitTime: 0 };
            
            // Priority = cars waiting * wait time (in seconds)
            totalPriority = (northData.carsWaiting * (northData.waitTime / 1000)) + 
                           (southData.carsWaiting * (southData.waitTime / 1000));
        } else if (pair === 'WE') {
            const westData = this.adaptiveData[CONFIG.DIRECTIONS.WEST] || { carsWaiting: 0, waitTime: 0 };
            const eastData = this.adaptiveData[CONFIG.DIRECTIONS.EAST] || { carsWaiting: 0, waitTime: 0 };
            
            totalPriority = (westData.carsWaiting * (westData.waitTime / 1000)) + 
                           (eastData.carsWaiting * (eastData.waitTime / 1000));
        }
        
        return totalPriority;
    }

    allCarsPassedForDirection(pair) {
        if (!this.adaptiveData) return false;
        
        if (pair === 'NS') {
            const northData = this.adaptiveData[CONFIG.DIRECTIONS.NORTH] || { carsWaiting: 0 };
            const southData = this.adaptiveData[CONFIG.DIRECTIONS.SOUTH] || { carsWaiting: 0 };
            return northData.carsWaiting === 0 && southData.carsWaiting === 0;
        } else if (pair === 'WE') {
            const westData = this.adaptiveData[CONFIG.DIRECTIONS.WEST] || { carsWaiting: 0 };
            const eastData = this.adaptiveData[CONFIG.DIRECTIONS.EAST] || { carsWaiting: 0 };
            return westData.carsWaiting === 0 && eastData.carsWaiting === 0;
        }
        
        return false;
    }

    isInTransitionPhase() {
        return this.currentPhase === 3 || this.currentPhase === 7;
    }

    updateAdaptiveLogic(sensorData, deltaTime) {
        this.adaptiveData = sensorData;
    }

    advancePhase() {
        this.currentPhase = (this.currentPhase + 1) % 8;
        this.phaseTimer = 0;
        
        // Update current green pair
        if (this.currentPhase === 0) {
            this.currentGreenPair = 'WE';
        } else if (this.currentPhase === 4) {
            this.currentGreenPair = 'NS';
        }
        
        this.setLightState();
    }

    setLightState() {
        // Reset all lights to red first
        Object.values(CONFIG.DIRECTIONS).forEach(direction => {
            this.lights[direction].state = CONFIG.LIGHT_STATES.RED;
        });

        switch (this.currentPhase) {
            case 0: // West-East Green
                this.lights[CONFIG.DIRECTIONS.WEST].state = CONFIG.LIGHT_STATES.GREEN;
                this.lights[CONFIG.DIRECTIONS.EAST].state = CONFIG.LIGHT_STATES.GREEN;
                break;
            case 1: // West-East Yellow
                this.lights[CONFIG.DIRECTIONS.WEST].state = CONFIG.LIGHT_STATES.YELLOW;
                this.lights[CONFIG.DIRECTIONS.EAST].state = CONFIG.LIGHT_STATES.YELLOW;
                break;
            case 2: // West-East Red
                // All lights already set to red above
                break;
            case 3: // All Red (transition period)
                // All lights already set to red above
                break;
            case 4: // North-South Green
                this.lights[CONFIG.DIRECTIONS.NORTH].state = CONFIG.LIGHT_STATES.GREEN;
                this.lights[CONFIG.DIRECTIONS.SOUTH].state = CONFIG.LIGHT_STATES.GREEN;
                break;
            case 5: // North-South Yellow
                this.lights[CONFIG.DIRECTIONS.NORTH].state = CONFIG.LIGHT_STATES.YELLOW;
                this.lights[CONFIG.DIRECTIONS.SOUTH].state = CONFIG.LIGHT_STATES.YELLOW;
                break;
            case 6: // North-South Red
                // All lights already set to red above
                break;
            case 7: // All Red (transition period)
                // All lights already set to red above
                break;
        }
    }

    getCurrentGreenDirection() {
        if (this.lights[CONFIG.DIRECTIONS.NORTH].state === CONFIG.LIGHT_STATES.GREEN ||
            this.lights[CONFIG.DIRECTIONS.SOUTH].state === CONFIG.LIGHT_STATES.GREEN) {
            return 'NS';
        } else if (this.lights[CONFIG.DIRECTIONS.WEST].state === CONFIG.LIGHT_STATES.GREEN ||
                   this.lights[CONFIG.DIRECTIONS.EAST].state === CONFIG.LIGHT_STATES.GREEN) {
            return 'WE';
        }
        return null;
    }

    render(ctx, intersection) {
        const directions = ['north', 'south', 'east', 'west'];
        directions.forEach(direction => {
            const state = this.lights[CONFIG.DIRECTIONS[direction.toUpperCase()]].state;
            this.renderTrafficLight(ctx, direction, state, intersection);
        });
    }

    renderTrafficLight(ctx, direction, state, intersection) {
        const position = intersection.getLightPosition(direction);
        if (!position) return;

        const lightSize = CONFIG.LIGHT_SIZE || 12;
        const spacing = lightSize + 2;

        // Draw light housing
        ctx.fillStyle = '#333';
        ctx.fillRect(position.x - lightSize - 1, position.y - spacing * 1.5 - 1, (lightSize + 1) * 2, spacing * 3 + 2);

        // Draw lights
        const lights = ['red', 'yellow', 'green'];
        lights.forEach((color, index) => {
            const lightY = position.y - spacing + (index * spacing);

            // Light background
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(position.x, lightY, lightSize, 0, Math.PI * 2);
            ctx.fill();

            // Active light
            if (state === color) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(position.x, lightY, lightSize - 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    // Public methods for UI and game engine
    getLightStates() {
        const states = {};
        Object.entries(this.lights).forEach(([direction, light]) => {
            states[direction] = light.state;
        });
        return states;
    }

    setMode(mode) {
        this.mode = mode;
        this.reset();
    }

    updateSettings(settings) {
        this.settings = settings;
    }

    isRedLight(direction) {
        return this.lights[direction].state === CONFIG.LIGHT_STATES.RED;
    }

    canProceed(direction) {
        const state = this.lights[direction].state;
        return state === CONFIG.LIGHT_STATES.GREEN || state === CONFIG.LIGHT_STATES.YELLOW;
    }
}