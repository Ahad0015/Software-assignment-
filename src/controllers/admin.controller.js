// =============================================================================
//  AMDAN ORGANICS – Admin Controller
// =============================================================================

const UserModel = require('../models/user.model');
const pool      = require('../db');

const AdminController = {

  // ── Get all users ───────────────────────────────────────────────────────────
  async getAllUsers(req, res) {
    try {
      const { role, status } = req.query;
      const users = await UserModel.getAll({ role, status });
      return res.status(200).json({ count: users.length, users });
    } catch (err) {
      console.error('Get users error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get single user ─────────────────────────────────────────────────────────
  async getUserByID(req, res) {
    try {
      const { userID } = req.params;
      const user = await UserModel.findByID(userID);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      return res.status(200).json({ user });
    } catch (err) {
      console.error('Get user error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Approve user ────────────────────────────────────────────────────────────
  async approveUser(req, res) {
    try {
      const { userID } = req.params;

      // Admin cannot approve themselves through this route
      if (userID === req.user.userID) {
        return res.status(400).json({ message: 'You cannot approve your own account.' });
      }

      const user = await UserModel.findByID(userID);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      if (user.status === 'Approved') {
        return res.status(400).json({ message: 'User is already approved.' });
      }

      const updated = await UserModel.updateStatus(userID, 'Approved');

      // Notify user
      await pool.query(
        `INSERT INTO notifications (user_id, type, message)
         VALUES ($1, 'account_approved', $2)`,
        [userID, 'Your account has been approved. You can now log in.']
      );

      // Log action
      await pool.query(
        `INSERT INTO system_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, 'user_approved', 'users', $2, $3)`,
        [req.user.userID, userID, JSON.stringify({ approvedUser: user.email })]
      );

      return res.status(200).json({ message: 'User approved.', user: updated });
    } catch (err) {
      console.error('Approve user error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Suspend user ────────────────────────────────────────────────────────────
  async suspendUser(req, res) {
    try {
      const { userID } = req.params;
      const { reason } = req.body;

      if (userID === req.user.userID) {
        return res.status(400).json({ message: 'You cannot suspend your own account.' });
      }

      const user = await UserModel.findByID(userID);
      if (!user) return res.status(404).json({ message: 'User not found.' });

      const updated = await UserModel.updateStatus(userID, 'Suspended');

      // Notify user
      await pool.query(
        `INSERT INTO notifications (user_id, type, message)
         VALUES ($1, 'account_suspended', $2)`,
        [userID, `Your account has been suspended. Reason: ${reason || 'Not specified.'}`]
      );

      // Log
      await pool.query(
        `INSERT INTO system_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, 'user_suspended', 'users', $2, $3)`,
        [req.user.userID, userID, JSON.stringify({ reason, suspendedUser: user.email })]
      );

      return res.status(200).json({ message: 'User suspended.', user: updated });
    } catch (err) {
      console.error('Suspend user error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Delete user (soft) ──────────────────────────────────────────────────────
  async deleteUser(req, res) {
    try {
      const { userID } = req.params;

      if (userID === req.user.userID) {
        return res.status(400).json({ message: 'You cannot delete your own account.' });
      }

      // Check for active pending orders
      const activeOrders = await pool.query(
        `SELECT COUNT(*) FROM orders
         WHERE buyer_id = $1
           AND status NOT IN ('Delivered', 'Cancelled')`,
        [userID]
      );
      if (parseInt(activeOrders.rows[0].count) > 0) {
        return res.status(400).json({
          message: 'Cannot delete user with active orders. Resolve orders first.'
        });
      }

      await UserModel.updateStatus(userID, 'Deleted');

      // Log
      await pool.query(
        `INSERT INTO system_logs (actor_id, action, target_type, target_id, details)
         VALUES ($1, 'user_deleted', 'users', $2, '{}')`,
        [req.user.userID, userID]
      );

      return res.status(200).json({ message: 'User deleted successfully.' });
    } catch (err) {
      console.error('Delete user error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get system logs ─────────────────────────────────────────────────────────
  async getSystemLogs(req, res) {
    try {
      const { action, limit } = req.query;
      let query  = `
        SELECT sl.*, u.full_name AS actor_name, u.role AS actor_role
        FROM system_logs sl
        LEFT JOIN users u ON u.user_id = sl.actor_id
        WHERE 1=1`;
      const params = [];

      if (action) {
        params.push(`%${action}%`);
        query += ` AND sl.action ILIKE $${params.length}`;
      }

      query += ` ORDER BY sl.created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit) || 50);

      const result = await pool.query(query, params);
      return res.status(200).json({ count: result.rows.length, logs: result.rows });
    } catch (err) {
      console.error('Get logs error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get platform stats (admin dashboard) ────────────────────────────────────
  async getDashboardStats(req, res) {
    try {
      const [users, listings, orders, inventory, notifications] = await Promise.all([
        pool.query(`SELECT
                      COUNT(*) FILTER (WHERE status = 'Approved') AS approved,
                      COUNT(*) FILTER (WHERE status = 'Pending')  AS pending,
                      COUNT(*) FILTER (WHERE status = 'Suspended') AS suspended
                    FROM users`),
        pool.query(`SELECT
                      COUNT(*) FILTER (WHERE status = 'Published')       AS published,
                      COUNT(*) FILTER (WHERE status = 'Pending Approval') AS pending
                    FROM produce_listings`),
        pool.query(`SELECT
                      COUNT(*) FILTER (WHERE status = 'Confirmed')  AS confirmed,
                      COUNT(*) FILTER (WHERE status = 'Delivered')  AS delivered,
                      COUNT(*) FILTER (WHERE status = 'Cancelled')  AS cancelled,
                      COALESCE(SUM(total_amount) FILTER (WHERE status = 'Delivered'), 0) AS total_revenue
                    FROM orders`),
        pool.query(`SELECT COUNT(*) FILTER (WHERE current_stock < minimum_threshold) AS low_stock
                    FROM inventory_items`),
        pool.query(`SELECT COUNT(*) FILTER (WHERE is_read = FALSE) AS unread
                    FROM notifications`)
      ]);

      return res.status(200).json({
        users      : users.rows[0],
        listings   : listings.rows[0],
        orders     : orders.rows[0],
        inventory  : inventory.rows[0],
        notifications: notifications.rows[0]
      });
    } catch (err) {
      console.error('Dashboard stats error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get notifications for logged-in user ────────────────────────────────────
  async getMyNotifications(req, res) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.user.userID]
      );
      return res.status(200).json({
        count        : result.rows.length,
        unreadCount  : result.rows.filter(n => !n.is_read).length,
        notifications: result.rows
      });
    } catch (err) {
      console.error('Get notifications error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Mark notification as read ───────────────────────────────────────────────
  async markNotificationRead(req, res) {
    try {
      const { notificationID } = req.params;
      await pool.query(
        `UPDATE notifications SET is_read = TRUE
         WHERE notification_id = $1 AND user_id = $2`,
        [notificationID, req.user.userID]
      );
      return res.status(200).json({ message: 'Notification marked as read.' });
    } catch (err) {
      console.error('Mark notification error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = AdminController;
