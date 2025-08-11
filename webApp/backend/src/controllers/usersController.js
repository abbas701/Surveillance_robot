import authService from '../services/authService.js';

export const createUser = async (req, res) => {
    try {
        const { username, password, designation } = req.body;

        if (!username || !password || !designation) {
            return res.status(400).json({
                error: 'Username, password, and designation are required'
            });
        }

        if (!['admin', 'guest'].includes(designation)) {
            return res.status(400).json({
                error: 'Designation must be either "admin" or "guest"'
            });
        }

        const result = await authService.createUser(username, password, designation);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.status(201).json({
            success: true,
            user: result.user,
            message: result.message
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await authService.getAllUsers();

        res.json({
            success: true,
            users: users.map(user => ({
                id: user.id,
                username: user.username,
                designation: user.designation,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }))
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, designation } = req.body;

        if (!username && !designation) {
            return res.status(400).json({
                error: 'At least one field (username or designation) must be provided'
            });
        }

        if (designation && !['admin', 'guest'].includes(designation)) {
            return res.status(400).json({
                error: 'Designation must be either "admin" or "guest"'
            });
        }

        const updates = {};
        if (username !== undefined) updates.username = username;
        if (designation !== undefined) updates.designation = designation;

        const result = await authService.updateUser(userId, updates);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({
            success: true,
            user: result.user,
            message: result.message
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent admin from deleting themselves
        if (parseInt(userId) === req.user.userId) {
            return res.status(400).json({
                error: 'Cannot delete your own account'
            });
        }

        const result = await authService.deleteUser(userId);

        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 