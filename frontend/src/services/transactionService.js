// Transaction service for monitoring crypto transactions
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class TransactionService {
  // Submit transaction for verification
  async submitForVerification(txData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(txData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to verify transaction');
      }

      return data;
    } catch (error) {
      console.error('Error submitting transaction for verification:', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async submitForMonitoring(txData) {
    return this.submitForVerification(txData);
  }

  // Get transaction monitoring stats
  async getMonitoringStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('Error getting monitoring stats:', error);
      return null;
    }
  }

  // Get user's transactions
  async getUserTransactions(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/user/${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  // Get all transactions (admin only)
  async getAllTransactions(adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions?adminId=${adminId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting all transactions:', error);
      return [];
    }
  }

  // Transaction monitoring methods removed - use real API endpoints
}

const transactionService = new TransactionService();
export default transactionService;