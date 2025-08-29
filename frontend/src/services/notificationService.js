// Notification service for Telegram Mini App
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

class NotificationService {
  // Send lottery win notification
  async sendLotteryWinNotification(userId, lotteryTitle, prizeAmount, lotteryId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/lottery-win`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          lotteryTitle,
          prizeAmount,
          lotteryId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending lottery win notification:', error);
      throw error;
    }
  }

  // Send lottery start notification to all participants
  async sendLotteryStartNotification(lotteryTitle, participants, lotteryId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/lottery-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lotteryTitle,
          participants,
          lotteryId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending lottery start notifications:', error);
      throw error;
    }
  }

  // Send lottery end notification to all participants
  async sendLotteryEndNotification(lotteryTitle, winnerId, participants, lotteryId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/lottery-end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lotteryTitle,
          winnerId,
          participants,
          lotteryId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending lottery end notifications:', error);
      throw error;
    }
  }

  // Send balance update notification
  async sendBalanceUpdateNotification(userId, amount, currency) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/balance-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount,
          currency
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending balance update notification:', error);
      throw error;
    }
  }

  // Get user's notification history
  async getNotificationHistory(userId, limit = 50) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/history/${userId}?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  // Format notification message for display
  formatNotificationMessage(notification) {
    const { type, amount, currency, lotteryTitle, prizeAmount, timestamp } = notification;

    switch (type) {
      case 'lottery_win':
        return {
          title: '🎉 Поздравляем с победой!',
          message: `Вы выиграли $${prizeAmount} в лотерее "${lotteryTitle}"`,
          type: 'success',
          timestamp: timestamp?.toDate?.() || new Date(timestamp)
        };

      case 'lottery_start':
        return {
          title: '🎰 Новая лотерея!',
          message: `Лотерея "${lotteryTitle}" запущена. Участвуйте!`,
          type: 'info',
          timestamp: timestamp?.toDate?.() || new Date(timestamp)
        };

      case 'lottery_end':
        return {
          title: '🏁 Лотерея завершена',
          message: `Результаты лотереи "${lotteryTitle}" доступны`,
          type: 'info',
          timestamp: timestamp?.toDate?.() || new Date(timestamp)
        };

      case 'balance_update':
        return {
          title: '💰 Баланс пополнен',
          message: `+$${amount} ${currency} зачислено на счет`,
          type: 'success',
          timestamp: timestamp?.toDate?.() || new Date(timestamp)
        };

      default:
        return {
          title: '📢 Уведомление',
          message: notification.message || 'Новое уведомление',
          type: 'info',
          timestamp: timestamp?.toDate?.() || new Date(timestamp)
        };
    }
  }

  // Show in-app notification (for Telegram Web App)
  showInAppNotification(message, type = 'info', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `in-app-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">
          ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
        </span>
        <span class="notification-text">${message}</span>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      .in-app-notification {
        cursor: pointer;
        transition: opacity 0.3s ease;
      }
      .in-app-notification:hover {
        opacity: 0.9;
      }
      .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .notification-icon {
        font-size: 16px;
      }
      .notification-text {
        flex: 1;
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after duration
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);

    // Click to dismiss
    notification.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }

  // Request notification permission (for future PWA features)
  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Show browser notification (for PWA)
  showBrowserNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
    return null;
  }
}

const notificationService = new NotificationService();
export default notificationService;