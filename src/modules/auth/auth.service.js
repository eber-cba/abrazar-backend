const prisma = require('../../prismaClient');
const bcrypt = require('bcrypt');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../../utils/jwt');
const AppError = require('../../utils/errors');

/**
 * Creates a new user in the database.
 * 
 * @param {Object} data - User registration data
 * @param {string} data.email - User email
 * @param {string} data.password - User password
 * @param {string} data.name - User name
 * @param {string} [data.role] - User role
 * @param {boolean} data.acceptedTerms - Whether terms are accepted
 * @returns {Promise<Object>} Object containing user, token, and refreshToken
 */
const register = async (data) => {
  const { email, password, name, role, acceptedTerms } = data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already in use', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: role || 'VOLUNTEER',
      acceptedTerms: acceptedTerms,
    },
  });

  const token = signToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  // Save refresh token (hashed ideally, but for now plain or hashed?)
  // User request said "Refresh Tokens". Storing in DB is good practice for revocation.
  // I added refreshToken field to User model.
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { user, token, refreshToken };
};

/**
 * Authenticates a user with email and password.
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Object containing user, token, and refreshToken
 */
const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  const token = signToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { user, token, refreshToken };
};

/**
 * Refreshes an access token.
 * 
 * @param {string} token - Refresh token
 * @returns {Promise<Object>} Object containing new token and new refreshToken
 */
const refresh = async (token) => {
  try {
    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid refresh token', 401);
    }

    const newToken = signToken(user.id);
    const newRefreshToken = signRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    return { token: newToken, refreshToken: newRefreshToken };
  } catch (err) {
    throw new AppError('Invalid refresh token', 401);
  }
};

/**
 * Updates user profile data.
 * 
 * @param {string} userId - ID of the user to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user object
 */
const updateUser = async (userId, updateData) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent updating sensitive fields directly
  if (updateData.password) {
    throw new AppError('Password cannot be updated directly. Use a dedicated password change endpoint.', 400);
  }
  if (updateData.role) {
    throw new AppError('User role cannot be updated by self.', 403);
  }

  // Handle email change unique constraint
  if (updateData.email && updateData.email !== user.email) {
    const existingUserWithEmail = await prisma.user.findUnique({ where: { email: updateData.email } });
    if (existingUserWithEmail) {
      throw new AppError('Email already in use', 409);
    }
  }

  return await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { 
      id: true, 
      email: true, 
      name: true, 
      photoUrl: true, 
      role: true, 
      acceptedTerms: true,
      createdAt: true,
      updatedAt: true,
      organizationId: true
    },
  });
};

/**
 * Authenticates a user using Firebase ID Token.
 * Creates a new user if one doesn't exist.
 * 
 * @param {string} idToken - Firebase ID Token
 * @returns {Promise<Object>} Object containing user, token, and refreshToken
 */
const firebaseLogin = async (idToken) => {
  const firebaseAdmin = require('../../config/firebase'); // Import initialized firebase-admin instance
  
  if (!firebaseAdmin || typeof firebaseAdmin.auth !== 'function') {
    throw new AppError('Firebase Admin SDK not initialized or misconfigured.', 500);
  }

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const firebaseEmail = decodedToken.email;
    const firebaseName = decodedToken.name || decodedToken.email.split('@')[0];

    let user = await prisma.user.findUnique({ where: { email: firebaseEmail } });

    if (!user) {
      // If user doesn't exist, create a new one.
      // For social logins, we auto-accept terms. Password is not used directly.
      user = await prisma.user.create({
        data: {
          email: firebaseEmail,
          password: 'SOCIAL_LOGIN_PASSWORD_PLACEHOLDER', // Placeholder, as social logins don't use direct password
          name: firebaseName,
          acceptedTerms: true, // Auto-accept terms for social users
          // Other fields can be set as default or based on Firebase data
        },
      });
    }

    // Generate our own JWT and refresh token
    const token = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return { user, token, refreshToken };
  } catch (error) {
    throw new AppError(`Firebase authentication failed: ${error.message}`, 401);
  }
};

module.exports = {
  register,
  login,
  refresh,
  updateUser,
  firebaseLogin,
};
