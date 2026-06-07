// =============================================================================
//  AMDAN ORGANICS – Auth Controller
// =============================================================================

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const AuthController = {

  // ── REGISTER ─────────────────────────────────────────────────────────────────
  async register(req, res) {
    try {
      const {
        fullName,
        email,
        password,
        phoneNumber,
        role,
        businessName,
        businessType
      } = req.body;

      // 1. Validate required fields
      if (!fullName || !email || !password || !phoneNumber || !role) {
        return res.status(400).json({
          message: 'All fields are required: fullName, email, password, phoneNumber, role'
        });
      }

      // 2. Validate role
      const allowedRoles = ['SystemAdmin', 'FarmManager', 'FarmStaff', 'InventoryOfficer', 'Buyer'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}`
        });
      }

      // 3. Buyer must provide businessName
      if (role === 'Buyer' && !businessName) {
        return res.status(400).json({
          message: 'businessName is required for Buyer registration'
        });
      }

      // 4. Check if email already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'Email is already registered.' });
      }

      // 5. Hash password
      const salt         = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 6. Create user
      const newUser = await UserModel.create({
        fullName,
        email,
        passwordHash,
        phoneNumber,
        role
      });

      // 7. Create role-specific profile
      await UserModel.createRoleProfile(newUser.user_id, role, {
        businessName,
        businessType: businessType || 'Individual'
      });

      return res.status(201).json({
        message: 'Registration successful. Your account is pending admin approval.',
        user: {
          userID   : newUser.user_id,
          fullName : newUser.full_name,
          email    : newUser.email,
          role     : newUser.role,
          status   : newUser.status
        }
      });

    } catch (err) {
      console.error('Register error:', err.message);
      return res.status(500).json({ message: 'Server error during registration.' });
    }
  },

  // ── LOGIN ─────────────────────────────────────────────────────────────────────
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // 1. Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }

      // 2. Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // 3. Check account status
      if (user.status === 'Pending') {
        return res.status(403).json({
          message: 'Your account is pending admin approval. Please wait.'
        });
      }
      if (user.status === 'Suspended') {
        return res.status(403).json({
          message: 'Your account has been suspended. Contact the administrator.'
        });
      }

      // 4. Compare password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        await UserModel.logFailedAttempt(user.user_id);
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      // 5. Generate JWT token
      const token = jwt.sign(
        {
          userID : user.user_id,
          email  : user.email,
          role   : user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // 6. Determine dashboard URL based on role
      const dashboardMap = {
        SystemAdmin     : '/dashboard/admin',
        FarmManager     : '/dashboard/farm-manager',
        FarmStaff       : '/dashboard/farm-staff',
        InventoryOfficer: '/dashboard/inventory',
        Buyer           : '/dashboard/buyer'
      };

      return res.status(200).json({
        message      : 'Login successful.',
        token,
        dashboardURL : dashboardMap[user.role],
        user: {
          userID   : user.user_id,
          fullName : user.full_name,
          email    : user.email,
          role     : user.role,
          status   : user.status
        }
      });

    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ message: 'Server error during login.' });
    }
  },

  // ── GET PROFILE ───────────────────────────────────────────────────────────────
  async getProfile(req, res) {
    try {
      const user = await UserModel.findByID(req.user.userID);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      return res.status(200).json({ user });
    } catch (err) {
      console.error('Get profile error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── UPDATE PROFILE ────────────────────────────────────────────────────────────
  async updateProfile(req, res) {
    try {
      const { fullName, phoneNumber } = req.body;

      const updated = await UserModel.updateProfile(req.user.userID, {
        fullName,
        phoneNumber
      });

      if (!updated) {
        return res.status(404).json({ message: 'User not found.' });
      }

      return res.status(200).json({
        message : 'Profile updated successfully.',
        user    : updated
      });
    } catch (err) {
      console.error('Update profile error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: 'currentPassword and newPassword are required.'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: 'New password must be at least 6 characters.'
        });
      }

      // Fetch full user with password hash
      const user = await UserModel.findByEmail(req.user.email);

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }

      const salt    = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await UserModel.updatePassword(req.user.userID, newHash);

      return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (err) {
      console.error('Change password error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = AuthController;
