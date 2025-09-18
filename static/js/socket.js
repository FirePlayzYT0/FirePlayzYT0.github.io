// ===== WEBSOCKET MANAGER =====
// Robust WebSocket handling with fallback mechanisms

class SocketManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.isConnected = false;
        this.eventCallbacks = new Map();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.connect();
    }

    connect() {
        try {
            console.log('Connecting to WebSocket server...');
            
            this.socket = io({
                transports: ['websocket', 'polling'],
                upgrade: true,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                forceNew: true
            });

            this.setupSocketEvents();
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.handleConnectionError();
        }
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected successfully');
            this.handleConnect();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
            this.handleDisconnect(reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            this.handleConnectionError(error);
        });

        this.socket.on('reconnect', (attempt) => {
            console.log(`🔁 Reconnected after ${attempt} attempts`);
            this.handleReconnect(attempt);
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            console.log(`🔄 Reconnection attempt ${attempt}`);
            this.handleReconnectAttempt(attempt);
        });

        this.socket.on('reconnect_error', (error) => {
            console.error('Reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('Reconnection failed');
            this.handleReconnectFailed();
        });

        // Custom event handlers
        this.socket.on('stats_update', (data) => {
            this.triggerEvent('stats_update', data);
        });

        this.socket.on('activity_update', (data) => {
            this.triggerEvent('activity_update', data);
        });

        this.socket.on('command_result', (data) => {
            this.triggerEvent('command_result', data);
        });

        this.socket.on('system_alert', (data) => {
            this.triggerEvent('system_alert', data);
        });
    }

    setupEventListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            console.log('Browser came online, attempting reconnect...');
            this.attemptReconnect();
        });

        window.addEventListener('offline', () => {
            console.log('Browser went offline');
            this.handleOffline();
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.isConnected) {
                this.attemptReconnect();
            }
        });
    }

    // ===== EVENT HANDLERS =====
    handleConnect() {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.triggerEvent('connection_change', { connected: true });
        
        // Request initial data
        this.socket.emit('get_initial_data');
    }

    handleDisconnect(reason) {
        this.isConnected = false;
        this.triggerEvent('connection_change', { connected: false, reason });
        
        // Auto-reconnect unless explicitly disconnected
        if (reason !== 'io client disconnect') {
            this.scheduleReconnect();
        }
    }

    handleConnectionError(error) {
        this.triggerEvent('connection_error', { error });
        this.scheduleReconnect();
    }

    handleReconnect(attempt) {
        this.reconnectAttempts = 0;
        this.triggerEvent('reconnect', { attempt });
    }

    handleReconnectAttempt(attempt) {
        this.reconnectAttempts = attempt;
        this.triggerEvent('reconnect_attempt', { attempt });
    }

    handleReconnectFailed() {
        this.triggerEvent('reconnect_failed');
        this.setupPollingFallback();
    }

    handleOffline() {
        this.triggerEvent('offline');
    }

    // ===== RECONNECTION LOGIC =====
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            this.handleReconnectFailed();
            return;
        }

        const delay = this.calculateReconnectDelay();
        console.log(`Scheduling reconnect in ${delay}ms...`);

        setTimeout(() => {
            this.attemptReconnect();
        }, delay);
    }

    calculateReconnectDelay() {
        // Exponential backoff with jitter
        const baseDelay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts), 30000);
        const jitter = Math.random() * 1000;
        return baseDelay + jitter;
    }

    attemptReconnect() {
        if (this.isConnected) return;

        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

        if (this.socket) {
            this.socket.connect();
        } else {
            this.connect();
        }
    }

    // ===== FALLBACK MECHANISMS =====
    setupPollingFallback() {
        console.log('Setting up polling fallback...');
        this.triggerEvent('polling_started');

        // Implement polling logic here
        const pollInterval = setInterval(() => {
            if (this.isConnected) {
                clearInterval(pollInterval);
                return;
            }
            this.pollForUpdates();
        }, 5000);

        this.pollingInterval = pollInterval;
    }

    async pollForUpdates() {
        try {
            const response = await fetch('/api/poll');
            if (response.ok) {
                const data = await response.json();
                this.triggerEvent('polling_update', data);
            }
        } catch (error) {
            console.error('Polling failed:', error);
        }
    }

    // ===== EVENT MANAGEMENT =====
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventCallbacks.has(event)) {
            const callbacks = this.eventCallbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    triggerEvent(event, data) {
        if (this.eventCallbacks.has(event)) {
            this.eventCallbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }

    // ===== PUBLIC METHODS =====
    emit(event, data) {
        if (this.isConnected && this.socket) {
            this.socket.emit(event, data);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.isConnected = false;
    }

    getConnectionStatus() {
        return this.isConnected;
    }

    getReconnectAttempts() {
        return this.reconnectAttempts;
    }

    // ===== CLEANUP =====
    destroy() {
        this.disconnect();
        this.eventCallbacks.clear();
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}

// Initialize socket manager
document.addEventListener('DOMContentLoaded', function() {
    window.socketManager = new SocketManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketManager;
}