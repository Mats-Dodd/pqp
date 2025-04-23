type EventCallback = (...args: any[]) => void;

/**
 * Simple custom event emitter implementation for browser compatibility
 * This replaces Node.js's events.EventEmitter which is not available in the browser
 */
export class EventEmitter {
  private events: Record<string, EventCallback[]> = {};

  /**
   * Register an event listener
   */
  on(event: string, callback: EventCallback): this {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
    return this;
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: EventCallback): this {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    return this;
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): boolean {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args));
      return true;
    }
    return false;
  }

  /**
   * Register a one-time event listener
   */
  once(event: string, callback: EventCallback): this {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };
    return this.on(event, onceCallback);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events[event] = [];
    } else {
      this.events = {};
    }
    return this;
  }
} 