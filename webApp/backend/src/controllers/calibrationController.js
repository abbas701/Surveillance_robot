import pool from '../config/database.js';

export const getLatestCalibrationFeedback = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM calibration_feedback 
            ORDER BY timestamp DESC 
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'No calibration feedback available'
            });
        }

        const feedback = result.rows[0];

        res.json({
            success: true,
            data: {
                id: feedback.id,
                status: feedback.status,
                quantity: feedback.quantity,
                value: feedback.value,
                error: feedback.error,
                timestamp: feedback.timestamp
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get calibration feedback error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

export const getCalibrationHistory = async (req, res) => {
    try {
        const { limit = 50, status, quantity } = req.query;
        const maxLimit = Math.min(parseInt(limit), 500); // Cap at 500 records

        let query = 'SELECT * FROM calibration_feedback';
        let params = [];
        let conditions = [];
        let paramCount = 1;

        // Add filters if provided
        if (status) {
            conditions.push(`status = $${paramCount++}`);
            params.push(status);
        }

        if (quantity) {
            conditions.push(`quantity = $${paramCount++}`);
            params.push(quantity);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY timestamp DESC LIMIT $${paramCount}`;
        params.push(maxLimit);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            limit: maxLimit,
            filters: { status, quantity },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get calibration history error:', error);
        res.status(500).json({ error: 'Database error' });
    }
};

export const getCalibrationStats = async (req, res) => {
    try {
        // Get overall statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_calibrations,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
            FROM calibration_feedback
        `);

        // Get statistics by quantity
        const quantityStatsResult = await pool.query(`
            SELECT 
                quantity,
                COUNT(*) as count,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
            FROM calibration_feedback
            GROUP BY quantity
            ORDER BY count DESC
        `);

        // Get recent activity (last 24 hours)
        const recentResult = await pool.query(`
            SELECT COUNT(*) as recent_count
            FROM calibration_feedback
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
        `);

        const stats = statsResult.rows[0];
        const quantityStats = quantityStatsResult.rows;
        const recentCount = recentResult.rows[0].recent_count;

        res.json({
            success: true,
            data: {
                overall: {
                    total: parseInt(stats.total_calibrations),
                    successful: parseInt(stats.successful),
                    failed: parseInt(stats.failed),
                    pending: parseInt(stats.pending),
                    successRate: stats.total_calibrations > 0
                        ? ((stats.successful / stats.total_calibrations) * 100).toFixed(2)
                        : 0
                },
                byQuantity: quantityStats.map(qs => ({
                    quantity: qs.quantity,
                    total: parseInt(qs.count),
                    successful: parseInt(qs.successful),
                    failed: parseInt(qs.failed),
                    successRate: qs.count > 0
                        ? ((qs.successful / qs.count) * 100).toFixed(2)
                        : 0
                })),
                recent: {
                    last24Hours: parseInt(recentCount)
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Get calibration stats error:', error);
        res.status(500).json({ error: 'Database error' });
    }
}; 