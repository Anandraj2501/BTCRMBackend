const { sql, poolPromise } = require('../config/db');

class DashboardController {
    async getStats(req, res) {
        try {
            const pool = await poolPromise;
            
            // Get total counts for main entities
            const statsQuery = `
                SELECT 
                    (SELECT COUNT(*) FROM Contact) as contacts,
                    (SELECT COUNT(*) FROM Organization) as organizations,
                    (SELECT COUNT(*) FROM Project) as projects,
                    (SELECT COUNT(*) FROM [User]) as users
            `;
            const statsResult = await pool.request().query(statsQuery);
            const counts = statsResult.recordset[0];

            // Get recent activity (last 5 records from BaseEntity)
            const activityQuery = `
                SELECT TOP 10 b.logicalname, b.createdon, b.baseentityid
                FROM BaseEntity b
                ORDER BY b.createdon DESC
            `;
            const activityResult = await pool.request().query(activityQuery);

            res.json({
                success: true,
                data: {
                    counts: {
                        contacts: counts.contacts,
                        organizations: counts.organizations,
                        projects: counts.projects,
                        users: counts.users
                    },
                    recentActivity: activityResult.recordset
                }
            });
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = new DashboardController();
