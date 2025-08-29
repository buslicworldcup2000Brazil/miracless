// Transaction monitoring service
const https = require('https');
const admin = require("firebase-admin");

let db;
try {
    const serviceAccount = require("../serviceAccountKey.json");
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    db = admin.firestore();
    console.log("Firebase Firestore (Transaction Monitor): Initialized.");
} catch (error) {
    console.error("Error initializing Firebase in transaction monitor:", error);
    db = null;
}

class TransactionMonitor {
    constructor() {
        this.monitoredTransactions = new Map();
        this.checkInterval = 30 * 1000; // Check every 30 seconds
        this.confirmationsRequired = {
            'TON': 1,
            'ETH': 12,
            'BNB': 15,
            'MATIC': 10,
            'TRX': 1,
            'USDT_TRC20': 1,
            'USDT_ERC20': 12
        };
        this.startMonitoring();
    }

    // Add transaction to monitoring
    addTransaction(txData) {
        const { txHash, currency, userId, expectedAmount, usdAmount } = txData;
        const normalizedCurrency = this.normalizeCurrency(currency);

        this.monitoredTransactions.set(txHash, {
            txHash,
            currency: normalizedCurrency,
            userId,
            expectedAmount: parseFloat(expectedAmount),
            usdAmount: parseFloat(usdAmount),
            status: 'pending',
            addedAt: Date.now(),
            confirmations: 0
        });

        console.log(`Started monitoring transaction ${txHash} for user ${userId}`);
    }

    // Check transaction status with real blockchain APIs
    async checkTransaction(txHash, currency) {
        try {
            switch (currency) {
                case 'TON':
                    return await this.checkTONTransaction(txHash);
                case 'ETH':
                case 'USDT_ERC20':
                    return await this.checkETHTransaction(txHash, currency === 'USDT_ERC20');
                case 'BNB':
                    return await this.checkBNBTransaction(txHash);
                case 'MATIC':
                    return await this.checkPolygonTransaction(txHash);
                case 'TRX':
                case 'USDT_TRC20':
                    return await this.checkTRONTransaction(txHash, currency === 'USDT_TRC20');
                default:
                    console.warn(`Unsupported currency for transaction checking: ${currency}`);
                    return { status: 'unknown', confirmations: 0 };
            }
        } catch (error) {
            console.error(`Error checking ${currency} transaction ${txHash}:`, error);
            return { status: 'error', confirmations: 0 };
        }
    }

    // Check TON transaction
    async checkTONTransaction(txHash) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'tonapi.io',
                path: `/v1/blockchain/transactions/${txHash}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.TON_API_KEY || '82375c44eeb443d0efac70b18ef80d43bfec23e3581de35d1d4016607457dcf2'}`
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const tx = JSON.parse(data);
                        if (tx.success === false) {
                            resolve({ status: 'not_found', confirmations: 0 });
                            return;
                        }

                        const confirmations = tx.confirmations || 0;
                        const requiredConfirmations = this.confirmationsRequired.TON;

