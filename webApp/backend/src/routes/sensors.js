import express from 'express';
import {
    getLatestSensorData,
    getSensorDataHistory
} from '../controllers/sensorsController.js';
import { authenticateToken, requireGuestOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and guest/admin privileges
router.use(authenticateToken, requireGuestOrAdmin);

router.get('/latest', getLatestSensorData);
router.get('/history', getSensorDataHistory);

export default router; 