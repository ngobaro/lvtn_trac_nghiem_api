// redis.config.ts
import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

export const redisConfig = (): CacheModuleAsyncOptions => ({
    isGlobal: true,
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) {
            console.log(' Using memory store');
            return { ttl: 5 * 60 * 1000 };
        }

        console.log(' Connecting to Redis...');
        const { default: KeyvRedis } = await import('@keyv/redis');
        const { default: Keyv } = await import('keyv');

        const keyv = new Keyv({
            store: new KeyvRedis(redisUrl),
            ttl: 5 * 60 * 1000,
        });

        keyv.on('error', (err) => console.error('Redis error:', err));

        console.log(' Redis connected');
        return { stores: [keyv] };
    },
});