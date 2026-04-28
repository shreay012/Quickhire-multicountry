import { getDb } from '../../config/db.js';
import { ObjectId } from 'mongodb';

const usersCol = () => getDb().collection('users');
const sessionsCol = () => getDb().collection('sessions');

export const findUserByMobile = (mobile, role) =>
  usersCol().findOne({ mobile, role });

export const upsertUser = async ({ mobile, role, fcmToken }) => {
  const now = new Date();
  const update = {
    $setOnInsert: {
      mobile,
      role,
      'meta.isProfileComplete': false,
      'meta.status': 'active',
      createdAt: now,
    },
    $set: { 'meta.lastLoginAt': now, updatedAt: now },
  };
  if (fcmToken) {
    update.$addToSet = {
      fcmTokens: { token: fcmToken, platform: 'unknown', createdAt: now },
    };
  }
  const r = await usersCol().findOneAndUpdate(
    { mobile, role },
    update,
    { upsert: true, returnDocument: 'after' },
  );
  return r.value || r;
};

export const findUserById = (id) => usersCol().findOne({ _id: new ObjectId(id) });

export const createSession = async ({ userId, refreshTokenHash, ip, ua, expiresAt }) => {
  const doc = {
    userId: new ObjectId(userId),
    refreshTokenHash,
    ip,
    ua,
    revoked: false,
    createdAt: new Date(),
    expiresAt,
  };
  const r = await sessionsCol().insertOne(doc);
  return { _id: r.insertedId, ...doc };
};

export const revokeSession = (sessionId) =>
  sessionsCol().updateOne({ _id: new ObjectId(sessionId) }, { $set: { revoked: true } });

export const findSession = (sessionId) =>
  sessionsCol().findOne({ _id: new ObjectId(sessionId) });
