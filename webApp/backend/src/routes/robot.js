import express from 'express';
import {
    getRobotStatus,
    sendCommand,
    sendCalibrationCommand
} from '../controllers/robotController.js';
import { authenticateToken, requireGuestOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and guest/admin privileges
router.use(authenticateToken, requireGuestOrAdmin);

router.get('/status', getRobotStatus);
router.post('/command', sendCommand);
router.post('/calibrate', sendCalibrationCommand);

export default router; 