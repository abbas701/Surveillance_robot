import authService from '../services/authService.js';
import { JWT_CONFIG } from '../config/jwt.js';

export const authenticateToken = (req, res, next) => {
    const token = req.cookies[JWT_CONFIG.cookieName];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = authService.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.designation !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

export const requireGuestOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!['admin', 'guest'].includes(req.user.designation)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    next();
}; 