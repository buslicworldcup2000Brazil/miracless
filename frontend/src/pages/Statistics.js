import React, { useState, useEffect, useCallback } from 'react';
import {
  UsersIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import lotteryService from '../services/lotteryService';
// import analyticsService from '../services/analyticsService'; // Commented out - not used yet
// import notificationService from '../services/notificationService'; // Commented out - not used yet
// Chart.js imports removed - not used in current implementation

const Statistics = ({ userId, isAdmin = false }) => {
  const [stats, setStats] = useState({
    totalLotteries: 0,
    activeLotteries: 0,
    completedLotteries: 0,
    totalParticipants: 0,
    totalPrizePool: 0,
    totalWinners: 0,
    userParticipation: 0,
    userWins: 0,
    userSpent: 0,
    userWon: 0
  });
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  // Analytics data for admin - commented out for now
  // const [analyticsData, setAnalyticsData] = useState(null);
  // const [revenueData, setRevenueData] = useState([]);
  // const [paymentSources, setPaymentSources] = useState([]);
  // const [topUsers, setTopUsers] = useState([]);
  // const [notificationStats, setNotificationStats] = useState(null);
  // const [chartsLoading, setChartsLoading] = useState(false);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);

      // Load lotteries data
      const lotteriesData = await lotteryService.getLotteries();
      setLotteries(lotteriesData);

      // Calculate statistics
      // const now = new Date(); // Commented out - not used
      const periodStart = getPeriodStart(selectedPeriod);

      let filteredLotteries = lotteriesData;
      if (selectedPeriod !== 'all') {
        filteredLotteries = lotteriesData.filter(lottery => {
          const lotteryDate = new Date(lottery.created_at);
          return lotteryDate >= periodStart;
        });
      }

      const statistics = {
        totalLotteries: filteredLotteries.length,
        activeLotteries: filteredLotteries.filter(l => l.status === 'active').length,
        completedLotteries: filteredLotteries.filter(l => l.status === 'completed').length,
        totalParticipants: filteredLotteries.reduce((sum, l) => sum + (l.participants?.length || 0), 0),
        totalPrizePool: filteredLotteries.reduce((sum, l) => {
          const prizes = l.prizes || [];
          return sum + prizes.reduce((prizeSum, prize) => prizeSum + (prize.amount || 0), 0);
        }, 0),
        totalWinners: filteredLotteries.filter(l => l.winner).length,
        userParticipation: 0,
        userWins: 0,
        userSpent: 0,
        userWon: 0
      };

      // Calculate user-specific statistics
      if (userId) {
        statistics.userParticipation = filteredLotteries.filter(l =>
          l.participants?.includes(userId)
        ).length;

        statistics.userWins = filteredLotteries.filter(l =>
          l.winner === userId
        ).length;

        statistics.userSpent = filteredLotteries
          .filter(l => l.participants?.includes(userId))
          .reduce((sum, l) => sum + (l.participationCost || 0), 0);

        statistics.userWon = filteredLotteries
          .filter(l => l.winner === userId)
          .reduce((sum, l) => {
            const prizes = l.prizes || [];
            const userPrize = prizes.find(prize => prize.place === 1); // Assuming 1st place
            return sum + (userPrize?.amount || 0);
          }, 0);
      }

      setStats(statistics);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, userId]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const getPeriodStart = (period) => {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // Beginning of time
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getWinRate = () => {
    if (stats.userParticipation === 0) return 0;
    return ((stats.userWins / stats.userParticipation) * 100).toFixed(1);
  };

  const getProfitLoss = () => {
    return stats.userWon - stats.userSpent;
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="loading-spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h1>Lottery Statistics</h1>
        <div className="period-selector">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-select"
          >
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <TrophyIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>Total Lotteries</h3>
            <p className="stat-value">{formatNumber(stats.totalLotteries)}</p>
            <p className="stat-subtitle">
              {stats.activeLotteries} active, {stats.completedLotteries} completed
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <UsersIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>Total Participants</h3>
            <p className="stat-value">{formatNumber(stats.totalParticipants)}</p>
            <p className="stat-subtitle">Across all lotteries</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <CurrencyDollarIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>Total Prize Pool</h3>
            <p className="stat-value">{formatCurrency(stats.totalPrizePool)}</p>
            <p className="stat-subtitle">Available prizes</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <ArrowTrendingUpIcon className="icon" />
          </div>
          <div className="stat-content">
            <h3>Total Winners</h3>
            <p className="stat-value">{formatNumber(stats.totalWinners)}</p>
            <p className="stat-subtitle">Successful draws</p>
          </div>
        </div>
      </div>

      {/* Personal Statistics */}
      {userId && (
        <div className="personal-stats-section">
          <h2>Your Statistics</h2>
          <div className="personal-stats-grid">
            <div className="personal-stat-card">
              <h4>Participation</h4>
              <p className="personal-stat-value">{stats.userParticipation}</p>
              <p className="personal-stat-label">Lotteries joined</p>
            </div>

            <div className="personal-stat-card">
              <h4>Wins</h4>
              <p className="personal-stat-value">{stats.userWins}</p>
              <p className="personal-stat-label">Lotteries won</p>
            </div>

            <div className="personal-stat-card">
              <h4>Win Rate</h4>
              <p className="personal-stat-value">{getWinRate()}%</p>
              <p className="personal-stat-label">Success rate</p>
            </div>

            <div className="personal-stat-card">
              <h4>Total Spent</h4>
              <p className="personal-stat-value">{formatCurrency(stats.userSpent)}</p>
              <p className="personal-stat-label">Participation cost</p>
            </div>

            <div className="personal-stat-card">
              <h4>Total Won</h4>
              <p className="personal-stat-value">{formatCurrency(stats.userWon)}</p>
              <p className="personal-stat-label">Prize money</p>
            </div>

            <div className="personal-stat-card">
              <h4>Net Result</h4>
              <p className={`personal-stat-value ${getProfitLoss() >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(getProfitLoss())}
              </p>
              <p className="personal-stat-label">Profit/Loss</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Lotteries */}
      <div className="recent-lotteries-section">
        <h2>Recent Lotteries</h2>
        <div className="lotteries-list">
          {lotteries.slice(0, 5).map((lottery) => (
            <div key={lottery.id} className="lottery-item-compact">
              <div className="lottery-info">
                <h4>{lottery.title}</h4>
                <p className="lottery-meta">
                  {lottery.participants?.length || 0} participants •
                  {formatCurrency(lottery.participationCost || 0)} entry
                </p>
              </div>
              <div className="lottery-status">
                <span className={`status-badge ${lottery.status}`}>
                  {lottery.status === 'active' ? 'Active' :
                   lottery.status === 'completed' ? 'Completed' : 'Draft'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Statistics;