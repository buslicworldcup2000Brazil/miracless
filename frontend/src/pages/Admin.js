import React, { useState, useEffect } from 'react';
import { ChartBarIcon, UsersIcon, PencilIcon, TrashIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import lotteryService from '../services/lotteryService';
import telegramWebApp from '../services/telegramWebApp';
import analyticsService from '../services/analyticsService';
import adminLogsService from '../services/adminLogsService';

const Admin = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedLottery, setSelectedLottery] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [lotteryData, setLotteryData] = useState({
    title: '',
    participationCost: '',
    prizes: [{ place: 1, amount: '', type: 'fixed' }],
    maxParticipants: 100000,
    endDate: ''
  });
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingLottery, setEditingLottery] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showWinnerSelection, setShowWinnerSelection] = useState(false);
  const [selectedLotteryForWinner, setSelectedLotteryForWinner] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [showAdminLogs, setShowAdminLogs] = useState(false);
  const [adminLogs, setAdminLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsSearch, setLogsSearch] = useState('');
  const [adminLevel, setAdminLevel] = useState(null);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [detailedStats, setDetailedStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showFakeUsers, setShowFakeUsers] = useState(false);
  const [fakeUsersData, setFakeUsersData] = useState([]);
  const [fakeUsersLoading, setFakeUsersLoading] = useState(false);
  const [newFakeUser, setNewFakeUser] = useState({
    nickname: '',
    avatar: '',
    balance: 0
  });

  // Determine admin level
  const determineAdminLevel = (adminId) => {
    if (adminId === "5206288199") return 'main';
    if (adminId === "1329896342") return 'restricted';
    return null;
  };

  // Load lotteries on component mount
  useEffect(() => {
    const loadLotteries = async () => {
      try {
        setLoading(true);
        const data = await lotteryService.getLotteries();
        setLotteries(data);

        // Set admin level
        const adminId = "5206288199"; // Main admin ID for production
        setAdminLevel(determineAdminLevel(adminId));
      } catch (error) {
        console.error('Error loading lotteries:', error);
        telegramWebApp.showAlert('Ошибка загрузки лотерей');
      } finally {
        setLoading(false);
      }
    };

    loadLotteries();
  }, []);

  // Load analytics when statistics tab is opened
  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const adminId = "5206288199"; // Main admin ID for production
      const data = await analyticsService.getAnalytics(adminId);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      telegramWebApp.showAlert('Ошибка загрузки аналитики');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Load analytics when statistics section is opened
  useEffect(() => {
    if (showStatistics && !analytics) {
      loadAnalytics();
    }
  }, [showStatistics, analytics]);

  // Load admin logs when logs section is opened
  const loadAdminLogs = async (searchQuery = '') => {
    try {
      setLogsLoading(true);
      const adminId = "5206288199"; // Main admin ID for production
      let logs;

      if (searchQuery.trim()) {
        logs = await adminLogsService.searchLogs(adminId, searchQuery);
      } else {
        const result = await adminLogsService.getLogs(adminId);
        logs = result.data;
      }

      setAdminLogs(logs);
    } catch (error) {
      console.error('Error loading admin logs:', error);
      telegramWebApp.showAlert('Ошибка загрузки логов');
    } finally {
      setLogsLoading(false);
    }
  };

  // Load logs when logs section is opened
  useEffect(() => {
    if (showAdminLogs && adminLogs.length === 0) {
      loadAdminLogs();
    }
  }, [showAdminLogs, adminLogs.length]);

  // Load detailed statistics
  const loadDetailedStats = async () => {
    try {
      setStatsLoading(true);
      const adminId = "5206288199"; // Main admin ID for production
      const data = await analyticsService.getAnalytics(adminId);
      setDetailedStats(data);
    } catch (error) {
      console.error('Error loading detailed stats:', error);
      telegramWebApp.showAlert('Ошибка загрузки детальной статистики');
    } finally {
      setStatsLoading(false);
    }
  };

  // Load detailed stats when section is opened
  useEffect(() => {
    if (showDetailedStats && !detailedStats) {
      loadDetailedStats();
    }
  }, [showDetailedStats, detailedStats]);

  // Load fake users - removed for production
  const loadFakeUsers = async () => {
    setFakeUsersLoading(true);
    setFakeUsersData([]);
    setFakeUsersLoading(false);
    telegramWebApp.showAlert('Fake users functionality removed for production');
  };

  // Load fake users when section is opened
  useEffect(() => {
    if (showFakeUsers && fakeUsersData.length === 0) {
      loadFakeUsers();
    }
  }, [showFakeUsers, fakeUsersData.length]);

  // Handle search
  const handleLogsSearch = (e) => {
    e.preventDefault();
    loadAdminLogs(logsSearch);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLotteryData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLotterySubmit = async (e) => {
    e.preventDefault();

    try {
      const adminId = "5206288199"; // Main admin ID for production

      if (editingLottery) {
        // Update existing lottery
        await lotteryService.updateLottery(editingLottery.id, lotteryData, adminId);
        telegramWebApp.showAlert('Лотерея обновлена!');
      } else {
        // Create new lottery
        await lotteryService.createLottery(lotteryData, adminId);
        telegramWebApp.showAlert('Лотерея создана!');
      }

      // Reload lotteries
      const data = await lotteryService.getLotteries();
      setLotteries(data);

      // Reset form
      setLotteryData({
        title: '',
        participationCost: '',
        prizes: [{ place: 1, amount: '', type: 'fixed' }],
        maxParticipants: 100000,
        endDate: ''
      });
      setEditingLottery(null);
      setShowCreateForm(false);

    } catch (error) {
      console.error('Error saving lottery:', error);
      telegramWebApp.showAlert('Ошибка сохранения лотереи: ' + error.message);
    }
  };

  const handleEditLottery = (lottery) => {
    setLotteryData({
      title: lottery.title,
      participationCost: lottery.participationCost || '',
      prizes: lottery.prizes || [{ place: 1, amount: '', type: 'fixed' }],
      maxParticipants: lottery.maxParticipants || 100000,
      endDate: lottery.endDate || ''
    });
    setEditingLottery(lottery);
    setShowCreateForm(true);
  };

  const handleDeleteLottery = async (lotteryId) => {
    const confirmed = await new Promise((resolve) => {
      telegramWebApp.showConfirm('Вы уверены, что хотите удалить эту лотерею?', resolve);
    });

    if (!confirmed) {
      return;
    }

    try {
      const adminId = "5206288199"; // Main admin ID for production
      await lotteryService.deleteLottery(lotteryId, adminId);

      // Reload lotteries
      const data = await lotteryService.getLotteries();
      setLotteries(data);

      telegramWebApp.showAlert('Лотерея удалена!');
    } catch (error) {
      console.error('Error deleting lottery:', error);
      telegramWebApp.showAlert('Ошибка удаления лотереи: ' + error.message);
    }
  };

  const handleSelectWinner = (lottery) => {
    setSelectedLotteryForWinner(lottery);
    setSelectedWinner(null);
    setShowWinnerSelection(true);
  };

  const handleWinnerSelection = async () => {
    if (!selectedWinner || !selectedLotteryForWinner) {
      telegramWebApp.showAlert('Выберите победителя!');
      return;
    }

    try {
      const adminId = "5206288199"; // Main admin ID for production
      await lotteryService.selectWinner(selectedLotteryForWinner.id, selectedWinner, adminId);

      // Reload lotteries
      const data = await lotteryService.getLotteries();
      setLotteries(data);

      setShowWinnerSelection(false);
      setSelectedLotteryForWinner(null);
      setSelectedWinner(null);

      telegramWebApp.showAlert('Победитель выбран! Уведомления отправлены.');
      telegramWebApp.hapticFeedback('success');
    } catch (error) {
      console.error('Error selecting winner:', error);
      telegramWebApp.showAlert('Ошибка выбора победителя: ' + error.message);
    }
  };

  const handleRandomWinner = () => {
    if (!selectedLotteryForWinner || !selectedLotteryForWinner.participants || selectedLotteryForWinner.participants.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * selectedLotteryForWinner.participants.length);
    setSelectedWinner(selectedLotteryForWinner.participants[randomIndex]);
  };

  const handleAddParticipantClick = (lottery) => {
    setSelectedLottery(lottery.id);
    setManualUserId('');
    setShowAddParticipant(true);
  };

  const handleAddParticipant = async () => {
    if (!manualUserId.trim()) {
      telegramWebApp.showAlert('Введите ID пользователя!');
      return;
    }

    if (!selectedLottery) {
      telegramWebApp.showAlert('Выберите лотерею!');
      return;
    }

    try {
      const adminId = "5206288199"; // Main admin ID for production
      await lotteryService.addParticipant(selectedLottery, manualUserId.trim(), adminId);

      // Reload lotteries
      const data = await lotteryService.getLotteries();
      setLotteries(data);

      setShowAddParticipant(false);
      setManualUserId('');
      setSelectedLottery('');

      telegramWebApp.showAlert('Участник добавлен!');
      telegramWebApp.hapticFeedback('success');
    } catch (error) {
      console.error('Error adding participant:', error);
      telegramWebApp.showAlert('Ошибка добавления участника: ' + error.message);
    }
  };

  const handleCompleteLottery = async (lotteryId) => {
    const confirmed = await new Promise((resolve) => {
      telegramWebApp.showConfirm('Вы уверены, что хотите завершить эту лотерею?', resolve);
    });

    if (!confirmed) {
      return;
    }

    try {
      const adminId = "5206288199"; // Main admin ID for production
      await lotteryService.completeLotteryManually(lotteryId, adminId);

      // Reload lotteries
      const data = await lotteryService.getLotteries();
      setLotteries(data);

      telegramWebApp.showAlert('Лотерея завершена! Уведомления отправлены.');
      telegramWebApp.hapticFeedback('success');
    } catch (error) {
      console.error('Error completing lottery:', error);
      telegramWebApp.showAlert('Ошибка завершения лотереи: ' + error.message);
    }
  };


  const handleAddUsersToLottery = () => {
    if (selectedUsers.length > 0 && selectedLottery) {
      console.log(`Adding users ${selectedUsers.join(', ')} to lottery ${selectedLottery}`);
      // Здесь будет логика добавления пользователей в лотерею
      setSelectedUsers([]);
      setSelectedLottery('');
    }
  };

  // Handle creating new fake user - removed for production
  const handleCreateFakeUser = async () => {
    telegramWebApp.showAlert('Fake users functionality removed for production');
  };

  // Handle deleting fake user - removed for production
  const handleDeleteFakeUser = async (userId) => {
    telegramWebApp.showAlert('Fake users functionality removed for production');
  };

  // Handle bulk create fake users - removed for production
  const handleBulkCreateFakeUsers = async (count) => {
    telegramWebApp.showAlert('Fake users functionality removed for production');
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Panel</h1>
      </div>

      <div className="admin-actions">
        {adminLevel === 'main' && (
          <button
            className="btn-admin-action"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            Create Lottery
          </button>
        )}

        {adminLevel === 'main' && (
          <button
            className="btn-admin-action"
            onClick={() => setShowFakeUsers(!showFakeUsers)}
          >
            <UsersIcon width={20} height={20} />
            Fake Users
          </button>
        )}

        <button
          className="btn-admin-action"
          onClick={() => setShowDetailedStats(!showDetailedStats)}
        >
          <ChartBarIcon width={20} height={20} />
          Detailed Stats
        </button>

        <button
          className="btn-admin-action"
          onClick={() => setShowAdminLogs(!showAdminLogs)}
        >
          <DocumentTextIcon width={20} height={20} />
          Admin Logs
        </button>

        <div className="admin-level-indicator">
          <span className={`admin-level ${adminLevel}`}>
            {adminLevel === 'main' ? 'Main Admin' : 'Restricted Admin'}
          </span>
        </div>
      </div>

      {/* Lotteries List */}
      <div className="lotteries-management">
        <h2>Lottery Management</h2>
        {loading ? (
          <div className="loading-spinner"></div>
        ) : lotteries.length === 0 ? (
          <p>No lotteries created</p>
        ) : (
          <div className="lotteries-list">
            {lotteries.map(lottery => (
              <div key={lottery.id} className="lottery-item-admin">
                <div className="lottery-info">
                  <h3>{lottery.title}</h3>
                  <div className="lottery-details">
                    <span>Стоимость: ${lottery.participationCost || '0'}</span>
                    <span>Участников: {lottery.participants?.length || 0} / {lottery.maxParticipants || '∞'}</span>
                    <span>Статус: {lottery.status === 'active' ? 'Активна' : lottery.status === 'completed' ? 'Завершена' : 'Неактивна'}</span>
                    {lottery.endDate && (
                      <span>До: {new Date(lottery.endDate).toLocaleDateString('ru-RU')}</span>
                    )}
                  </div>
                </div>
                <div className="lottery-actions-admin">
                  {adminLevel === 'main' && lottery.status === 'active' && (
                    <button
                      className="btn-add-participant"
                      onClick={() => handleAddParticipantClick(lottery)}
                      title="Добавить участника"
                    >
                      👤 Добавить
                    </button>
                  )}
                  {adminLevel === 'main' && lottery.status === 'active' && lottery.participants && lottery.participants.length > 0 && (
                    <>
                      <button
                        className="btn-winner"
                        onClick={() => handleSelectWinner(lottery)}
                        title="Выбрать победителя"
                      >
                        🏆 Победитель
                      </button>
                      <button
                        className="btn-complete"
                        onClick={() => handleCompleteLottery(lottery.id)}
                        title="Завершить лотерею"
                      >
                        ✅ Завершить
                      </button>
                    </>
                  )}
                  {adminLevel === 'main' && lottery.status === 'active' && (!lottery.participants || lottery.participants.length === 0) && (
                    <button
                      className="btn-edit"
                      onClick={() => handleEditLottery(lottery)}
                      title="Редактировать (только до начала лотереи)"
                    >
                      <PencilIcon width={16} height={16} />
                    </button>
                  )}
                  {adminLevel === 'main' && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteLottery(lottery.id)}
                      title="Удалить"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  )}
                  {adminLevel === 'restricted' && (
                    <span className="restricted-notice">Только просмотр</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateForm && adminLevel === 'main' && (
        <div className="lottery-form">
          <div className="form-header">
            <h2>{editingLottery ? 'Edit Lottery' : 'Create New Lottery'}</h2>
            <p className="form-subtitle">
              {editingLottery ? 'Modify lottery details' : 'Set up a new lottery for participants'}
            </p>
          </div>

          <form onSubmit={handleLotterySubmit} className="lottery-form-content">
            <div className="form-section">
              <h3>Basic Information</h3>

              <div className="form-group">
                <label>Lottery Title</label>
                <input
                  type="text"
                  name="title"
                  value={lotteryData.title}
                  onChange={handleInputChange}
                  placeholder="Enter lottery name"
                  required
                  minLength="3"
                  maxLength="100"
                />
                <span className="field-hint">Choose a clear, descriptive name</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Entry Cost ($)</label>
                  <input
                    type="number"
                    name="participationCost"
                    value={lotteryData.participationCost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max="1000"
                    required
                  />
                  <span className="field-hint">Cost per participant</span>
                </div>

                <div className="form-group">
                  <label>Max Participants</label>
                  <input
                    type="number"
                    name="maxParticipants"
                    value={lotteryData.maxParticipants}
                    onChange={handleInputChange}
                    placeholder="1000"
                    min="2"
                    max="100000"
                    required
                  />
                  <span className="field-hint">Maximum allowed participants</span>
                </div>
              </div>

              <div className="form-group">
                <label>End Date</label>
                <input
                  type="datetime-local"
                  name="endDate"
                  value={lotteryData.endDate}
                  onChange={handleInputChange}
                  min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                  required
                />
                <span className="field-hint">When the lottery will automatically close</span>
              </div>
            </div>

            <div className="form-section">
              <h3>Prize Structure</h3>
              <div className="prizes-section">
                {lotteryData.prizes.map((prize, index) => (
                  <div key={index} className="prize-item">
                    <div className="prize-input-group">
                      <div className="prize-field">
                        <label>Place</label>
                        <input
                          type="number"
                          placeholder="1"
                          value={prize.place}
                          onChange={(e) => {
                            const newPrizes = [...lotteryData.prizes];
                            newPrizes[index].place = parseInt(e.target.value) || 1;
                            setLotteryData({...lotteryData, prizes: newPrizes});
                          }}
                          min="1"
                          max="100"
                          required
                        />
                      </div>

                      <div className="prize-field">
                        <label>Prize Amount ($)</label>
                        <input
                          type="number"
                          placeholder="100.00"
                          value={prize.amount}
                          onChange={(e) => {
                            const newPrizes = [...lotteryData.prizes];
                            newPrizes[index].amount = parseFloat(e.target.value) || 0;
                            setLotteryData({...lotteryData, prizes: newPrizes});
                          }}
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </div>

                      <div className="prize-field">
                        <label>Type</label>
                        <select
                          value={prize.type}
                          onChange={(e) => {
                            const newPrizes = [...lotteryData.prizes];
                            newPrizes[index].type = e.target.value;
                            setLotteryData({...lotteryData, prizes: newPrizes});
                          }}
                        >
                          <option value="fixed">Fixed Amount</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>

                      {lotteryData.prizes.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-prize"
                          onClick={() => {
                            const newPrizes = lotteryData.prizes.filter((_, i) => i !== index);
                            setLotteryData({...lotteryData, prizes: newPrizes});
                          }}
                          title="Remove prize"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-add-prize"
                  onClick={() => {
                    const newPrize = {
                      place: lotteryData.prizes.length + 1,
                      amount: '',
                      type: 'fixed'
                    };
                    setLotteryData({
                      ...lotteryData,
                      prizes: [...lotteryData.prizes, newPrize]
                    });
                  }}
                >
                  Add Prize Place
                </button>
              </div>
            </div>

            <div className="form-validation">
              <div className="validation-summary">
                <h4>Lottery Summary</h4>
                <div className="summary-item">
                  <span>Total Prize Pool:</span>
                  <span className="summary-value">
                    ${lotteryData.prizes.reduce((sum, prize) => sum + (parseFloat(prize.amount) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="summary-item">
                  <span>Entry Cost:</span>
                  <span className="summary-value">${parseFloat(lotteryData.participationCost || 0).toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span>Max Participants:</span>
                  <span className="summary-value">{lotteryData.maxParticipants}</span>
                </div>
                <div className="summary-item">
                  <span>Potential Revenue:</span>
                  <span className="summary-value">
                    ${(parseFloat(lotteryData.participationCost || 0) * parseInt(lotteryData.maxParticipants || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingLottery(null);
                  setLotteryData({
                    title: '',
                    participationCost: '',
                    prizes: [{ place: 1, amount: '', type: 'fixed' }],
                    maxParticipants: 1000,
                    endDate: ''
                  });
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={!lotteryData.title || !lotteryData.participationCost || !lotteryData.endDate}
              >
                {editingLottery ? 'Save Changes' : 'Create Lottery'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCharacterForm && adminLevel === 'main' && (
        <div className="character-form">
          <h2>Fake Users</h2>
          <div className="fake-users-list">
            <p>Выберите пользователей для добавления в лотереи:</p>
            <div className="users-selection">
              <p>Fake users functionality removed for production</p>
            </div>
            <div className="lottery-selection">
              <label>Выберите лотерею:</label>
              <select 
                value={selectedLottery}
                onChange={(e) => setSelectedLottery(e.target.value)}
              >
                <option value="">Выберите лотерею</option>
                {lotteries.map(lottery => (
                  <option key={lottery.id} value={lottery.id}>{lottery.title}</option>
                ))}
              </select>
            </div>
            <button 
              className="btn-submit"
              onClick={handleAddUsersToLottery}
              disabled={selectedUsers.length === 0 || !selectedLottery}
            >
              Добавить в лотерею ({selectedUsers.length} выбрано)
            </button>
          </div>
        </div>
      )}

      {showStatistics && (
        <div className="statistics-section">
          <h2>Детальная статистика</h2>

          {analyticsLoading ? (
            <div className="loading-spinner"></div>
          ) : analytics ? (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Общий баланс</h3>
                  <p className="stat-value">{analyticsService.formatCurrency(analytics.overview.totalBalance)}</p>
                </div>
                <div className="stat-card">
                  <h3>Всего пользователей</h3>
                  <p className="stat-value">{analytics.overview.totalUsers}</p>
                </div>
                <div className="stat-card">
                  <h3>Активные пользователи</h3>
                  <p className="stat-value">{analytics.overview.activeUsers}</p>
                </div>
                <div className="stat-card">
                  <h3>Общий доход</h3>
                  <p className="stat-value">{analyticsService.formatCurrency(analytics.overview.totalRevenue)}</p>
                </div>
                <div className="stat-card">
                  <h3>Активные лотереи</h3>
                  <p className="stat-value">{analytics.overview.activeLotteries}</p>
                </div>
                <div className="stat-card">
                  <h3>Завершенные лотереи</h3>
                  <p className="stat-value">{analytics.overview.completedLotteries}</p>
                </div>
                <div className="stat-card">
                  <h3>Всего участников</h3>
                  <p className="stat-value">{analytics.overview.totalParticipants}</p>
                </div>
                <div className="stat-card">
                  <h3>Транзакций</h3>
                  <p className="stat-value">{analytics.overview.totalTransactions}</p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="recent-transactions">
                <h3>Последние транзакции</h3>
                {analytics.recentTransactions && analytics.recentTransactions.length > 0 ? (
                  <div className="transactions-list">
                    {analytics.recentTransactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="transaction-item">
                        <div className="transaction-info">
                          <span className="transaction-amount">
                            {analyticsService.formatCurrency(tx.usdAmount || 0)}
                          </span>
                          <span className="transaction-user">ID: {tx.userId}</span>
                        </div>
                        <div className="transaction-date">
                          {tx.processedAt ? analyticsService.formatDate(tx.processedAt) : 'Неизвестно'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Нет транзакций</p>
                )}
              </div>

              {/* Top Users */}
              <div className="top-users">
                <h3>Топ пользователей по балансу</h3>
                {analytics.topUsers && analytics.topUsers.length > 0 ? (
                  <div className="users-list">
                    {analytics.topUsers.slice(0, 5).map((user, index) => (
                      <div key={user.id} className="user-item">
                        <span className="user-rank">#{index + 1}</span>
                        <span className="user-id">ID: {user.id}</span>
                        <span className="user-balance">
                          {analyticsService.formatCurrency(user.balance || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Нет пользователей</p>
                )}
              </div>
            </>
          ) : (
            <p>Ошибка загрузки данных</p>
          )}
          
          <div className="financial-stats">
            <h3>Финансовая статистика</h3>
            <div className="financial-grid">
              <div className="financial-item">
                <span>День:</span>
                <span>$0.00</span>
              </div>
              <div className="financial-item">
                <span>Неделя:</span>
                <span>$0.00</span>
              </div>
              <div className="financial-item">
                <span>2 недели:</span>
                <span>$0.00</span>
              </div>
              <div className="financial-item">
                <span>Месяц:</span>
                <span>$0.00</span>
              </div>
              <div className="financial-item">
                <span>3 месяца:</span>
                <span>$0.00</span>
              </div>
              <div className="financial-item">
                <span>6 месяцев:</span>
                <span>$0.00</span>
              </div>
              <div className="financial-item">
                <span>Год:</span>
                <span>$0.00</span>
              </div>
              <div className="financial-item">
                <span>Все время:</span>
                <span>$0.00</span>
              </div>
            </div>
          </div>
          
          <div className="charts-section">
            <h3>Графики активности</h3>
            <div className="chart-placeholder">
              {/* Здесь будет график регистраций */}
              <p>График регистраций реальных пользователей</p>
              <div className="chart-animation">
                <div className="chart-bar" style={{height: '20%'}}></div>
                <div className="chart-bar" style={{height: '40%'}}></div>
                <div className="chart-bar" style={{height: '60%'}}></div>
                <div className="chart-bar" style={{height: '80%'}}></div>
                <div className="chart-bar" style={{height: '100%'}}></div>
                <div className="chart-bar" style={{height: '70%'}}></div>
                <div className="chart-bar" style={{height: '50%'}}></div>
              </div>
            </div>
            <div className="chart-placeholder">
              {/* Здесь будет график финансов */}
              <p>График финансовой активности</p>
              <div className="chart-animation">
                <div className="chart-line" style={{width: '20%'}}></div>
                <div className="chart-line" style={{width: '40%'}}></div>
                <div className="chart-line" style={{width: '60%'}}></div>
                <div className="chart-line" style={{width: '80%'}}></div>
                <div className="chart-line" style={{width: '100%'}}></div>
                <div className="chart-line" style={{width: '70%'}}></div>
                <div className="chart-line" style={{width: '50%'}}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Logs Section */}
      {showAdminLogs && (
        <div className="admin-logs-section">
          <h2>Логи действий админов</h2>

          {/* Search */}
          <div className="logs-search">
            <form onSubmit={handleLogsSearch}>
              <input
                type="text"
                placeholder="Поиск по действиям..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="btn-search">
                🔍 Поиск
              </button>
            </form>
          </div>

          {/* Logs List */}
          {logsLoading ? (
            <div className="loading-spinner"></div>
          ) : adminLogs.length > 0 ? (
            <div className="logs-list">
              {adminLogs.map(log => (
                <div key={log.id} className={`log-item log-${adminLogsService.getActionType(log.action)}`}>
                  <div className="log-header">
                    <span className="log-admin">Админ: {log.adminId}</span>
                    <span className="log-timestamp">
                      {adminLogsService.formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <div className="log-action">
                    {adminLogsService.getActionDescription(log.action)}
                  </div>
                  <div className="log-details">
                    {log.action}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Логи не найдены</p>
          )}
        </div>
      )}

      {/* Winner Selection Modal */}
      {showWinnerSelection && selectedLotteryForWinner && (
        <div className="winner-selection-modal">
          <div className="modal-content">
            <h2>Выбор победителя</h2>
            <h3>{selectedLotteryForWinner.title}</h3>

            <div className="participants-list">
              <div className="participants-header">
                <span>Участники ({selectedLotteryForWinner.participants?.length || 0})</span>
                <button
                  className="btn-random"
                  onClick={handleRandomWinner}
                  disabled={!selectedLotteryForWinner.participants || selectedLotteryForWinner.participants.length === 0}
                >
                  🎲 Случайный выбор
                </button>
              </div>

              <div className="participants-grid">
                {selectedLotteryForWinner.participants && selectedLotteryForWinner.participants.length > 0 ? (
                  selectedLotteryForWinner.participants.map((participantId, index) => (
                    <div
                      key={participantId}
                      className={`participant-card ${selectedWinner === participantId ? 'selected' : ''}`}
                      onClick={() => setSelectedWinner(participantId)}
                    >
                      <div className="participant-number">#{index + 1}</div>
                      <div className="participant-id">ID: {participantId}</div>
                      {selectedWinner === participantId && (
                        <div className="winner-badge">🏆 ПОБЕДИТЕЛЬ</div>
                      )}
                    </div>
                  ))
                ) : (
                  <p>Нет участников в этой лотерее</p>
                )}
              </div>
            </div>

            <div className="winner-selection-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowWinnerSelection(false);
                  setSelectedLotteryForWinner(null);
                  setSelectedWinner(null);
                }}
              >
                Отмена
              </button>
              <button
                className="btn-submit"
                onClick={handleWinnerSelection}
                disabled={!selectedWinner}
              >
                Выбрать победителя
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showAddParticipant && (
        <div className="add-participant-modal">
          <div className="modal-content">
            <h2>Добавить участника</h2>

            <div className="form-group">
              <label>ID пользователя Telegram:</label>
              <input
                type="text"
                placeholder="Введите ID пользователя"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                className="manual-user-input"
              />
            </div>

            <div className="form-group">
              <label>Лотерея:</label>
              <select
                value={selectedLottery}
                onChange={(e) => setSelectedLottery(e.target.value)}
              >
                <option value="">Выберите лотерею</option>
                {lotteries
                  .filter(lottery => lottery.status === 'active')
                  .map(lottery => (
                    <option key={lottery.id} value={lottery.id}>
                      {lottery.title} ({lottery.participants?.length || 0}/{lottery.maxParticipants})
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="add-participant-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowAddParticipant(false);
                  setManualUserId('');
                  setSelectedLottery('');
                }}
              >
                Отмена
              </button>
              <button
                className="btn-submit"
                onClick={handleAddParticipant}
                disabled={!manualUserId.trim() || !selectedLottery}
              >
                Добавить участника
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics Section */}
      {showDetailedStats && (
        <div className="detailed-stats-section">
          <div className="section-header">
            <h2>Detailed Statistics</h2>
            <button
              className="btn-close"
              onClick={() => setShowDetailedStats(false)}
            >
              ✕
            </button>
          </div>

          {statsLoading ? (
            <div className="loading-spinner"></div>
          ) : detailedStats ? (
            <div className="detailed-stats-content">
              {/* Overview Stats */}
              <div className="stats-overview">
                <h3>Overview</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <h4>Total Balance</h4>
                    <p className="stat-value">${detailedStats.overview?.totalBalance?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Total Users</h4>
                    <p className="stat-value">{detailedStats.overview?.totalUsers || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Active Users</h4>
                    <p className="stat-value">{detailedStats.overview?.activeUsers || 0}</p>
                  </div>
                  <div className="stat-card">
                    <h4>Total Revenue</h4>
                    <p className="stat-value">${detailedStats.overview?.totalRevenue?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              {/* Revenue Trends */}
              <div className="revenue-trends">
                <h3>Revenue Trends</h3>
                <div className="revenue-charts">
                  <div className="chart-placeholder">
                    <p>Daily Revenue Chart</p>
                    <div className="mini-chart">
                      {detailedStats.revenue?.daily && Object.entries(detailedStats.revenue.daily).slice(-7).map(([date, amount]) => (
                        <div key={date} className="chart-bar" style={{height: `${Math.min(amount * 2, 100)}%`}}>
                          <span className="bar-value">${amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Users */}
              <div className="top-users-section">
                <h3>Top Users by Balance</h3>
                <div className="top-users-list">
                  {detailedStats.topUsers?.slice(0, 10).map((user, index) => (
                    <div key={user.id} className="top-user-item">
                      <span className="rank">#{index + 1}</span>
                      <span className="user-id">ID: {user.id}</span>
                      <span className="user-balance">${user.balance?.toFixed(2) || '0.00'}</span>
                    </div>
                  )) || <p>No users found</p>}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="recent-transactions-section">
                <h3>Recent Transactions</h3>
                <div className="transactions-list">
                  {detailedStats.recentTransactions?.slice(0, 10).map(tx => (
                    <div key={tx.id} className="transaction-item">
                      <div className="tx-info">
                        <span className="tx-amount">${tx.usdAmount?.toFixed(2) || '0.00'}</span>
                        <span className="tx-user">User: {tx.userId}</span>
                      </div>
                      <div className="tx-status">
                        <span className={`status ${tx.status}`}>{tx.status}</span>
                      </div>
                    </div>
                  )) || <p>No recent transactions</p>}
                </div>
              </div>
            </div>
          ) : (
            <p>Error loading statistics</p>
          )}
        </div>
      )}

      {/* Fake Users Management Section */}
      {showFakeUsers && adminLevel === 'main' && (
        <div className="fake-users-section">
          <div className="section-header">
            <h2>Fake Users Management</h2>
            <button
              className="btn-close"
              onClick={() => setShowFakeUsers(false)}
            >
              ✕
            </button>
          </div>

          <div className="fake-users-content">
            {/* Create Single Fake User */}
            <div className="create-fake-user">
              <h3>Create Single Fake User</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Nickname"
                  value={newFakeUser.nickname}
                  onChange={(e) => setNewFakeUser({...newFakeUser, nickname: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Avatar URL (optional)"
                  value={newFakeUser.avatar}
                  onChange={(e) => setNewFakeUser({...newFakeUser, avatar: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Balance"
                  value={newFakeUser.balance}
                  onChange={(e) => setNewFakeUser({...newFakeUser, balance: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                />
                <button
                  className="btn-create"
                  onClick={handleCreateFakeUser}
                  disabled={!newFakeUser.nickname.trim()}
                >
                  Create
                </button>
              </div>
            </div>

            {/* Bulk Create */}
            <div className="bulk-create">
              <h3>Bulk Create Fake Users</h3>
              <div className="bulk-buttons">
                <button
                  className="btn-bulk"
                  onClick={() => handleBulkCreateFakeUsers(10)}
                >
                  Create 10 Users
                </button>
                <button
                  className="btn-bulk"
                  onClick={() => handleBulkCreateFakeUsers(50)}
                >
                  Create 50 Users
                </button>
                <button
                  className="btn-bulk"
                  onClick={() => handleBulkCreateFakeUsers(100)}
                >
                  Create 100 Users
                </button>
              </div>
            </div>

            {/* Existing Fake Users */}
            <div className="existing-fake-users">
              <h3>Existing Fake Users ({fakeUsersData.length})</h3>
              {fakeUsersLoading ? (
                <div className="loading-spinner"></div>
              ) : fakeUsersData.length > 0 ? (
                <div className="fake-users-list">
                  {fakeUsersData.map(user => (
                    <div key={user.id} className="fake-user-item">
                      <img src={user.avatar} alt={user.nickname} className="user-avatar" />
                      <div className="user-info">
                        <span className="nickname">{user.nickname}</span>
                        <span className="balance">${user.balance?.toFixed(2) || '0.00'}</span>
                      </div>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteFakeUser(user.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No fake users created yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