                        resolve({
                            status: confirmations >= requiredConfirmations ? 'confirmed' : 'pending',
                            confirmations
                        });
                    } catch (e) {
                        resolve({ status: 'error', confirmations: 0 });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('TON API error:', error);
                resolve({ status: 'error', confirmations: 0 });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                resolve({ status: 'error', confirmations: 0 });
            });

            req.end();
        });
    }

    // Check Ethereum transaction
    async checkETHTransaction(txHash, isUSDT = false) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.etherscan.io',
                path: `/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${process.env.ETH_API_KEY || '563ab08b0c9e4f77bcb7003dd7dec1a2'}`,
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.status === '0') {
                            resolve({ status: 'not_found', confirmations: 0 });
                            return;
                        }

                        const receipt = response.result;
                        if (receipt && receipt.status === '1') {
                            // Get current block number
                            this.getCurrentBlockNumber('ETH').then(currentBlock => {
                                const txBlock = parseInt(receipt.blockNumber, 16);
                                const confirmations = currentBlock - txBlock;

                                resolve({
                                    status: confirmations >= this.confirmationsRequired.ETH ? 'confirmed' : 'pending',
                                    confirmations
                                });
                            }).catch(() => {
                                resolve({ status: 'confirmed', confirmations: 1 });
                            });
                        } else {
                            resolve({ status: 'failed', confirmations: 0 });
                        }
                    } catch (e) {
                        resolve({ status: 'error', confirmations: 0 });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Etherscan API error:', error);
                resolve({ status: 'error', confirmations: 0 });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                resolve({ status: 'error', confirmations: 0 });
            });

            req.end();
        });
    }

    // Check BNB transaction
    async checkBNBTransaction(txHash) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.bscscan.com',
                path: `/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${process.env.BNB_API_KEY || 'YourBscScanApiKey'}`,
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.status === '0') {
                            resolve({ status: 'not_found', confirmations: 0 });
                            return;
                        }

                        const receipt = response.result;
                        if (receipt && receipt.status === '1') {
                            this.getCurrentBlockNumber('BNB').then(currentBlock => {
                                const txBlock = parseInt(receipt.blockNumber, 16);
                                const confirmations = currentBlock - txBlock;

                                resolve({
                                    status: confirmations >= this.confirmationsRequired.BNB ? 'confirmed' : 'pending',
                                    confirmations
                                });
                            }).catch(() => {
                                resolve({ status: 'confirmed', confirmations: 1 });
                            });
                        } else {
                            resolve({ status: 'failed', confirmations: 0 });
                        }
                    } catch (e) {
                        resolve({ status: 'error', confirmations: 0 });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('BscScan API error:', error);
                resolve({ status: 'error', confirmations: 0 });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                resolve({ status: 'error', confirmations: 0 });
            });

            req.end();
        });
    }

    // Check Polygon transaction
    async checkPolygonTransaction(txHash) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.polygonscan.com',
                path: `/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${process.env.POLYGON_API_KEY || 'YourPolygonScanApiKey'}`,
                method: 'GET'
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.status === '0') {
                            resolve({ status: 'not_found', confirmations: 0 });
                            return;
                        }

                        const receipt = response.result;
                        if (receipt && receipt.status === '1') {
                            this.getCurrentBlockNumber('MATIC').then(currentBlock => {
                                const txBlock = parseInt(receipt.blockNumber, 16);
                                const confirmations = currentBlock - txBlock;

                                resolve({
                                    status: confirmations >= this.confirmationsRequired.MATIC ? 'confirmed' : 'pending',
                                    confirmations
                                });
                            }).catch(() => {
                                resolve({ status: 'confirmed', confirmations: 1 });
                            });
                        } else {
                            resolve({ status: 'failed', confirmations: 0 });
                        }
                    } catch (e) {
                        resolve({ status: 'error', confirmations: 0 });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('PolygonScan API error:', error);
                resolve({ status: 'error', confirmations: 0 });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                resolve({ status: 'error', confirmations: 0 });
            });

            req.end();
        });
    }

    // Check TRON transaction
    async checkTRONTransaction(txHash, isUSDT = false) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.trongrid.io',
                path: `/v1/transactions/${txHash}`,
                method: 'GET',
                headers: {
                    'TRON-PRO-API-KEY': process.env.TRON_API_KEY || 'c6b3eb2f-fb35-47ed-8a50-f50bfd9f62ff'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.success === false || !response.data || response.data.length === 0) {
                            resolve({ status: 'not_found', confirmations: 0 });
                            return;
                        }

                        const tx = response.data[0];
                        if (tx.ret && tx.ret[0] && tx.ret[0].contractRet === 'SUCCESS') {
                            // TRON transactions are confirmed quickly
                            resolve({
                                status: 'confirmed',
                                confirmations: 1
                            });
                        } else {
                            resolve({ status: 'failed', confirmations: 0 });
                        }
                    } catch (e) {
                        resolve({ status: 'error', confirmations: 0 });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('TRON API error:', error);
                resolve({ status: 'error', confirmations: 0 });
            });

            req.setTimeout(10000, () => {
                req.destroy();
                resolve({ status: 'error', confirmations: 0 });
            });

            req.end();
        });
    }

    // Get current block number for a network
    async getCurrentBlockNumber(network) {
        return new Promise((resolve, reject) => {
            let options;

            switch (network) {
                case 'ETH':
                    options = {
                        hostname: 'api.etherscan.io',
                        path: `/api?module=proxy&action=eth_blockNumber&apikey=${process.env.ETH_API_KEY || '563ab08b0c9e4f77bcb7003dd7dec1a2'}`,
                        method: 'GET'
                    };
                    break;
                case 'BNB':
                    options = {
                        hostname: 'api.bscscan.com',
                        path: `/api?module=proxy&action=eth_blockNumber&apikey=${process.env.BNB_API_KEY || 'YourBscScanApiKey'}`,
                        method: 'GET'
                    };
                    break;
                case 'MATIC':
                    options = {
                        hostname: 'api.polygonscan.com',
                        path: `/api?module=proxy&action=eth_blockNumber&apikey=${process.env.POLYGON_API_KEY || 'YourPolygonScanApiKey'}`,
                        method: 'GET'
                    };
                    break;
                default:
                    reject(new Error(`Unsupported network: ${network}`));
                    return;
            }

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.result) {
                            resolve(parseInt(response.result, 16));
                        } else {
                            reject(new Error('Invalid response'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    // Process confirmed transaction
    async processConfirmedTransaction(txData) {
        if (!db) return;

        try {
            const { userId, usdAmount } = txData;

            // Update user balance
            const userRef = db.collection('users').doc(String(userId));
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const newBalance = (userData.balance || 0) + usdAmount;
                    transaction.update(userRef, { balance: newBalance });
                }
            });

            // Log transaction
            await db.collection('transactions').add({
                ...txData,
                status: 'confirmed',
                processedAt: new Date()
            });

            console.log(`Processed transaction for user ${userId}: +$${usdAmount}`);

            // Remove from monitoring
            this.monitoredTransactions.delete(txData.txHash);

        } catch (error) {
            console.error('Error processing confirmed transaction:', error);
        }
    }

    // Start monitoring loop
    startMonitoring() {
        setInterval(async () => {
            for (const [txHash, txData] of this.monitoredTransactions) {
                try {
                    const status = await this.checkTransaction(txHash, txData.currency);

                    if (status.status === 'confirmed') {
                        await this.processConfirmedTransaction(txData);
                    } else if (status.status === 'error' || status.status === 'not_found') {
                        // Remove failed transactions after some time
                        const age = Date.now() - txData.addedAt;
                        if (age > 24 * 60 * 60 * 1000) { // 24 hours
                            this.monitoredTransactions.delete(txHash);
                        }
                    }
                } catch (error) {
                    console.error(`Error monitoring transaction ${txHash}:`, error);
                }
            }
        }, this.checkInterval);
    }

    // Normalize currency name
    normalizeCurrency(currency) {
        return currency.replace(' ', '_').replace('(', '_').replace(')', '').toUpperCase().split('_')[0];
    }

    // Get monitoring stats
    getStats() {
        return {
            monitoredCount: this.monitoredTransactions.size,
            transactions: Array.from(this.monitoredTransactions.values())
        };
    }
}

const transactionMonitor = new TransactionMonitor();
module.exports = transactionMonitor;