import * as authorizationService from '../services/authorizationService.js';

/**
 * POST /api/authorizations - Add manual authorization
 */
export const addAuthorization = async (req, res) => {
    try {
        const { userId, roomCode, date, startTime, endTime, subjectId } = req.body;

        if (!userId || !roomCode || !date || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Missing required fields: userId, roomCode, date, startTime, endTime'
            });
        }

        const result = await authorizationService.addManualAuthorization(
            { userId, roomCode, date: new Date(date), startTime: new Date(startTime), endTime: new Date(endTime), subjectId },
            req.user?.id // createdBy
        );

        return res.status(201).json({
            message: 'Authorization added successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Error adding authorization:', error);
        return res.status(500).json({ message: 'Failed to add authorization' });
    }
};

/**
 * GET /api/authorizations - Get all authorizations with filters
 */
export const getAllAuthorizations = async (req, res) => {
    try {
        const { roomCode, date, userId } = req.query;

        const filter = {};
        if (roomCode) filter.roomCode = roomCode;
        if (date) filter.date = new Date(date);
        if (userId) filter.userId = userId;

        const result = await authorizationService.getAllAuthorizations(filter);

        return res.status(200).json({
            message: 'Authorizations retrieved successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Error getting authorizations:', error);
        return res.status(500).json({ message: 'Failed to get authorizations' });
    }
};

/**
 * GET /api/authorizations/room/:roomCode - Get authorized users for a room
 */
export const getAuthorizedUsersForRoom = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const { date, startTime, endTime } = req.query;

        const result = await authorizationService.getAuthorizedUsers({
            roomCode,
            date: date ? new Date(date) : undefined,
            startTime: startTime ? new Date(startTime) : undefined,
            endTime: endTime ? new Date(endTime) : undefined
        });

        return res.status(200).json({
            message: 'Authorized users retrieved successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Error getting authorized users:', error);
        return res.status(500).json({ message: 'Failed to get authorized users' });
    }
};

/**
 * GET /api/authorizations/check - Check if user is authorized
 */
export const checkAuthorization = async (req, res) => {
    try {
        const { userId, roomCode, dateTime } = req.query;

        if (!userId || !roomCode || !dateTime) {
            return res.status(400).json({
                message: 'Missing required parameters: userId, roomCode, dateTime'
            });
        }

        const result = await authorizationService.checkAuthorization({
            userId,
            roomCode,
            dateTime
        });

        return res.status(200).json({
            message: result.authorized ? 'User is authorized' : 'User is not authorized',
            authorized: result.authorized,
            data: result.data
        });
    } catch (error) {
        console.error('Error checking authorization:', error);
        return res.status(500).json({ message: 'Failed to check authorization' });
    }
};

/**
 * DELETE /api/authorizations/:id - Remove authorization
 */
export const deleteAuthorization = async (req, res) => {
    try {
        const { id } = req.params;

        await authorizationService.removeAuthorization(id);

        return res.status(200).json({
            message: 'Authorization removed successfully'
        });
    } catch (error) {
        console.error('Error deleting authorization:', error);
        return res.status(500).json({ message: 'Failed to delete authorization' });
    }
};

/**
 * POST /api/authorizations/sync-schedule - Sync from schedule
 */
export const syncSchedule = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({
                message: 'Missing required fields: startDate, endDate'
            });
        }

        const result = await authorizationService.syncScheduleRange(
            new Date(startDate),
            new Date(endDate)
        );

        return res.status(200).json({
            message: result.message,
            count: result.count
        });
    } catch (error) {
        console.error('Error syncing schedule:', error);
        return res.status(500).json({ message: 'Failed to sync schedule' });
    }
};
