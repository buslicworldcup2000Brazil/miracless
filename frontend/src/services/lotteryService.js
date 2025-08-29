// Lottery service for API communication
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class LotteryService {
  // Get all lotteries
  async getLotteries() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error fetching lotteries:', error);
      return [];
    }
  }

  // Participate in a lottery
  async participateInLottery(lotteryId, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries/${lotteryId}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Participation failed');
      }
      return data;
    } catch (error) {
      console.error('Error participating in lottery:', error);
      throw error;
    }
  }

  // Get user balance
  async getUserBalance(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/${userId}/balance`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.balance : 0;
    } catch (error) {
      console.error('Error fetching user balance:', error);
      return 0;
    }
  }

  // Create a new lottery (admin only)
  async createLottery(lotteryData, adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newLotteryData: lotteryData, adminId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create lottery');
      }
      return data.data;
    } catch (error) {
      console.error('Error creating lottery:', error);
      throw error;
    }
  }

  // Update lottery (admin only)
  async updateLottery(lotteryId, updatedData, adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries/${lotteryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updatedData, adminId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update lottery');
      }
      return data;
    } catch (error) {
      console.error('Error updating lottery:', error);
      throw error;
    }
  }

  // Delete lottery (admin only)
  async deleteLottery(lotteryId, adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries/${lotteryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete lottery');
      }
      return data;
    } catch (error) {
      console.error('Error deleting lottery:', error);
      throw error;
    }
  }

  // Draw winner (admin only)
  async drawWinner(lotteryId, adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries/${lotteryId}/draw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to draw winner');
      }
      return data;
    } catch (error) {
      console.error('Error drawing winner:', error);
      throw error;
    }
  }

  // Select winner manually (admin only)
  async selectWinner(lotteryId, winnerId, adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries/${lotteryId}/select-winner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ winnerId, adminId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to select winner');
      }
      return data;
    } catch (error) {
      console.error('Error selecting winner:', error);
      throw error;
    }
  }

  // Add participant manually (admin only)
  async addParticipant(lotteryId, userId, adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries/${lotteryId}/add-participant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, adminId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to add participant');
      }
      return data;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  // Complete lottery manually (admin only)
  async completeLotteryManually(lotteryId, adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/lotteries/${lotteryId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminId })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to complete lottery');
      }
      return data;
    } catch (error) {
      console.error('Error completing lottery manually:', error);
      throw error;
    }
  }
}

const lotteryService = new LotteryService();
export default lotteryService;