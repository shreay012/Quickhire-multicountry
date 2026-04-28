import Redis from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 3 });
export const pubClient = new Redis(env.REDIS_URL);
export const subClient = pubClient.duplicate();

redis.on('error', (e) => logger.error({ err: e }, 'redis error'));
redis.on('connect', () => logger.info('redis connected'));

export async function publish(channel, payload) {
  await pubClient.publish(channel, JSON.stringify(payload));
}

export async function closeRedis() {
  await Promise.allSettled([redis.quit(), pubClient.quit(), subClient.quit()]);
}
