# Miracless - Telegram Lottery Bot

## 🚀 Развертывание в Render

### 1. Настройка Backend в Render

1. **Создайте новый сервис в Render:**
   - Выберите "Web Service"
   - Подключите ваш GitHub репозиторий
   - Выберите ветку `main`

2. **Настройки сервиса:**
   ```
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Переменные окружения для Backend:**
   ```env
   PORT=10000
   FIREBASE_SERVICE_ACCOUNT=<ваш_firebase_service_account_json>
   ```

4. **Firebase настройка:**
   - Создайте проект в Firebase Console
   - Включите Firestore Database
   - Создайте сервисный аккаунт и скачайте JSON ключ
   - Добавьте JSON как переменную окружения `FIREBASE_SERVICE_ACCOUNT`

### 2. Настройка Frontend в Render

1. **Создайте Static Site в Render:**
   - Выберите "Static Site"
   - Подключите тот же GitHub репозиторий
   - Укажите папку `frontend/`

2. **Настройки Static Site:**
   ```
   Build Command: npm run build
   Publish Directory: build
   ```

3. **Переменные окружения для Frontend:**
   ```env
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```

### 3. Настройка Telegram Bot

1. **Создайте бота:**
   ```
   @BotFather
   /newbot
   Имя бота: Miracless Lottery Bot
   Username: miracless_lottery_bot
   ```

2. **Получите токен бота от @BotFather**

3. **Настройте Web App:**
   ```
   /setmenubutton
   Bot Username: @miracless_lottery_bot
   Button Text: 🎰 Играть
   Web App URL: https://your-frontend-url.onrender.com
   ```

### 4. Тестирование

**Локальное тестирование:**
```bash
# Установка всех зависимостей
npm run install:all

# Запуск в режиме разработки (backend + frontend)
npm run dev

# Или по отдельности:
# Backend
npm run start:backend

# Frontend (в другом терминале)
npm run start:frontend
```

**Сборка для продакшена:**
```bash
# Сборка frontend
npm run build

# Или из директории frontend
cd frontend && npm run build
```

**Через Telegram:**
1. Откройте Telegram
2. Найдите вашего бота
3. Нажмите кнопку "🎰 Играть"
4. Приложение откроется в WebView

### 5. Структура проекта

```
miracless/
├── frontend/          # React приложение
│   ├── src/
│   │   ├── services/  # API сервисы
│   │   └── pages/     # Страницы приложения
│   └── package.json
├── backend/           # Express сервер
│   ├── src/          # Основная логика
│   ├── api/          # API endpoints
│   └── package.json
└── vercel.json       # Конфигурация (для Vercel)
```

### 6. Администраторы

**Главный администратор:** `5206288199`
- Полный доступ ко всем функциям
- Создание/редактирование/удаление лотерей
- Управление пользователями
- Просмотр статистики

**Ограниченный администратор:** `1329896342`
- Только просмотр лотерей
- Просмотр статистики
- Нет прав на изменения

### 7. API Endpoints

**Основные роуты:**
- `GET /api/lotteries` - Получить все лотереи
- `POST /api/lotteries` - Создать лотерею (главный админ)
- `POST /api/lotteries/:id/participate` - Участвовать в лотерее
- `POST /api/lotteries/:id/draw` - Выбрать победителя (главный админ)

### 8. Переменные окружения

**Backend:**
```env
PORT=10000
FIREBASE_SERVICE_ACCOUNT=<firebase_json>
COINGECKO_API_KEY=<api_key>
```

**Frontend:**
```env
REACT_APP_API_URL=https://your-backend.onrender.com
```

### 9. Мониторинг

- Логи доступны в Render Dashboard
- Firebase Console для просмотра базы данных
- Telegram Bot Logs через @BotFather

---

## 🎯 Быстрый старт

1. **Задеплойте backend в Render**
2. **Задеплойте frontend в Render**
3. **Настройте Telegram бота**
4. **Добавьте переменные окружения**
5. **Тестируйте через Telegram**

Готово! 🎉