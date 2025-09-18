// ===== MAIN DASHBOARD FUNCTIONALITY =====
// Modern, professional JavaScript for MuseBot Dashboard

class MuseBotDashboard {
    constructor() {
        this.socket = null;
        this.currentStats = {};
        this.commandChart = null;
        this.growthChart = null;
        this.isConnected = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSidebar();
        this.setupTheme();
        this.connectWebSocket();
        this.loadInitialData();
        
        console.log('MuseBot Dashboard initialized');
    }

    // ===== SETUP FUNCTIONS =====
    setupEventListeners() {
        // Sidebar toggle for mobile
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (item.getAttribute('href') === '#') {
                    e.preventDefault();
                }
                this.setActiveNavItem(item);
            });
        });

        // Quick action buttons
        document.querySelectorAll('.action-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.getAttribute('onclick');
                if (action) {
                    // Remove 'onclick' and execute
                    const command = action.replace('onclick=', '').replace(/'/g, '');
                    this.executeCommand(command);
                }
            });
        });

        // Responsive adjustments
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    setupSidebar() {
        // Set active nav item based on current page
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navItem = document.querySelector(`[data-page="${currentPage.replace('.html', '')}"]`);
        if (navItem) {
            this.setActiveNavItem(navItem);
        }
    }

    setupTheme() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // ===== WEBSOCKET FUNCTIONS =====
    connectWebSocket() {
        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                upgrade: true,
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });

            this.socket.on('connect', () => {
                console.log('Connected to server via WebSocket');
                this.isConnected = true;
                this.updateConnectionStatus(true);
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.isConnected = false;
                this.updateConnectionStatus(false);
            });

            this.socket.on('stats_update', (data) => {
                this.updateDashboard(data);
            });

            this.socket.on('activity_update', (data) => {
                this.updateActivityFeed(data);
            });

            this.socket.on('command_result', (data) => {
                this.showNotification(data.message, data.success ? 'success' : 'error');
            });

            this.socket.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.showNotification('Connection error', 'error');
            });

        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.setupPollingFallback();
        }
    }

    setupPollingFallback() {
        console.log('Setting up polling fallback...');
        setInterval(() => {
            this.fetchStats();
        }, 5000); // Poll every 5 seconds
    }

    // ===== DATA HANDLING =====
    async fetchStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const data = await response.json();
                this.updateDashboard(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }

    updateDashboard(data) {
        this.currentStats = data;
        
        // Update statistics cards
        this.updateStatCard('servers-count', data.servers);
        this.updateStatCard('users-count', data.users);
        this.updateStatCard('commands-count', data.commands_used);
        this.updateStatCard('music-players', data.music_players);
        
        // Update system status
        this.updateSystemStatus(data);
        
        // Update bot status
        this.updateBotStatus(data.status);
        
        // Update charts if they exist
        if (this.commandChart) {
            this.updateCommandChart(data);
        }
        
        if (this.growthChart) {
            this.updateGrowthChart(data);
        }
    }

    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animate value change
            this.animateValue(element, parseInt(element.textContent) || 0, value, 1000);
        }
    }

    animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    updateSystemStatus(data) {
        // Update CPU usage
        this.updateProgressBar('cpuUsage', 'cpuProgress', data.cpu_usage);
        
        // Update memory usage (assuming data.memory_usage is like "150MB")
        const memoryValue = parseInt(data.memory_usage) || 0;
        const memoryPercent = Math.min((memoryValue / 1000) * 100, 100); // Assuming 1000MB max
        this.updateProgressBar('memoryUsage', 'memoryProgress', memoryPercent);
        
        // Update latency
        const latency = parseInt(data.latency) || 0;
        const latencyPercent = Math.min((latency / 200) * 100, 100); // Assuming 200ms max
        this.updateProgressBar('latency', 'latencyProgress', latencyPercent);
        
        // Update uptime
        document.getElementById('uptime').textContent = data.uptime;
    }

    updateProgressBar(valueId, progressId, percent) {
        const valueElement = document.getElementById(valueId);
        const progressElement = document.getElementById(progressId);
        
        if (valueElement && progressElement) {
            const numericValue = typeof percent === 'string' ? parseInt(percent) : percent;
            valueElement.textContent = typeof percent === 'string' ? percent : `${percent}%`;
            progressElement.style.width = `${numericValue}%`;
            
            // Update color based on value
            if (numericValue > 80) {
                progressElement.style.background = 'linear-gradient(90deg, var(--danger) 0%, #c94144 100%)';
            } else if (numericValue > 60) {
                progressElement.style.background = 'linear-gradient(90deg, var(--warning) 0%, #d0ad32 100%)';
            } else {
                progressElement.style.background = 'linear-gradient(90deg, var(--primary) 0%, var(--primary-hover) 100%)';
            }
        }
    }

    updateBotStatus(status) {
        const statusElement = document.getElementById('botStatus');
        const statusDot = statusElement?.querySelector('.status-dot');
        
        if (statusElement && statusDot) {
            statusElement.querySelector('span:last-child').textContent = status.charAt(0).toUpperCase() + status.slice(1);
            
            statusDot.className = 'status-dot';
            if (status === 'online') {
                statusDot.classList.add('online');
            } else if (status === 'offline') {
                statusDot.style.background = 'var(--danger)';
            } else {
                statusDot.style.background = 'var(--warning)';
            }
        }
    }

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionIndicator');
        if (indicator) {
            indicator.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
            indicator.style.color = connected ? 'var(--success)' : 'var(--danger)';
        }
    }

    // ===== COMMAND EXECUTION =====
    async executeCommand(command) {
        if (!this.isConnected) {
            this.showNotification('Not connected to bot', 'error');
            return;
        }

        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command })
            });

            const data = await response.json();
            this.showNotification(data.message, data.success ? 'success' : 'error');
            
        } catch (error) {
            console.error('Command execution failed:', error);
            this.showNotification('Failed to execute command', 'error');
        }
    }

    // ===== UI HELPERS =====
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    setActiveNavItem(item) {
        // Remove active class from all items
        document.querySelectorAll('.nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });
        
        // Add active class to clicked item
        item.classList.add('active');
    }

    handleSearch(query) {
        // Implement search functionality
        console.log('Searching for:', query);
        // This would filter commands, servers, etc. based on the query
    }

    handleResize() {
        // Handle responsive adjustments
        if (window.innerWidth < 1024) {
            document.querySelector('.sidebar')?.classList.remove('open');
        }
    }

    async logout() {
        try {
            const response = await fetch('/logout');
            if (response.ok) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // ===== ACTIVITY FEED =====
    updateActivityFeed(activities) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        // Clear existing activities
        activityList.innerHTML = '';

        // Add new activities
        activities.slice(0, 5).forEach(activity => {
            const activityItem = this.createActivityItem(activity);
            activityList.appendChild(activityItem);
        });
    }

    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item';
        
        item.innerHTML = `
            <div class="activity-icon ${activity.type}">
                <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.message}</p>
                <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
            </div>
        `;

        return item;
    }

    getActivityIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new MuseBotDashboard();
});

// ===== GLOBAL FUNCTIONS FOR HTML ONCLICK =====
function executeCommand(command) {
    if (window.dashboard) {
        window.dashboard.executeCommand(command);
    }
}

function showBroadcastModal() {
    const modal = document.getElementById('broadcastModal');
    if (modal) {
        modal.show();
    }
}

function hideBroadcastModal() {
    const modal = document.getElementById('broadcastModal');
    if (modal) {
        modal.hide();
    }
}

function sendBroadcast() {
    const message = document.getElementById('broadcastMessage')?.value;
    if (message) {
        executeCommand(`broadcast ${message}`);
        hideBroadcastModal();
    }
}

function refreshCommands() {
    if (window.dashboard) {
        window.dashboard.fetchStats();
        window.dashboard.showNotification('Commands refreshed', 'success');
    }
}