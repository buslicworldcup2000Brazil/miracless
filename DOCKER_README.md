# Docker Deployment Guide for Miracless Lottery Bot

## 🚀 Быстрый старт с Docker

### Предварительные требования
- Docker Desktop или Docker Engine
- Docker Compose
- Минимум 2GB RAM
- 5GB свободного места на диске

### 1. Клонирование и настройка

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd miracless-fart

# Создайте .env файл из шаблона
cp .env.docker .env
```

### 2. Настройка переменных окружения

Отредактируйте `.env` файл и укажите ваши реальные API ключи:

```bash
# Обязательные переменные
TELEGRAM_BOT_TOKEN=ваш_токен_бота
DATABASE_URL=postgresql://user:password@postgres:5432/miracless_db

# Рекомендуемые API ключи
TON_API_KEY=ваш_ton_api_ключ
ETH_API_KEY=ваш_etherscan_api_ключ
COINGECKO_API_KEY=ваш_coingecko_api_ключ
```

### 3. Запуск приложения

```bash
# Полная установка и запуск
npm run docker:up

# Или пошагово:
docker-compose up -d postgres  # Сначала база данных
docker-compose up -d backend   # Затем backend
docker-compose up -d frontend  # Наконец frontend
```

### 4. Проверка работы

```bash
# Проверить статус контейнеров
docker-compose ps

# Посмотреть логи
docker-compose logs -f

# Проверить здоровье
curl http://localhost/api/health
curl http://localhost/health
```

## 📋 Доступ к сервисам

После успешного запуска:

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Health Check**: http://localhost/api/health
- **PostgreSQL**: localhost:5432

## 🛠️ Управление контейнерами

```bash
# Остановить все сервисы
npm run docker:down

# Перезапустить конкретный сервис
docker-compose restart backend

# Посмотреть логи конкретного сервиса
docker-compose logs backend

# Очистить все (включая volumes)
docker-compose down -v
```

## 🔧 Разработка с Docker

### Горячая перезагрузка для backend
```bash
# В режиме разработки
docker-compose -f docker-compose.dev.yml up
```

### Сборка образа для продакшена
```bash
# Сборка оптимизированного образа
npm run docker:build

# Запуск в продакшен режиме
npm run docker:run
```

## 📊 Мониторинг и отладка

### Просмотр логов
```bash
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs backend
docker-compose logs postgres

# Следить за логами в реальном времени
docker-compose logs -f backend
```

### Доступ к базе данных
```bash
# Подключиться к PostgreSQL
docker-compose exec postgres psql -U miracless_user -d miracless_db

# Или через внешний клиент
psql postgresql://miracless_user:miracless_password@localhost:5432/miracless_db
```

### Проверка здоровья
```bash
# Health check всех сервисов
curl http://localhost/api/health
curl http://localhost/health

# Проверить статус контейнеров
docker stats
```

## 🚨 Устранение неполадок

### Проблема: "react-scripts: not found"
```bash
# Решение: очистить кэш и пересобрать
docker system prune -a
npm run docker:build
```

### Проблема: "Port already in use"
```bash
# Освободить порт
sudo lsof -ti:3000 | xargs kill -9
# Или изменить порт в docker-compose.yml
```

### Проблема: "Database connection failed"
```bash
# Проверить статус PostgreSQL
docker-compose logs postgres

# Перезапустить базу данных
docker-compose restart postgres
```

### Проблема: "Out of memory"
```bash
# Увеличить лимит памяти Docker
# Docker Desktop: Settings > Resources > Memory
```

## 📁 Структура проекта в Docker

```
miracless-fart/
├── backend/          # Backend API (Node.js + Express)
├── frontend/         # Frontend React App
├── Dockerfile        # Docker образ
├── docker-compose.yml # Конфигурация сервисов
├── nginx.conf        # Nginx конфигурация
├── .dockerignore     # Исключаемые файлы
└── .env.docker       # Шаблон переменных окружения
```

## 🔒 Безопасность

### Переменные окружения
- Никогда не коммитите `.env` файлы
- Используйте разные ключи для разработки и продакшена
- Регулярно обновляйте API ключи

### Сеть
- Контейнеры общаются через внутреннюю сеть Docker
- Внешний доступ только через Nginx (порт 80)
- PostgreSQL доступен только внутри сети

## 📈 Оптимизация

### Для продакшена:
1. Используйте `docker-compose.prod.yml`
2. Настройте volumes для постоянного хранения
3. Включите логирование в файлы
4. Настройте мониторинг (Prometheus + Grafana)

### Резервное копирование:
```bash
# Резервная копия базы данных
docker-compose exec postgres pg_dump -U miracless_user miracless_db > backup.sql

# Восстановление
docker-compose exec -T postgres psql -U miracless_user -d miracless_db < backup.sql
```

## 🎯 Следующие шаги

1. **Настройка домена** - подключите свой домен
2. **SSL сертификат** - настройте HTTPS
3. **Мониторинг** - добавьте логирование и метрики
4. **Резервное копирование** - автоматизируйте бэкапы
5. **Масштабирование** - настройте кластер если нужно

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте здоровье: `curl http://localhost/api/health`
4. Создайте issue в репозитории с логами ошибок