const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Company, Plan, WidgetKey, SystemSetting } = require('../models');
const emailService = require('../services/emailService');

// Generate JWT tokens
const generateTokens = async (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  // Only include tenantId if user has one (not for super admins)
  if (user.tenant_id) {
    payload.tenantId = user.tenant_id;
  }

  // Get session timeout from settings
  const sessionTimeoutSetting = await SystemSetting.findOne({
    where: { setting_key: 'session_timeout' }
  });
  
  // Convert minutes to seconds, default to 7 days (10080 minutes = 604800 seconds)
  const sessionTimeoutMinutes = sessionTimeoutSetting ? parseInt(sessionTimeoutSetting.value) : 10080;
  const sessionTimeoutSeconds = sessionTimeoutMinutes * 60;
  
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: `${sessionTimeoutSeconds}s`
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });

  return { accessToken, refreshToken };
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, name, role = 'company_admin', company_name } = req.body;

    // Check if registration is enabled
    const registrationSetting = await SystemSetting.findOne({
      where: { setting_key: 'enable_registration' }
    });
    
    const isRegistrationEnabled = registrationSetting ? registrationSetting.value === 'true' : true;
    
    if (!isRegistrationEnabled) {
      return res.status(403).json({
        success: false,
        message: 'User registration is currently disabled'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      role,
      email_verification_token: emailVerificationToken,
      tenant_id: null // Will be set if company is created
    });

    // If company name is provided and role is company_admin, create company
    if (company_name && role === 'company_admin') {
      // Find the free plan (ID 1)
      const freePlan = await Plan.findOne({ where: { name: 'Free' } });
      
      const company = await Company.create({
        name: company_name,
        status: 'active', // Set to active since they get free plan
        plan_id: freePlan ? freePlan.id : 1 // Default to ID 1 if free plan not found
      });

      // Update user with tenant_id
      await user.update({ tenant_id: company.id });

      // Generate widget key for the company
      const widgetKey = await WidgetKey.create({
        tenant_id: company.id,
        key: crypto.randomUUID(),
        is_active: true
      });

      console.log(`Generated widget key for company ${company.name}: ${widgetKey.key}`);
      const { getWidgetUrl } = require('../../config/urls');
      console.log(`Widget snippet URL: ${getWidgetUrl(widgetKey.key)}`);

      // Send verification email
      // await emailService.sendVerificationEmail(user.email, emailVerificationToken);
    } else if (role === 'customer') {
      // Send verification email for customers
      // await emailService.sendVerificationEmail(user.email, emailVerificationToken);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // Get max login attempts setting
    const maxAttemptsSetting = await SystemSetting.findOne({
      where: { setting_key: 'max_login_attempts' }
    });
    const maxLoginAttempts = maxAttemptsSetting ? parseInt(maxAttemptsSetting.value) : 5;

    // Find user with company info
    const user = await User.findOne({
      where: { email },
      include: [
        { model: Company, as: 'company' }
      ]
    });

    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details:', {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified
      });
    }

    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      const lockUntil = new Date(user.account_locked_until);
      const minutesRemaining = Math.ceil((lockUntil - new Date()) / (1000 * 60));
      console.log('Account locked for user:', email, 'until:', lockUntil);
      return res.status(423).json({
        success: false,
        message: `Account is locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
        account_locked: true,
        locked_until: lockUntil
      });
    }

    // Reset lock if it has expired
    if (user.account_locked_until && new Date(user.account_locked_until) <= new Date()) {
      await user.update({
        failed_login_attempts: 0,
        account_locked_until: null
      });
      user.failed_login_attempts = 0;
      user.account_locked_until = null;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockUntil = null;
      
      // Lock account if max attempts reached
      if (newFailedAttempts >= maxLoginAttempts) {
        // Lock for 30 minutes
        lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await user.update({
          failed_login_attempts: newFailedAttempts,
          account_locked_until: lockUntil
        });
        
        return res.status(423).json({
          success: false,
          message: `Too many failed login attempts. Account has been locked for 30 minutes.`,
          account_locked: true,
          locked_until: lockUntil,
          attempts_remaining: 0
        });
      } else {
        await user.update({
          failed_login_attempts: newFailedAttempts
        });
        
        const attemptsRemaining = maxLoginAttempts - newFailedAttempts;
        return res.status(401).json({
          success: false,
          message: `Invalid email or password. ${attemptsRemaining} attempt(s) remaining before account lock.`,
          attempts_remaining: attemptsRemaining
        });
      }
    }

    // Check maintenance mode (only for non-super admin users)
    if (user.role !== 'super_admin') {
      const maintenanceSetting = await SystemSetting.findOne({
        where: { setting_key: 'maintenance_mode' }
      });

      const isMaintenanceMode = maintenanceSetting && maintenanceSetting.value === 'true';

      if (isMaintenanceMode) {
        console.log('Maintenance mode is active, blocking login for non-super admin:', email);
        return res.status(503).json({
          success: false,
          message: 'System is currently under maintenance. Please try again later.',
          maintenance_mode: true
        });
      }
    }

    // Check email verification requirement
    const emailVerificationSetting = await SystemSetting.findOne({
      where: { setting_key: 'require_email_verification' }
    });
    
    const requireEmailVerification = emailVerificationSetting ? emailVerificationSetting.value === 'true' : false;
    
    if (requireEmailVerification && !user.email_verified) {
      console.log('Email verification required but not verified for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('User not active:', user.status);
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Check Two-Factor Authentication requirement
    const twoFactorSetting = await SystemSetting.findOne({
      where: { setting_key: 'enable_two_factor' }
    });
    
    const requireTwoFactor = twoFactorSetting ? twoFactorSetting.value === 'true' : false;
    
    if (requireTwoFactor) {
      // Check if user has 2FA enabled (this would need to be checked against user's 2FA settings)
      // For now, we'll just log it - full 2FA implementation would require additional fields and logic
      console.log('Two-factor authentication is required for user:', email);
      // Note: Full 2FA implementation would require checking user's 2FA status and prompting for code
    }

    console.log('All checks passed, generating tokens...');

    // Reset failed login attempts on successful login
    // Update last login
    await user.update({ 
      last_login: new Date(),
      failed_login_attempts: 0,
      account_locked_until: null
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    // Get session timeout for cookie expiration
    const sessionTimeoutSetting = await SystemSetting.findOne({
      where: { setting_key: 'session_timeout' }
    });
    const sessionTimeoutMinutes = sessionTimeoutSetting ? parseInt(sessionTimeoutSetting.value) : 10080;
    const maxAgeMs = sessionTimeoutMinutes * 60 * 1000; // Convert minutes to milliseconds

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeMs
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    console.log('Login successful for user:', email);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token: accessToken,
        refresh_token: refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
      password_reset_token: resetToken,
      password_reset_expires: resetExpires
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    res.json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset email'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      where: {
        password_reset_token: token,
        password_reset_expires: {
          [require('sequelize').Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    await user.update({
      password,
      password_reset_token: null,
      password_reset_expires: null
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      where: { email_verification_token: token }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    await user.update({
      email_verified: true,
      email_verification_token: null
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    await user.update({ email_verification_token: emailVerificationToken });

    // Send verification email
    await emailService.sendVerificationEmail(user.email, emailVerificationToken);

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // Clear HTTP-only cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

    // Get session timeout for cookie expiration
    const sessionTimeoutSetting = await SystemSetting.findOne({
      where: { setting_key: 'session_timeout' }
    });
    const sessionTimeoutMinutes = sessionTimeoutSetting ? parseInt(sessionTimeoutSetting.value) : 10080;
    const maxAgeMs = sessionTimeoutMinutes * 60 * 1000; // Convert minutes to milliseconds

    // Set new HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeMs
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { 
          model: Company, 
          as: 'company',
          include: [
            { model: Plan, as: 'plan' }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name, avatar, phone } = req.body;
    const user = await User.findByPk(req.user.id);

    await user.update({ name, avatar, phone });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword
};
