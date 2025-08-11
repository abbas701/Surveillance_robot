import express from 'express';
import {
    getLatestCalibrationFeedback,
    getCalibrationHistory,
    getCalibrationStats
} from '../controllers/calibrationController.js';
import { authenticateToken, requireGuestOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and guest/admin privileges
router.use(authenticateToken, requireGuestOrAdmin);

router.get('/latest', getLatestCalibrationFeedback);
router.get('/history', getCalibrationHistory);
router.get('/stats', getCalibrationStats);

export default router; 