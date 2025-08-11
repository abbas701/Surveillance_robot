import express from 'express';
import {
    createUser,
    getAllUsers,
    updateUser,
    deleteUser
} from '../controllers/usersController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(authenticateToken, requireAdmin);

router.post('/', createUser);
router.get('/', getAllUsers);
router.put('/:userId', updateUser);
router.delete('/:userId', deleteUser);

export default router; 