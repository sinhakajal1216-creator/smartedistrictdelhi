const crypto = require('crypto');

/**
 * Local Development Storage Mechanism.
 * NOTE: This is an in-memory development store for rapid prototyping.
 * It is NOT intended for production-grade persistence.
 */
const users = new Map(); // email -> user record
const tokens = new Map(); // token -> { userId, expiresAt }

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password, salt, hash) {
  const candidateHash = hashPassword(password, salt);
  const hashBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');
  if (hashBuffer.length !== candidateBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

function generateToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
  tokens.set(token, { userId, expiresAt });
  return token;
}

function registerUser({ name, email, password }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw { statusCode: 400, message: 'Name is required' };
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw { statusCode: 400, message: 'Email is required' };
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    throw { statusCode: 400, message: 'Password must be at least 4 characters long' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (users.has(normalizedEmail)) {
    throw { statusCode: 400, message: 'User already exists with this email' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const id = 'usr_' + crypto.randomBytes(8).toString('hex');

  const user = {
    id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    salt,
    role: 'citizen',
    citizenProfile: {
      age: '',
      residency: false,
      residenceYears: '',
      income: '',
      gender: '',
      category: '',
      occupation: ''
    },
    createdAt: new Date().toISOString()
  };

  users.set(normalizedEmail, user);
  const token = generateToken(user.id);

  return {
    token,
    user: sanitizeUser(user)
  };
}

function loginUser({ email, password }) {
  if (!email || !password) {
    throw { statusCode: 400, message: 'Email and password are required' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = users.get(normalizedEmail);

  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  const token = generateToken(user.id);

  return {
    token,
    user: sanitizeUser(user)
  };
}

function getUserFromToken(tokenString) {
  if (!tokenString) return null;
  const cleanToken = tokenString.startsWith('Bearer ') ? tokenString.slice(7).trim() : tokenString.trim();
  const session = tokens.get(cleanToken);

  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    tokens.delete(cleanToken);
    return null;
  }

  for (const user of users.values()) {
    if (user.id === session.userId) {
      return sanitizeUser(user);
    }
  }

  return null;
}

function updateUserProfile(userId, profileData) {
  let targetUser = null;
  for (const user of users.values()) {
    if (user.id === userId) {
      targetUser = user;
      break;
    }
  }

  if (!targetUser) {
    throw { statusCode: 404, message: 'User not found' };
  }

  if (profileData.name && typeof profileData.name === 'string') {
    targetUser.name = profileData.name.trim();
  }

  if (profileData.citizenProfile && typeof profileData.citizenProfile === 'object') {
    targetUser.citizenProfile = {
      ...targetUser.citizenProfile,
      ...profileData.citizenProfile
    };
  } else if (typeof profileData === 'object') {
    // If root profile properties are provided directly
    const { name, email, ...directProfile } = profileData;
    targetUser.citizenProfile = {
      ...targetUser.citizenProfile,
      ...directProfile
    };
  }

  return sanitizeUser(targetUser);
}

module.exports = {
  registerUser,
  loginUser,
  getUserFromToken,
  updateUserProfile
};
