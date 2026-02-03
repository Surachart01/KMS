import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create a new daily authorization
 */
export const createAuthorization = async (data) => {
    return await prisma.dailyAuthorization.create({
        data,
        include: {
            user: {
                select: {
                    id: true,
                    studentCode: true,
                    firstName: true,
                    lastName: true
                }
            },
            subject: {
                select: {
                    id: true,
                    code: true,
                    name: true
                }
            }
        }
    });
};

/**
 * Bulk create authorizations
 */
export const bulkCreateAuthorizations = async (authorizationsData) => {
    return await prisma.dailyAuthorization.createMany({
        data: authorizationsData,
        skipDuplicates: true
    });
};

/**
 * Get authorized users for a specific room and time
 */
export const getAuthorizedUsers = async ({ roomCode, date, startTime, endTime }) => {
    const where = {
        roomCode
    };

    if (date) {
        where.date = new Date(date);
    }

    // Check for time overlap if provided
    if (startTime && endTime) {
        where.OR = [
            {
                AND: [
                    { startTime: { lte: new Date(startTime) } },
                    { endTime: { gte: new Date(startTime) } }
                ]
            },
            {
                AND: [
                    { startTime: { lte: new Date(endTime) } },
                    { endTime: { gte: new Date(endTime) } }
                ]
            }
        ];
    }

    return await prisma.dailyAuthorization.findMany({
        where,
        include: {
            user: {
                select: {
                    id: true,
                    studentCode: true,
                    firstName: true,
                    lastName: true,
                    section: {
                        include: {
                            major: true
                        }
                    }
                }
            },
            subject: true,
            schedule: true
        },
        orderBy: [
            { date: 'asc' },
            { startTime: 'asc' }
        ]
    });
};

/**
 * Check if a user is authorized for a specific room at a specific time
 */
export const checkUserAuthorization = async ({ userId, roomCode, dateTime }) => {
    const date = new Date(dateTime);
    const currentDate = new Date(date.setHours(0, 0, 0, 0));

    const authorization = await prisma.dailyAuthorization.findFirst({
        where: {
            userId,
            roomCode,
            date: currentDate,
            startTime: { lte: dateTime },
            endTime: { gte: dateTime }
        },
        include: {
            user: true,
            subject: true
        }
    });

    return authorization;
};

/**
 * Delete an authorization
 */
export const deleteAuthorization = async (id) => {
    return await prisma.dailyAuthorization.delete({
        where: { id }
    });
};

/**
 * Delete authorizations by filter
 */
export const deleteAuthorizationsByFilter = async (filter) => {
    return await prisma.dailyAuthorization.deleteMany({
        where: filter
    });
};

/**
 * Get all authorizations with filters
 */
export const getAllAuthorizations = async (filter = {}) => {
    return await prisma.dailyAuthorization.findMany({
        where: filter,
        include: {
            user: {
                select: {
                    id: true,
                    studentCode: true,
                    firstName: true,
                    lastName: true
                }
            },
            subject: true,
            schedule: true
        },
        orderBy: [
            { date: 'asc' },
            { startTime: 'asc' }
        ]
    });
};
