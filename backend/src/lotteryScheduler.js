// Lottery scheduler for automatic completion
const { initializeFirebase } = require('./firebase');
const notificationService = require('./notificationService');

let db;
try {
    const { db: firestoreDb } = initializeFirebase();
    db = firestoreDb;
} catch (error) {
    console.error("Error initializing Firebase in lottery scheduler:", error);
    db = null;
}

class LotteryScheduler {
    constructor() {
        this.checkInterval = 60 * 1000; // Check every minute
        this.startScheduler();
    }

    // Start the scheduler
    startScheduler() {
        console.log('Lottery scheduler started');

        // Check expired lotteries every minute
        setInterval(() => {
            this.checkExpiredLotteries();
        }, this.checkInterval);

        // Check for lotteries that need status updates every 5 minutes
        setInterval(() => {
            this.checkLotteryStatusUpdates();
        }, 5 * 60 * 1000);

        // Send reminders every hour
        setInterval(() => {
            this.sendReminderNotifications();
        }, 60 * 60 * 1000); // Every hour

        // Run initial checks
        setTimeout(() => {
            this.checkExpiredLotteries();
            this.checkLotteryStatusUpdates();
        }, 5000); // Start after 5 seconds
    }

    // Check for expired lotteries
    async checkExpiredLotteries() {
        if (!db) return;

        try {
            const now = new Date();
            const lotteriesRef = db.collection('lotteries');

            // Find active lotteries that have expired
            const expiredLotteries = await lotteriesRef
                .where('status', '==', 'active')
                .where('endDate', '<=', now)
                .get();

            for (const doc of expiredLotteries.docs) {
                const lottery = { id: doc.id, ...doc.data() };
                await this.completeLottery(lottery);
            }

        } catch (error) {
            console.error('Error checking expired lotteries:', error);
        }
    }

    // Complete a lottery
    async completeLottery(lottery) {
        try {
            console.log(`Completing lottery ${lottery.id}: ${lottery.title}`);

            const lotteryRef = db.collection('lotteries').doc(lottery.id);

            // Check if lottery has participants
            if (!lottery.participants || lottery.participants.length === 0) {
                // No participants, mark as completed without winner
                await lotteryRef.update({
                    status: 'completed',
                    completedAt: new Date(),
                    winner: null
                });
                console.log(`Lottery ${lottery.id} completed with no participants`);
                return;
            }

            // Select random winner
            const winnerId = lottery.participants[Math.floor(Math.random() * lottery.participants.length)];

            // Award prize to winner
            const winnerRef = db.collection('users').doc(String(winnerId));
            const winnerDoc = await winnerRef.get();

            if (winnerDoc.exists) {
                const winner = winnerDoc.data();
                const prizeAmount = lottery.prizes && lottery.prizes[0] ? lottery.prizes[0].amount : 0;

                await winnerRef.update({
                    balance: winner.balance + prizeAmount
                });

                console.log(`Awarded $${prizeAmount} to winner ${winnerId} in lottery ${lottery.id}`);
            }

            // Update lottery status
            await lotteryRef.update({
                status: 'completed',
                winner: winnerId,
                completedAt: new Date()
            });

            // Send notifications to participants
            await this.sendCompletionNotifications(lottery, winnerId);

            console.log(`Lottery ${lottery.id} completed successfully`);

        } catch (error) {
            console.error(`Error completing lottery ${lottery.id}:`, error);
        }
    }

    // Send completion notifications
    async sendCompletionNotifications(lottery, winnerId) {
        if (!lottery.participants || lottery.participants.length === 0) {
            return;
        }

        await notificationService.sendLotteryCompleted(lottery, winnerId);
    }

    // Send new lottery notifications
    async sendNewLotteryNotifications(lottery) {
        try {
            // Get all users who have participated in lotteries before (potential subscribers)
            const usersSnapshot = await db.collection('users').get();
            const userIds = [];

            usersSnapshot.forEach(doc => {
                const user = doc.data();
                // Only send to users who have balance or participated before
                if (user.balance > 0) {
                    userIds.push(doc.id);
                }
            });

            if (userIds.length > 0) {
                await notificationService.sendNewLottery(lottery, userIds);
            }

            console.log(`Sent new lottery notifications for ${lottery.title} to ${userIds.length} users`);
        } catch (error) {
            console.error('Error sending new lottery notifications:', error);
        }
    }

    // Check for lotteries that need status updates
    async checkLotteryStatusUpdates() {
        if (!db) return;

        try {
            const now = new Date();
            const lotteriesRef = db.collection('lotteries');

            // Find lotteries that should be marked as active
            const inactiveLotteries = await lotteriesRef
                .where('status', '==', 'pending')
                .where('startDate', '<=', now)
                .get();

            for (const doc of inactiveLotteries.docs) {
                const lottery = { id: doc.id, ...doc.data() };
                await doc.ref.update({
                    status: 'active',
                    activatedAt: now
                });

                console.log(`Activated lottery ${lottery.id}: ${lottery.title}`);

                // Send activation notifications
                await this.sendLotteryActivatedNotifications(lottery);
            }

        } catch (error) {
            console.error('Error checking lottery status updates:', error);
        }
    }

