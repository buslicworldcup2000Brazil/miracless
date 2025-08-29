// Analytics service for Miracless
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class AnalyticsService {
  // Get overview statistics
  async getOverview(adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting analytics overview:', error);
      return null;
    }
  }

  // Get daily revenue data
  async getDailyRevenue(adminId, days = 30) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/revenue/daily`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId, days })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting daily revenue:', error);
      return [];
    }
  }

  // Get user statistics
  async getUserStats(adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/users/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  // Get lottery statistics
  async getLotteryStats(adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/lotteries/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting lottery stats:', error);
      return null;
    }
  }

  // Get top users by balance
  async getTopUsersByBalance(adminId, limit = 10) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/users/top-balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId, limit })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting top users by balance:', error);
      return [];
    }
  }

  // Get payment sources statistics
  async getPaymentSources(adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/payments/sources`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting payment sources:', error);
      return [];
    }
  }

  // Get notification statistics
  async getNotificationStats(adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/notifications/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return null;
    }
  }

  // Format data for charts
  formatChartData(data, type = 'line') {
    if (!data || !Array.isArray(data)) return { labels: [], datasets: [] };

    switch (type) {
      case 'line':
      case 'bar':
        return {
          labels: data.map(item => item.date || item.source || item.label),
          datasets: [{
            label: 'Revenue',
            data: data.map(item => item.revenue || item.amount || item.value),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: type === 'line',
            tension: 0.4
          }]
        };

      case 'pie':
      case 'doughnut':
        return {
          labels: data.map(item => item.source || item.label),
          datasets: [{
            data: data.map(item => item.amount || item.value || item.count),
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)'
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        };

      default:
        return { labels: [], datasets: [] };
    }
  }

  // Calculate percentage change
  calculateChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  }

  // Format large numbers
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Get chart animation options
  getChartAnimationOptions() {
    return {
      duration: 1000,
      easing: 'easeInOutQuart',
      delay: (context) => context.dataIndex * 100
    };
  }

  // Get responsive chart options
  getResponsiveOptions(type = 'line') {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#6b7280'
          }
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: '#6b7280',
            callback: (value) => '$' + this.formatNumber(value)
          }
        }
      },
      animation: this.getChartAnimationOptions()
    };

    if (type === 'pie' || type === 'doughnut') {
      return {
        ...baseOptions,
        scales: {},
        plugins: {
          ...baseOptions.plugins,
          legend: {
            position: 'bottom',
            labels: {
              color: '#6b7280',
              usePointStyle: true,
              padding: 20
            }
          }
        }
      };
    }

    return baseOptions;
  }

  // Legacy methods for backward compatibility
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  }

  calculateGrowth(current, previous) {
    return this.calculateChange(current, previous);
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;