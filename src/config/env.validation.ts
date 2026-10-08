import Joi from 'joi';

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
    PORT: Joi.number().default(3000),

    MONGODB_URI: Joi.string()
        .uri({ scheme: ['mongodb', 'mongodb+srv'] })
        .required(),
    MONGODB_DB_NAME: Joi.string().optional(),

    JWT_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
});