    // Send lottery activated notifications
    async sendLotteryActivatedNotifications(lottery) {
        if (!lottery.participants || lottery.participants.length === 0) {
            return;
        }

        const promises = lottery.participants.map(participantId =>
            notificationService.sendLotteryUpdate(
                participantId,
                lottery,
                'started'
            )
        );

        await Promise.all(promises);
        console.log(`Sent activation notifications for lottery ${lottery.title}`);
    }

    // Handle lottery cancellation
    async cancelLottery(lotteryId, reason = 'Admin cancelled') {
        if (!db) return false;

        try {
            const lotteryRef = db.collection('lotteries').doc(lotteryId);
            const lotteryDoc = await lotteryRef.get();

            if (!lotteryDoc.exists) {
                return false;
            }

            const lottery = { id: lotteryDoc.id, ...lotteryDoc.data() };

            // Refund participants
            if (lottery.participants && lottery.participants.length > 0) {
                const refundAmount = lottery.participationCost;

                for (const participantId of lottery.participants) {
                    const userRef = db.collection('users').doc(String(participantId));
                    const userDoc = await userRef.get();

                    if (userDoc.exists) {
                        const user = userDoc.data();
                        await userRef.update({
                            balance: user.balance + refundAmount
                        });

                        // Send refund notification
                        await notificationService.sendBalanceUpdate(
                            participantId,
                            refundAmount,
                            'refund'
                        );
                    }
                }
            }

            // Update lottery status
            await lotteryRef.update({
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelReason: reason
            });

            // Send cancellation notifications
            await this.sendLotteryCancelledNotifications(lottery, reason);

            console.log(`Cancelled lottery ${lotteryId}: ${reason}`);
            return true;

        } catch (error) {
            console.error(`Error cancelling lottery ${lotteryId}:`, error);
            return false;
        }
    }

    // Send lottery cancelled notifications
    async sendLotteryCancelledNotifications(lottery, reason) {
        if (!lottery.participants || lottery.participants.length === 0) {
            return;
        }

        const message = `Lottery "${lottery.title}" has been cancelled.\nReason: ${reason}\n\nYour entry fee has been refunded.`;

        const promises = lottery.participants.map(participantId =>
            notificationService.sendToUser(participantId, message, {
                parseMode: 'HTML'
            })
        );

        await Promise.all(promises);
        console.log(`Sent cancellation notifications for lottery ${lottery.title}`);
    }

    // Extend lottery duration
    async extendLottery(lotteryId, additionalHours) {
        if (!db) return false;

        try {
            const lotteryRef = db.collection('lotteries').doc(lotteryId);
            const lotteryDoc = await lotteryRef.get();

            if (!lotteryDoc.exists) {
                return false;
            }

            const lottery = { id: lotteryDoc.id, ...lotteryDoc.data() };
            const currentEndDate = new Date(lottery.endDate);
            const newEndDate = new Date(currentEndDate.getTime() + additionalHours * 60 * 60 * 1000);

            await lotteryRef.update({
                endDate: newEndDate,
                extendedAt: new Date(),
                extensionHours: additionalHours
            });

            // Send extension notifications
            await this.sendLotteryExtendedNotifications(lottery, additionalHours, newEndDate);

            console.log(`Extended lottery ${lotteryId} by ${additionalHours} hours`);
            return true;

        } catch (error) {
            console.error(`Error extending lottery ${lotteryId}:`, error);
            return false;
        }
    }

    // Send lottery extended notifications
    async sendLotteryExtendedNotifications(lottery, additionalHours, newEndDate) {
        if (!lottery.participants || lottery.participants.length === 0) {
            return;
        }

        const message = `Lottery "${lottery.title}" has been extended by ${additionalHours} hours.\n\n` +
                `New end date: ${newEndDate.toLocaleDateString('en-US')} ${newEndDate.toLocaleTimeString('en-US')}`;

        const promises = lottery.participants.map(participantId =>
            notificationService.sendToUser(participantId, message, {
                parseMode: 'HTML'
            })
        );

        await Promise.all(promises);
        console.log(`Sent extension notifications for lottery ${lottery.title}`);
    }

    // Send reminder notifications (24 hours before lottery ends)
    async sendReminderNotifications() {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Find active lotteries ending in next 24 hours
            const reminderLotteries = await db.collection('lotteries')
                .where('status', '==', 'active')
                .where('endDate', '>', now)
                .where('endDate', '<=', tomorrow)
                .get();

            for (const doc of reminderLotteries.docs) {
                const lottery = { id: doc.id, ...doc.data() };
                await notificationService.sendLotteryReminder(lottery);
            }

            if (!reminderLotteries.empty) {
                console.log(`Sent reminder notifications for ${reminderLotteries.size} lotteries`);
            }
        } catch (error) {
            console.error('Error sending reminder notifications:', error);
        }
    }

    // Manual completion trigger (for admin use)
    async completeLotteryManually(lotteryId) {
        if (!db) return false;

        try {
            const lotteryDoc = await db.collection('lotteries').doc(lotteryId).get();
            if (!lotteryDoc.exists) {
                return false;
            }

            const lottery = { id: lotteryDoc.id, ...lotteryDoc.data() };
            await this.completeLottery(lottery);
            return true;
        } catch (error) {
            console.error(`Error manually completing lottery ${lotteryId}:`, error);
            return false;
        }
    }

    // Get scheduler stats
    getStats() {
        return {
            checkInterval: this.checkInterval,
            status: 'running'
        };
    }
}

const lotteryScheduler = new LotteryScheduler();
module.exports = lotteryScheduler;