# Miracless Mini-App

## Overview
Miracless is a Telegram Web App mini-game featuring lotteries and crypto payments integrated directly within the application. Users can participate in lotteries and make crypto payments without leaving the mini-app.

## Features

### 1. Lottery System
- Multiple lottery options with different prize pools
- Telegram-integrated user authentication
- Real-time lottery status updates

### 2. Crypto Payment System
Complete in-app crypto payment solution supporting:
- TON (The Open Network)
- USDT (TRC-20, ERC-20, Polygon)
- ETH (Ethereum)
- BNB (BNB Chain)
- MATIC (Polygon)

#### Key Features:
- Direct wallet connection within the app
- No need to leave the mini-app for payments
- Real-time price conversion to USD
- Automatic transaction confirmation tracking
- Multiple network support

See [CRYPTO_PAYMENT_README.md](CRYPTO_PAYMENT_README.md) for detailed documentation on the crypto payment system.

### 3. User Management
- Telegram Web App integration
- User profile management
- Balance tracking
- Admin panel for authorized users

## Technical Architecture

### Frontend
- React.js with Telegram Web App SDK
- Responsive design for mobile devices
- Custom UI components with HeroIcons
- Environment-based configuration

### Backend
- Node.js with Express.js
- Firebase integration
- Blockchain APIs for payment processing
- Real-time database updates

### Blockchain Integrations
- TonCenter API for TON
- Infura for Ethereum
- GetBlock for BNB Chain
- Polygon RPC for MATIC
- TronGrid for TRON

## Environment Variables
Create a `.env.local` file in the frontend directory with the following variables:

```
REACT_APP_TON_API_KEY=your_ton_api_key
REACT_APP_ETH_API_KEY=your_ethereum_api_key
REACT_APP_BNB_API_URL=your_bnb_api_url
REACT_APP_POLYGON_API_URL=your_polygon_rpc_url
REACT_APP_TRON_API_KEY=your_tron_api_key
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

4. Set up environment variables in both frontend and backend

5. Run the development server:
```bash
# Frontend
cd frontend
npm start

# Backend
cd backend
npm run dev
```

## Project Structure
```
Miracless/
├── backend/
│   ├── api/          # API route handlers
│   ├── src/          # Core backend logic
│   └── package.json  # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Main page components
│   │   ├── services/     # Business logic and API services
│   │   ├── App.js        # Main application component
│   │   └── index.js      # Entry point
│   └── package.json      # Frontend dependencies
└── CRYPTO_PAYMENT_README.md  # Crypto payment documentation
```

## Key Components

### Balance System
Located in `frontend/src/pages/Balance.js`:
- Shows user balance
- Provides payment options
- Integrates crypto payment system

### Lottery System
Located in `frontend/src/pages/Lottery.js`:
- Displays active lotteries
- Allows user participation
- Shows lottery results

### Admin Panel
Located in `frontend/src/pages/Admin.js`:
- User management
- Lottery management
- System monitoring

## Development Guidelines

### Adding New Cryptocurrencies
1. Update `cryptoPayment.js` service with new currency integration
2. Add currency to the supported currencies list
3. Implement wallet connection for the new network
4. Add UI elements in Balance.js

### Adding New Lotteries
1. Update backend lottery logic
2. Add frontend lottery display component
3. Implement participation flow

### Security Considerations
- All API keys should be stored in environment variables
- User data should be validated on both frontend and backend
- Blockchain transactions should be verified before updating user balances

## Deployment
The application is configured for deployment on Vercel:
- Frontend auto-deploys on push to main branch
- Backend deploys as serverless functions
- Environment variables configured in Vercel dashboard

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support
For issues or questions, please:
1. Check the existing issues in the repository
2. Create a new issue with detailed information
3. Contact the development team through Telegram

## License
This project is proprietary and confidential. Unauthorized copying or distribution is prohibited.