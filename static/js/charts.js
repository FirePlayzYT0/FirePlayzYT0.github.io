// ===== CHART.JS CONFIGURATION =====
// Modern, responsive charts for MuseBot Dashboard

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.init();
    }

    init() {
        this.setupChartJS();
        this.createCharts();
        this.setupChartUpdates();
    }

    setupChartJS() {
        // Chart.js global configuration
        Chart.defaults.font.family = "'Inter', 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif";
        Chart.defaults.color = '#b9bbbe';
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
    }

    createCharts() {
        this.createCommandUsageChart();
        this.createServerGrowthChart();
        this.createPerformanceChart();
    }

    createCommandUsageChart() {
        const ctx = document.getElementById('commandChart');
        if (!ctx) return;

        this.commandChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Play', 'Skip', 'Stop', 'Volume', 'Queue', 'Other'],
                datasets: [{
                    label: 'Command Usage',
                    data: [65, 59, 80, 81, 56, 55],
                    backgroundColor: 'rgba(88, 101, 242, 0.8)',
                    borderColor: 'rgba(88, 101, 242, 1)',
                    borderWidth: 1,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(79, 84, 92, 0.3)'
                        },
                        ticks: {
                            color: '#b9bbbe'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#b9bbbe'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });

        this.charts.set('commandUsage', this.commandChart);
    }

    createServerGrowthChart() {
        const ctx = document.getElementById('growthChart');
        if (!ctx) return;

        this.growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Server Growth',
                    data: [65, 78, 90, 81, 96, 105, 120],
                    fill: true,
                    backgroundColor: 'rgba(87, 242, 135, 0.2)',
                    borderColor: 'rgba(87, 242, 135, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointBackgroundColor: 'rgba(87, 242, 135, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        grid: {
                            color: 'rgba(79, 84, 92, 0.3)'
                        },
                        ticks: {
                            color: '#b9bbbe'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#b9bbbe'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });

        this.charts.set('serverGrowth', this.growthChart);
    }

    createPerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        this.performanceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['CPU', 'Memory', 'Network'],
                datasets: [{
                    data: [65, 25, 10],
                    backgroundColor: [
                        'rgba(88, 101, 242, 0.8)',
                        'rgba(87, 242, 135, 0.8)',
                        'rgba(254, 231, 92, 0.8)'
                    ],
                    borderColor: [
                        'rgba(88, 101, 242, 1)',
                        'rgba(87, 242, 135, 1)',
                        'rgba(254, 231, 92, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 6,
                    spacing: 2
                }]
            },
            options: {
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#b9bbbe',
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });

        this.charts.set('performance', this.performanceChart);
    }

    setupChartUpdates() {
        // Simulate real-time updates
        setInterval(() => {
            this.updateChartsWithRandomData();
        }, 5000);
    }

    updateChartsWithRandomData() {
        // Update command usage chart
        if (this.commandChart) {
            this.commandChart.data.datasets[0].data = this.commandChart.data.datasets[0].data.map(
                () => Math.floor(Math.random() * 100) + 20
            );
            this.commandChart.update('none');
        }

        // Update growth chart
        if (this.growthChart) {
            const newData = [...this.growthChart.data.datasets[0].data.slice(1)];
            newData.push(Math.floor(Math.random() * 50) + 80);
            this.growthChart.data.datasets[0].data = newData;
            this.growthChart.update('none');
        }
    }

    updateChartsWithRealData(stats) {
        // This would be called with real data from the server
        if (this.commandChart && stats.command_usage) {
            this.commandChart.data.datasets[0].data = stats.command_usage;
            this.commandChart.update();
        }

        if (this.growthChart && stats.growth_data) {
            this.growthChart.data.datasets[0].data = stats.growth_data;
            this.growthChart.update();
        }
    }

    destroy() {
        this.charts.forEach(chart => {
            chart.destroy();
        });
        this.charts.clear();
    }
}

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chartManager = new ChartManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartManager;
}