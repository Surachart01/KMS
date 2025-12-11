// lib/redis.js
import Redis from 'ioredis';

const getRedisUrl = () => {
    if (process.env.REDIS_URL) return process.env.REDIS_URL;
    throw new Error("REDIS_URL is not defined");
};

export const redis = global.redis || new Redis(getRedisUrl());

if (process.env.NODE_ENV !== 'production') global.redis = redis;