import dotenv from 'dotenv';

dotenv.config();

export const JWT_CONFIG = {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    cookieName: 'authToken'
}; 