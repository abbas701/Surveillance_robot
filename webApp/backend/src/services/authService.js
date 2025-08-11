import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { JWT_CONFIG } from '../config/jwt.js';

class AuthService {
    async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    generateToken(userId, username, designation) {
        const payload = {
            userId,
            username,
            designation,
            iat: Math.floor(Date.now() / 1000),
        };

        return jwt.sign(payload, JWT_CONFIG.secret, {
            expiresIn: JWT_CONFIG.expiresIn
        });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_CONFIG.secret);
        } catch (error) {
            return null;
        }
    }

    async authenticateUser(username, password) {
        try {
            const result = await pool.query(
                'SELECT id, username, password_hash, designation FROM users WHERE username = $1',
                [username]
            );

            if (result.rows.length === 0) {
                return { success: false, message: 'Invalid credentials' };
            }

            const user = result.rows[0];
            const isPasswordValid = await this.comparePassword(password, user.password_hash);

            if (!isPasswordValid) {
                return { success: false, message: 'Invalid credentials' };
            }

            const token = this.generateToken(user.id, user.username, user.designation);

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    designation: user.designation
                },
                token
            };
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, message: 'Authentication failed' };
        }
    }

    async createUser(username, password, designation) {
        try {
            // Check if user already exists
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE username = $1',
                [username]
            );

            if (existingUser.rows.length > 0) {
                return { success: false, message: 'Username already exists' };
            }

            // Hash password and create user
            const hashedPassword = await this.hashPassword(password);

            const result = await pool.query(
                'INSERT INTO users (username, password_hash, designation) VALUES ($1, $2, $3) RETURNING id, username, designation',
                [username, hashedPassword, designation]
            );

            const newUser = result.rows[0];
            return {
                success: true,
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    designation: newUser.designation
                },
                message: 'User created successfully'
            };
        } catch (error) {
            console.error('User creation error:', error);
            return { success: false, message: 'Failed to create user' };
        }
    }

    async getUserById(userId) {
        try {
            const result = await pool.query(
                'SELECT id, username, designation, created_at FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    async getAllUsers() {
        try {
            const result = await pool.query(
                'SELECT id, username, designation, created_at, updated_at FROM users ORDER BY created_at DESC'
            );

            return result.rows;
        } catch (error) {
            console.error('Get all users error:', error);
            return [];
        }
    }

    async updateUser(userId, updates) {
        try {
            const { username, designation } = updates;
            const fields = [];
            const values = [];
            let paramCount = 1;

            if (username !== undefined) {
                fields.push(`username = $${paramCount++}`);
                values.push(username);
            }

            if (designation !== undefined) {
                fields.push(`designation = $${paramCount++}`);
                values.push(designation);
            }

            if (fields.length === 0) {
                return { success: false, message: 'No fields to update' };
            }

            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(userId);

            const query = `
                UPDATE users 
                SET ${fields.join(', ')} 
                WHERE id = $${paramCount}
                RETURNING id, username, designation, updated_at
            `;

            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return { success: false, message: 'User not found' };
            }

            return {
                success: true,
                user: result.rows[0],
                message: 'User updated successfully'
            };
        } catch (error) {
            console.error('Update user error:', error);
            return { success: false, message: 'Failed to update user' };
        }
    }

    async deleteUser(userId) {
        try {
            const result = await pool.query(
                'DELETE FROM users WHERE id = $1 RETURNING id',
                [userId]
            );

            if (result.rows.length === 0) {
                return { success: false, message: 'User not found' };
            }

            return { success: true, message: 'User deleted successfully' };
        } catch (error) {
            console.error('Delete user error:', error);
            return { success: false, message: 'Failed to delete user' };
        }
    }
}

export default new AuthService(); 