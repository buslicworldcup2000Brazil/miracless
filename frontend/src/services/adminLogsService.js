// Admin logs service
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class AdminLogsService {
  // Get admin logs
  async getLogs(adminId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      const response = await fetch(`${API_BASE_URL}/api/admin-logs?adminId=${adminId}&limit=${limit}&offset=${offset}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get admin logs');
      }

      return data;
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      throw error;
    }
  }

  // Get logs for specific admin
  async getLogsByAdmin(adminId, targetAdminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin-logs/admin/${targetAdminId}?adminId=${adminId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get admin logs');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching admin logs by admin:', error);
      throw error;
    }
  }

  // Search logs
  async searchLogs(adminId, query, limit = 20) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin-logs/search?adminId=${adminId}&query=${encodeURIComponent(query)}&limit=${limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to search admin logs');
      }

      return data.data;
    } catch (error) {
      console.error('Error searching admin logs:', error);
      throw error;
    }
  }

  // Format log timestamp
  formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Get action description
  getActionDescription(action) {
    const actionMap = {
      'POST /api/lotteries': 'Create lottery',
      'PUT /api/lotteries': 'Edit lottery',
      'DELETE /api/lotteries': 'Delete lottery',
      'POST /api/lotteries/participate': 'Join lottery',
      'POST /api/lotteries/draw': 'Random winner selection',
      'POST /api/lotteries/select-winner': 'Manual winner selection',
      'POST /api/lotteries/add-participant': 'Add participant',
      'POST /api/lotteries/complete': 'Complete lottery'
    };

    // Try exact match first
    if (actionMap[action]) {
      return actionMap[action];
    }

    // Try pattern matching
    for (const [pattern, description] of Object.entries(actionMap)) {
      if (action.includes(pattern)) {
        return description;
      }
    }

    return action;
  }

  // Get action type for styling
  getActionType(action) {
    if (action.includes('DELETE')) return 'danger';
    if (action.includes('POST') && action.includes('complete')) return 'warning';
    if (action.includes('select-winner') || action.includes('draw')) return 'success';
    if (action.includes('POST')) return 'info';
    if (action.includes('PUT')) return 'warning';
    return 'default';
  }

  // Group logs by date
  groupLogsByDate(logs) {
    const grouped = {};

    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const dateKey = date.toISOString().split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push(log);
    });

    return grouped;
  }

  // Filter logs by action type
  filterLogsByAction(logs, actionType) {
    if (!actionType || actionType === 'all') return logs;

    return logs.filter(log => {
      const logActionType = this.getActionType(log.action);
      return logActionType === actionType;
    });
  }
}

const adminLogsService = new AdminLogsService();
export default adminLogsService;