import { EventEmitter } from 'events';

// Global Event Emitter for communicating between socket logic and controllers
export const HardwareEvents = new EventEmitter();
