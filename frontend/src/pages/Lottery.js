import React, { useState, useEffect } from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';
import lotteryService from '../services/lotteryService';
import telegramWebApp from '../services/telegramWebApp';

const Lottery = ({ userId }) => {
  const [lotteries, setLotteries] = useState([]);
  const [participating, setParticipating] = useState({});
  const [showParticipants, setShowParticipants] = useState(false);
  const [selectedLottery, setSelectedLottery] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load lotteries and user balance
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load lotteries
        const lotteriesData = await lotteryService.getLotteries();
        setLotteries(lotteriesData);

        // Load user balance
        if (userId) {
          const balance = await lotteryService.getUserBalance(userId);
          setUserBalance(balance);
        }
      } catch (err) {
        console.error('Error loading lottery data:', err);
        setError('Ошибка загрузки данных лотерей');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const handleParticipate = async (lottery) => {
    if (!userId) {
      telegramWebApp.showAlert('Пользователь не авторизован');
      return;
    }

    if (userBalance < lottery.participationCost) {
      telegramWebApp.showAlert('Недостаточно средств на балансе');
      return;
    }

    setParticipating(prev => ({
      ...prev,
      [lottery.id]: true
    }));

    try {
      await lotteryService.participateInLottery(lottery.id, userId);

      // Update local data
      setLotteries(prev => prev.map(l => {
        if (l.id === lottery.id) {
          return {
            ...l,
            participants: [...l.participants, userId]
          };
        }
        return l;
      }));

      // Update balance
      const newBalance = userBalance - lottery.participationCost;
      setUserBalance(newBalance);

      telegramWebApp.showAlert('Вы успешно участвуете в лотерее!');
      telegramWebApp.hapticFeedback('success');
    } catch (error) {
      console.error('Participation error:', error);
      telegramWebApp.showAlert(error.message || 'Ошибка при участии в лотерее');
      telegramWebApp.hapticFeedback('error');
    } finally {
      setParticipating(prev => ({
        ...prev,
        [lottery.id]: false
      }));
    }
  };

  const handleViewParticipants = (lottery) => {
    setSelectedLottery(lottery);
    setShowParticipants(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  const formatPrize = (prizes) => {
    if (!prizes || prizes.length === 0) return 'Призы не указаны';

    return prizes.map((prize, index) => {
      if (prize.type === 'fixed') {
        return `${index + 1} место: $${prize.amount}`;
      } else if (prize.type === 'percentage') {
        return `${index + 1} место: ${prize.percentage}% от банка`;
      }
      return `${index + 1} место: ${prize.description || 'Приз'}`;
    }).join(', ');
  };

  if (loading) {
    return (
      <div className="lotteries-container">
        <div className="loading-spinner"></div>
        <p>Loading lotteries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lotteries-container">
        <div className="error-message">
          <h3>Ошибка</h3>
          <p>{error}</p>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (showParticipants && selectedLottery) {
    return (
      <div className="participants-section">
        <div className="participants-header">
          <h2>Участники: {selectedLottery.title}</h2>
          <button
            className="btn-secondary"
            onClick={() => setShowParticipants(false)}
          >
            Назад к лотереям
          </button>
        </div>

        <div className="participants-list">
          {selectedLottery.participants && selectedLottery.participants.length > 0 ? (
            selectedLottery.participants.map((participantId, index) => (
              <div key={participantId} className="participant-item">
                <div className="participant-avatar">
                  <span>{index + 1}</span>
                </div>
                <span>ID: {participantId}</span>
              </div>
            ))
          ) : (
            <p>Пока нет участников</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lotteries-container">
      <h2>Active Lotteries</h2>

      {lotteries.length === 0 ? (
        <div className="no-lotteries">
          <p>Сейчас нет активных лотерей</p>
          <p>Следите за обновлениями!</p>
        </div>
      ) : (
        lotteries
          .filter(lottery => lottery.status === 'active')
          .map(lottery => (
            <div key={lottery.id} className="lottery-item">
              <div className="lottery-header">
                <h3 className="lottery-title">{lottery.title}</h3>
                <div className="lottery-price">${lottery.participationCost?.toFixed(2) || '0.00'}</div>
              </div>

              <div className="lottery-info">
                <div className="info-row">
                  <span>👥 Участников: {lottery.participants?.length || 0} / {lottery.maxParticipants || '∞'}</span>
                </div>
                <div className="info-row">
                  <span>🏆 Призы: {formatPrize(lottery.prizes)}</span>
                </div>
                {lottery.endDate && (
                  <div className="info-row">
                    <span>📅 До: {formatDate(lottery.endDate)}</span>
                  </div>
                )}
              </div>

              <div className="lottery-actions">
                <button
                  className="btn-participate"
                  onClick={() => handleParticipate(lottery)}
                  disabled={
                    participating[lottery.id] ||
                    lottery.participants?.includes(userId) ||
                    (userBalance < lottery.participationCost) ||
                    lottery.status !== 'active'
                  }
                >
                  {participating[lottery.id] ? '⏳ Участие...' :
                   lottery.participants?.includes(userId) ? '✅ Участвуете' :
                   userBalance < lottery.participationCost ? '💰 Недостаточно средств' :
                   '🎫 Участвовать'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleViewParticipants(lottery)}
                >
                  <UsersIcon width={16} height={16} />
                  Участники ({lottery.participants?.length || 0})
                </button>
              </div>
            </div>
          ))
      )}

      {lotteries.filter(l => l.status === 'active').length === 0 && lotteries.length > 0 && (
        <div className="completed-lotteries">
          <h3>Завершенные лотереи</h3>
          {lotteries
            .filter(lottery => lottery.status === 'completed')
            .slice(0, 3)
            .map(lottery => (
              <div key={lottery.id} className="lottery-item completed">
                <div className="lottery-header">
                  <h4>{lottery.title}</h4>
                  <span className="winner-badge">
                    🏆 Победитель: {lottery.winner || 'Не определен'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default Lottery;