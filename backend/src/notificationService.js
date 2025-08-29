// Notification service for Telegram Mini App
const https = require('https');

class NotificationService {
    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    }

    // Send notification to a specific user
    async sendToUser(chatId, text, options = {}) {
        if (!this.botToken) {
            console.warn('TELEGRAM_BOT_TOKEN not configured, skipping notification');
            return false;
        }

        return new Promise((resolve) => {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const data = JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: options.parseMode || 'HTML',
                reply_markup: options.replyMarkup || null
            });

            const req = https.request({
                hostname: 'api.telegram.org',
                path: `/bot${this.botToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            }, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        if (response.ok) {
                            console.log(`Notification sent to ${chatId}`);
                            resolve(true);
                        } else {
                            console.warn(`Failed to send notification to ${chatId}:`, response.description);
                            resolve(false);
                        }
                    } catch (e) {
                        console.warn(`Error parsing Telegram response for ${chatId}:`, e);
                        resolve(false);
                    }
                });
            });

            req.on('error', (error) => {
                console.warn(`Error sending notification to ${chatId}:`, error);
                resolve(false);
            });

            req.write(data);
            req.end();
        });
    }

    // Send lottery completion notification
    async sendLotteryCompleted(lottery, winnerId) {
        const winnerMessage = this.formatWinnerMessage(lottery, winnerId);
        const loserMessage = this.formatLoserMessage(lottery, winnerId);

        const promises = [];

        // Send to winner
        if (winnerId) {
            promises.push(this.sendToUser(winnerId, winnerMessage, {
                parseMode: 'HTML'
            }));
        }

        // Send to all participants except winner
        if (lottery.participants && lottery.participants.length > 0) {
            for (const participantId of lottery.participants) {
                if (participantId !== winnerId) {
                    promises.push(this.sendToUser(participantId, loserMessage, {
                        parseMode: 'HTML'
                    }));
                }
            }
        }

        await Promise.all(promises);
        console.log(`Sent completion notifications for lottery ${lottery.id}`);
    }

    // Send new lottery notification
    async sendNewLottery(lottery, subscribers = []) {
        const message = this.formatNewLotteryMessage(lottery);

        const promises = subscribers.map(subscriberId =>
            this.sendToUser(subscriberId, message, {
                parseMode: 'HTML',
                replyMarkup: {
                    inline_keyboard: [[
                        { text: 'Join Lottery', callback_data: `join_lottery_${lottery.id}` }
                    ]]
                }
            })
        );

        await Promise.all(promises);
        console.log(`Sent new lottery notifications for ${lottery.title}`);
    }

    // Send lottery reminder (24 hours before end)
    async sendLotteryReminder(lottery) {
        if (!lottery.participants || lottery.participants.length === 0) {
            return;
        }

        const message = this.formatReminderMessage(lottery);
        const promises = lottery.participants.map(participantId =>
            this.sendToUser(participantId, message, {
                parseMode: 'HTML'
            })
        );

        await Promise.all(promises);
        console.log(`Sent reminder notifications for lottery ${lottery.title}`);
    }

    // Format winner message
    formatWinnerMessage(lottery, winnerId) {
        const prize = lottery.prizes && lottery.prizes[0] ?
            `$${lottery.prizes[0].amount}` : 'prize';

        return `<b>Congratulations!</b>\n\n` +
                `You won the lottery <b>"${lottery.title}"</b>!\n\n` +
                `Prize: <b>${prize}</b>\n` +
                `Funds have been credited to your balance!\n\n` +
                `Thank you for participating!`;
    }

    // Format loser message
    formatLoserMessage(lottery, winnerId) {
        return `<b>Lottery Completed</b>\n\n` +
                `Lottery <b>"${lottery.title}"</b> has ended.\n\n` +
                `Winner: <b>${winnerId}</b>\n` +
                `Better luck next time!\n\n` +
                `Stay tuned for new lotteries!`;
    }

    // Format new lottery message
    formatNewLotteryMessage(lottery) {
        const prize = lottery.prizes && lottery.prizes[0] ?
            `$${lottery.prizes[0].amount}` : 'prize';

        return `<b>New Lottery!</b>\n\n` +
                `<b>${lottery.title}</b>\n` +
                `Entry cost: <b>$${lottery.participationCost}</b>\n` +
                `Prize: <b>${prize}</b>\n` +
                `Max participants: <b>${lottery.maxParticipants}</b>\n` +
                `Ends: <b>${new Date(lottery.endDate).toLocaleDateString('en-US')}</b>\n\n` +
                `Join now!`;
    }

    // Format reminder message
    formatReminderMessage(lottery) {
        return `<b>Reminder!</b>\n\n` +
                `Lottery <b>"${lottery.title}"</b> ends in 24 hours!\n\n` +
                `End date: <b>${new Date(lottery.endDate).toLocaleDateString('en-US')}</b>\n` +
                `Current participants: <b>${lottery.participants?.length || 0}</b>\n\n` +
                `Join before it's too late!`;
    }

    // Send admin notification
    async sendAdminNotification(adminId, message, type = 'info') {
        const typeLabels = {
            'success': 'SUCCESS',
            'error': 'ERROR',
            'warning': 'WARNING',
            'info': 'INFO'
        };

        const formattedMessage = `<b>Admin Notification - ${typeLabels[type] || 'INFO'}</b>\n\n${message}`;

        return await this.sendToUser(adminId, formattedMessage, {
            parseMode: 'HTML'
        });
    }

    // Broadcast message to all users (admin only)
    async broadcastMessage(userIds, message, options = {}) {
        const promises = userIds.map(userId =>
            this.sendToUser(userId, message, options)
        );

        const results = await Promise.all(promises);
        const successCount = results.filter(result => result).length;

        console.log(`Broadcast sent to ${successCount}/${userIds.length} users`);
        return successCount;
    }

    // Send balance update notification
    async sendBalanceUpdate(userId, amount, type = 'deposit') {
        const typeMessages = {
            'deposit': `Your balance has been credited with $${amount}`,
            'withdrawal': `$${amount} has been deducted from your balance`,
            'prize': `You have received a prize of $${amount}`,
            'refund': `$${amount} has been refunded to your balance`
        };

        const message = `<b>Balance Update</b>\n\n${typeMessages[type] || `Balance updated: $${amount}`}\n\nCurrent balance will be updated shortly.`;

        return await this.sendToUser(userId, message, {
            parseMode: 'HTML'
        });
    }

    // Send lottery participation confirmation
    async sendParticipationConfirmation(userId, lottery) {
        const message = `<b>Participation Confirmed</b>\n\n` +
                `You have successfully joined the lottery:\n` +
                `<b>${lottery.title}</b>\n\n` +
                `Entry fee: $${lottery.participationCost}\n` +
                `Prize: $${lottery.prizes && lottery.prizes[0] ? lottery.prizes[0].amount : 'TBD'}\n` +
                `Ends: ${new Date(lottery.endDate).toLocaleDateString('en-US')}\n\n` +
                `Good luck!`;

        return await this.sendToUser(userId, message, {
            parseMode: 'HTML'
        });
    }

    // Send lottery status update
    async sendLotteryUpdate(userId, lottery, updateType = 'status') {
        const updateMessages = {
            'started': `Lottery "${lottery.title}" has started!`,
            'ending_soon': `Lottery "${lottery.title}" ends in 24 hours!`,
            'ended': `Lottery "${lottery.title}" has ended.`,
            'cancelled': `Lottery "${lottery.title}" has been cancelled.`
        };

        const message = `<b>Lottery Update</b>\n\n${updateMessages[updateType] || 'Lottery status updated'}\n\n` +
                `Participants: ${lottery.participants?.length || 0}/${lottery.maxParticipants}`;

        return await this.sendToUser(userId, message, {
            parseMode: 'HTML'
        });
    }

    // Send system maintenance notification
    async sendMaintenanceNotification(userIds, startTime, endTime) {
        const message = `<b>System Maintenance</b>\n\n` +
                `The system will be under maintenance:\n` +
                `From: ${new Date(startTime).toLocaleString('en-US')}\n` +
                `To: ${new Date(endTime).toLocaleString('en-US')}\n\n` +
                `Some features may be temporarily unavailable.`;

        return await this.broadcastMessage(userIds, message, {
            parseMode: 'HTML'
        });
    }

    // Send promotional message
    async sendPromotion(userId, title, content, actionButton = null) {
        let message = `<b>${title}</b>\n\n${content}`;

        const options = { parseMode: 'HTML' };

        if (actionButton) {
            options.replyMarkup = {
                inline_keyboard: [[
                    {
                        text: actionButton.text,
                        url: actionButton.url || null,
                        callback_data: actionButton.callbackData || null
                    }
                ]]
            };
        }

        return await this.sendToUser(userId, message, options);
    }

    // Get notification statistics
    getStats() {
        // In a real implementation, you would track sent notifications
        return {
            totalSent: 0,
            successRate: 0,
            recentNotifications: []
        };
    }
}

const notificationService = new NotificationService();
module.exports = notificationService;