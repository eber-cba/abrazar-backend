const authService = require('./auth.service');

const sessionService = require('../sessions/session.service');
const { uploadImage, deleteImage } = require('../../config/cloudinary');
const { bufferToBase64 } = require('../../utils/file.utils');

/**
 * Registers a new user.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {string} req.body.name - User name
 * @param {string} [req.body.role] - User role (optional, defaults to VOLUNTEER)
 * @param {boolean} req.body.acceptedTerms - Whether terms are accepted
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const register = async (req, res, next) => {
  try {
    const { user, token, refreshToken } = await authService.register(req.body);
    
    // Create session
    await sessionService.createSession(user.id, token, req.headers['user-agent'], req.ip);

    res.status(201).json({
      status: 'success',
      token,
      refreshToken,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logs in a user.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token, refreshToken } = await authService.login(email, password);

    // Create session
    await sessionService.createSession(user.id, token, req.headers['user-agent'], req.ip);

    res.status(200).json({
      status: 'success',
      token,
      refreshToken,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logs out a user by revoking their token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const logout = async (req, res, next) => {
  try {
    const token = req.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (token) {
      await sessionService.revokeToken(token, req.user?.id, 'User logout');
    }

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Refreshes an access token using a refresh token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.refreshToken - Refresh token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.status(200).json({
      status: 'success',
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Updates the current user's profile.
 * Handles profile photo upload if present.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} req.body - Fields to update
 * @param {Object} [req.file] - Uploaded file (photo)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let updateData = { ...req.body };

    // Handle profile photo upload
    if (req.file) {
      // Delete old photo if exists
      if (req.user.photoUrl) {
        try {
          const parts = req.user.photoUrl.split('/');
          const filename = parts[parts.length - 1].split('.')[0];
          const folder = parts.slice(parts.indexOf('upload') + 2, -1).join('/');
          const publicId = `${folder}/${filename}`;
          await deleteImage(publicId);
        } catch (err) {
          console.error('Error deleting old profile photo:', err);
        }
      }

      const base64Image = bufferToBase64(req.file.buffer, req.file.mimetype);
      const uploadResult = await uploadImage(base64Image, {
        folder: 'abrazar/users',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ]
      });
      
      updateData.photoUrl = uploadResult.url;
    }

    const updatedUser = await authService.updateUser(userId, updateData);
    res.status(200).json({
      status: 'success',
      data: { user: updatedUser },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logs in or registers a user via Firebase (Social Login).
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.idToken - Firebase ID Token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const firebaseLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const { user, token, refreshToken } = await authService.firebaseLogin(idToken);
    res.status(200).json({
      status: 'success',
      token,
      refreshToken,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refresh,
  updateMe,
  firebaseLogin,
  logout,
};
