// Fake users service for admin panel
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class FakeUsersService {
  // Get all fake users
  async getFakeUsers(adminId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fake-users?adminId=${adminId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get fake users');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching fake users:', error);
      throw error;
    }
  }

  // Create single fake user
  async createFakeUser(adminId, userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fake-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId,
          ...userData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create fake user');
      }

      return data.data;
    } catch (error) {
      console.error('Error creating fake user:', error);
      throw error;
    }
  }

  // Bulk create fake users
  async bulkCreateFakeUsers(adminId, count) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fake-users/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId,
          count
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to bulk create fake users');
      }

      return data.data;
    } catch (error) {
      console.error('Error bulk creating fake users:', error);
      throw error;
    }
  }

  // Delete fake user
  async deleteFakeUser(adminId, userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fake-users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete fake user');
      }

      return data;
    } catch (error) {
      console.error('Error deleting fake user:', error);
      throw error;
    }
  }

  // Update fake user
  async updateFakeUser(adminId, userId, userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fake-users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminId,
          ...userData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update fake user');
      }

      return data;
    } catch (error) {
      console.error('Error updating fake user:', error);
      throw error;
    }
  }

  // Generate random fake user data
  generateRandomFakeUser(index = 1) {
    const nicknames = [
      'AlexGamer', 'CryptoQueen', 'LuckyDraw', 'FortuneSeeker', 'JackpotHunter',
      'DiamondEyes', 'GoldenTouch', 'SilverFox', 'PlatinumPlayer', 'BronzeBull',
      'RubyRose', 'SapphireSky', 'EmeraldDream', 'PearlDiver', 'CrystalClear'
    ];

    const nickname = nicknames[index % nicknames.length] + (index > nicknames.length ? index : '');

    return {
      nickname,
      avatar: `https://via.placeholder.com/100/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=${nickname.slice(0, 2).toUpperCase()}`,
      balance: Math.floor(Math.random() * 500) + 10 // Random balance between 10 and 510
    };
  }

  // Validate fake user data
  validateFakeUserData(userData) {
    const errors = [];

    if (!userData.nickname || userData.nickname.trim().length < 2) {
      errors.push('Nickname must be at least 2 characters long');
    }

    if (userData.nickname && userData.nickname.length > 50) {
      errors.push('Nickname must be less than 50 characters');
    }

    if (userData.balance !== undefined && (isNaN(userData.balance) || userData.balance < 0)) {
      errors.push('Balance must be a valid positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

const fakeUsersService = new FakeUsersService();
export default fakeUsersService;