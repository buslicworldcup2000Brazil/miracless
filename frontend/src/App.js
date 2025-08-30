import React, { useState, useEffect } from 'react';
import './App.css';
import './components/PaymentStyles.css';
import Balance from './pages/Balance';
import Lottery from './pages/Lottery';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Statistics from './pages/Statistics';
import telegramWebApp from './services/telegramWebApp';
import autoRegistrationService from './services/autoRegistrationService';
import {
  HomeIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

function App() {
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [showStartScreen, setShowStartScreen] = useState(false);

  // Initialize Telegram Web App and handle user registration
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Telegram Web App
        const isInTelegram = telegramWebApp.init();

        if (!isInTelegram) {
          console.warn('App is not running in Telegram Web App');
          // Show error for production - no mock data allowed
          setIsLoading(false);
          return;
        }

        // Check if user is already registered
        const isRegistered = await autoRegistrationService.quickRegistrationCheck();

        if (!isRegistered) {
          // Show start screen for new users
          setShowStartScreen(true);
          setIsLoading(false);
          return;
        }

        // User is already registered, load their data
        const registrationData = autoRegistrationService.getRegistrationData();
        if (registrationData) {
          setUserData({
            id: registrationData.telegram_id,
            username: registrationData.username,
            fullName: `${registrationData.first_name} ${registrationData.last_name}`.trim(),
            avatar: registrationData.avatar_url,
            joinDate: new Date(registrationData.created_at).toISOString().split('T')[0]
          });

          // Check if user is admin
          const adminIds = ["1329896342", "5206288199"];
          setIsAdmin(adminIds.includes(registrationData.telegram_id));
        }

      } catch (error) {
        console.error('Error initializing app:', error);
        telegramWebApp.showAlert('Произошла ошибка при запуске приложения.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle start button click
  const handleStartClick = async () => {
    try {
      setIsLoading(true);
      await autoRegistrationService.registerUserOnStart();

      const registrationData = autoRegistrationService.getRegistrationData();
      if (registrationData) {
        setUserData({
          id: registrationData.telegram_id,
          username: registrationData.username,
          fullName: `${registrationData.first_name} ${registrationData.last_name}`.trim(),
          avatar: registrationData.avatar_url,
          joinDate: new Date(registrationData.created_at).toISOString().split('T')[0]
        });

        // Check if user is admin
        const adminIds = ["1329896342", "5206288199"];
        setIsAdmin(adminIds.includes(registrationData.telegram_id));

        setShowStartScreen(false);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      telegramWebApp.showAlert('Ошибка регистрации. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'balance':
        return <Balance userId={userData?.id} />;
      case 'lottery':
        return <Lottery userId={userData?.id} />;
      case 'statistics':
        return <Statistics userId={userData?.id} />;
      case 'profile':
        return <Profile userData={userData} />;
      case 'admin':
        return isAdmin ? <Admin /> : <div className="access-denied">Access denied</div>;
      default:
        return (
          <div className="home-content">
            <h1>Miracless</h1>
            <p>Your premium lottery experience</p>
            <div className="user-welcome">
              <p>Welcome, {userData?.fullName}!</p>
              {userData?.username && <p>@{userData.username}</p>}
            </div>
          </div>
        );
    }
  };

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="App">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Show start screen for new users
  if (showStartScreen) {
    return (
      <div className="App">
        <div className="start-screen">
          <div className="start-content">
            <div className="logo-section">
              <h1>Miracless</h1>
              <p className="tagline">Your premium lottery experience</p>
            </div>

            <div className="features-section">
              <div className="feature-item">
                <span className="feature-icon">🎲</span>
                <span>Join lottery draws</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💰</span>
                <span>Deposit with cryptocurrency</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🏆</span>
                <span>Win real prizes</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span>Instant payouts</span>
              </div>
            </div>

            <div className="start-actions">
              <button
                className="btn-start-primary"
                onClick={handleStartClick}
                disabled={isLoading}
              >
                {isLoading ? 'Registration...' : 'Start Playing'}
              </button>

              <p className="terms-text">
                By clicking "Start Playing", you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer">terms of service</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <main className="app-content">
        {activeTab === 'home' && (
          <div className="home-content">
            <h1>Miracless</h1>
            <p>Your premium lottery experience</p>
            <div className="user-welcome">
              <p>Welcome, {userData.fullName}!</p>
              {userData.username && <p>@{userData.username}</p>}
            </div>
          </div>
        )}
        {activeTab !== 'home' && renderContent()}
      </main>

      <nav className="app-nav">
        <button
          className={activeTab === 'home' ? 'active' : ''}
          onClick={() => setActiveTab('home')}
        >
          <HomeIcon width={20} height={20} />
          Home
        </button>
        <button
          className={activeTab === 'balance' ? 'active' : ''}
          onClick={() => setActiveTab('balance')}
        >
          <CurrencyDollarIcon width={20} height={20} />
          Balance
        </button>
        <button
          className={activeTab === 'lottery' ? 'active' : ''}
          onClick={() => setActiveTab('lottery')}
        >
          <ShieldExclamationIcon width={20} height={20} />
          Lottery
        </button>
        <button
          className={activeTab === 'statistics' ? 'active' : ''}
          onClick={() => setActiveTab('statistics')}
        >
          <ChartBarIcon width={20} height={20} />
          Statistics
        </button>
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          <UserIcon width={20} height={20} />
          Profile
        </button>
        {isAdmin && (
          <button
            className={activeTab === 'admin' ? 'active' : ''}
            onClick={() => setActiveTab('admin')}
          >
            <ShieldExclamationIcon width={20} height={20} />
            Admin
          </button>
        )}
      </nav>
    </div>
  );
}

export default App;