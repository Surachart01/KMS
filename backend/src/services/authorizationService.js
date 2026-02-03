import * as authorizationRepo from '../repositories/authorizationRepository.js';
import * as scheduleRepo from '../repositories/scheduleRepository.js';

/**
 * Sync schedule to daily authorizations for a date range
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const syncScheduleRange = async (startDate, endDate) => {
    try {
        // Get all schedules
        const schedules = await scheduleRepo.getAllSchedules({});

        const authorizations = [];
        const current = new Date(startDate);

        // Loop through each date in range
        while (current <= endDate) {
            const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, etc.

            // Find schedules for this day of week
            const daySchedules = schedules.filter(s => s.dayOfWeek === dayOfWeek);

            // For each schedule on this day
            for (const schedule of daySchedules) {
                // For each student in the schedule
                for (const student of schedule.students || []) {
                    authorizations.push({
                        userId: student.id,
                        roomCode: schedule.roomCode,
                        date: new Date(current),
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        scheduleId: schedule.id,
                        subjectId: schedule.subjectId,
                        source: 'SCHEDULE'
                    });
                }
            }

            // Move to next day
            current.setDate(current.getDate() + 1);
        }

        // Bulk create all authorizations
        const result = await authorizationRepo.bulkCreateAuthorizations(authorizations);

        return {
            success: true,
            message: `Synced ${result.count} authorizations from ${startDate.toDateString()} to ${endDate.toDateString()}`,
            count: result.count
        };
    } catch (error) {
        console.error('Error syncing schedule range:', error);
        throw error;
    }
};

/**
 * Add manual authorization
 */
export const addManualAuthorization = async (data, createdBy) => {
    try {
        const authData = {
            ...data,
            source: 'MANUAL',
            createdBy
        };

        const authorization = await authorizationRepo.createAuthorization(authData);

        return {
            success: true,
            data: authorization
        };
    } catch (error) {
        console.error('Error adding manual authorization:', error);
        throw error;
    }
};

/**
 * Get authorized users for a room/date/time
 */
export const getAuthorizedUsers = async (filter) => {
    try {
        const users = await authorizationRepo.getAuthorizedUsers(filter);
        return {
            success: true,
            data: users
        };
    } catch (error) {
        console.error('Error getting authorized users:', error);
        throw error;
    }
};

/**
 * Check if user has authorization
 */
export const checkAuthorization = async ({ userId, roomCode, dateTime }) => {
    try {
        const auth = await authorizationRepo.checkUserAuthorization({
            userId,
            roomCode,
            dateTime: new Date(dateTime)
        });

        return {
            authorized: auth !== null,
            data: auth
        };
    } catch (error) {
        console.error('Error checking authorization:', error);
        throw error;
    }
};

/**
 * Remove authorization
 */
export const removeAuthorization = async (id) => {
    try {
        await authorizationRepo.deleteAuthorization(id);
        return {
            success: true,
            message: 'Authorization removed successfully'
        };
    } catch (error) {
        console.error('Error removing authorization:', error);
        throw error;
    }
};

/**
 * Get all authorizations with optional filters
 */
export const getAllAuthorizations = async (filter = {}) => {
    try {
        const authorizations = await authorizationRepo.getAllAuthorizations(filter);
        return {
            success: true,
            data: authorizations
        };
    } catch (error) {
        console.error('Error getting authorizations:', error);
        throw error;
    }
};
