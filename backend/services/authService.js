const crypto = require('crypto');

/**
 * In-memory user/session store for the current prototype.
 * Passwords are hashed with scrypt. Sessions are opaque random tokens.
 * Replace this with a persistent store before production deployment.
 */
const users = new Map(); // email -> user record
const tokens = new Map(); // token -> { userId, expiresAt }

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CITIZEN_PROFILE_ALLOWLIST = [
  'age',
  'residency',
  'delhiResident',
  'residenceYears',
  'income',
  'gender',
  'category',
  'occupation',
  'disability',
  'disabilityPercentage',
  'aadhaar',
  'receivesOtherPension',
  'maritalStatus',
  'locality'
];

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

function parseBearerToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string') return '';
  return tokenString.startsWith('Bearer ') ? tokenString.slice(7).trim() : tokenString.trim();
}

function pickCitizenProfile(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const next = {};
  for (const field of CITIZEN_PROFILE_ALLOWLIST) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) continue;
    const value = source[field];
    if (value === undefined || typeof value === 'function' || typeof value === 'object') continue;
    next[field] = typeof value === 'string' ? value.trim().slice(0, 120) : value;
  }
  return next;
}

function registerUser({ name, email, password }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw { statusCode: 400, message: 'Name is required' };
  }
  if (!email || typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    throw { statusCode: 400, message: 'A valid email is required' };
  }
  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw { statusCode: 400, message: 'Password must be at least 8 characters long' };
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
    name: name.trim().slice(0, 80),
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
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
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
  const cleanToken = parseBearerToken(tokenString);
  if (!cleanToken) return null;
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

function revokeToken(tokenString) {
  const cleanToken = parseBearerToken(tokenString);
  if (!cleanToken) return false;
  return tokens.delete(cleanToken);
}

function findUserById(userId) {
  for (const user of users.values()) {
    if (user.id === userId) return user;
  }
  return null;
}

function updateUserProfile(userId, profileData) {
  const targetUser = findUserById(userId);

  if (!targetUser) {
    throw { statusCode: 404, message: 'User not found' };
  }

  if (profileData.name && typeof profileData.name === 'string') {
    targetUser.name = profileData.name.trim().slice(0, 80);
  }

  const incomingProfile = profileData.citizenProfile && typeof profileData.citizenProfile === 'object'
    ? profileData.citizenProfile
    : profileData;

  const allowed = pickCitizenProfile(incomingProfile);
  targetUser.citizenProfile = {
    ...targetUser.citizenProfile,
    ...allowed
  };

  return sanitizeUser(targetUser);
}

module.exports = {
  registerUser,
  loginUser,
  getUserFromToken,
  updateUserProfile,
  revokeToken
};
