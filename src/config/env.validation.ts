import Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .required(),
    PORT: Joi.number().default(3000),

    MONGODB_URI: Joi.string()
        .uri({ scheme: ['mongodb', 'mongodb+srv'] })
        .required(),
    MONGODB_DB_NAME: Joi.string().optional(),

    JWT_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),

    REDIS_URL: Joi.string()
        .uri({ scheme: ['redis', 'rediss'] })
        .when('NODE_ENV', {
            is: 'production',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
    REDIS_KEY_PREFIX: Joi.string().default('viol'),
    REDIS_CACHE_TTL: Joi.number().integer().min(1).default(300),
});
