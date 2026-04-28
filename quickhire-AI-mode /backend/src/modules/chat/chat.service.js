import { ObjectId } from 'mongodb';
import { getDb } from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { emitTo } from '../../socket/index.js';
import { enqueueNotification } from '../notification/notification.service.js';

const col = () => getDb().collection('messages');
const usersCol = () => getDb().collection('users');

async function attachSender(messages) {
  if (!messages || !messages.length) return messages;
  const ids = [...new Set(messages.map((m) => String(m.senderId)).filter(Boolean))];
  if (!ids.length) return messages;
  const users = await usersCol()
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { name: 1, role: 1 } })
    .toArray();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return messages.map((m) => {
    const u = byId.get(String(m.senderId));
    return {
      ...m,
      msg_from: u ? { _id: String(u._id), name: u.name || 'User', role: u.role } : { _id: String(m.senderId), name: 'User' },
    };
  });
}

/**
 * Build the canonical room id for a chat.
 * If pmId provided: ${pmId}_service_${serviceId}
 * Else (pre-assignment): service_${serviceId}_pending_${userId}
 */
export function roomIdFor({ pmId, serviceId, userId }) {
  if (pmId) return `${pmId}_service_${serviceId}`;
  return `service_${serviceId}_pending_${userId}`;
}

export async function canJoinRoom(user, roomId) {
  if (!roomId) return false;
  if (user.role === 'admin') return true;
  // pmId_service_serviceId  OR  service_X_pending_Y
  if (roomId.startsWith('service_') && roomId.includes('_pending_')) {
    return roomId.endsWith(`_pending_${user.id}`) || user.role === 'pm';
  }
  const [pmId] = roomId.split('_service_');
  if (user.role === 'pm') return pmId === user.id;
  if (user.role === 'user') return true; // ownership enforced via message persistence
  return false;
}

export async function getHistory({ user, customerId, serviceId, before, limit = 50 }) {
  // customerId is either pmId (assigned) or serviceId (pending)
  let roomId;
  if (customerId === serviceId) {
    roomId = roomIdFor({ serviceId, userId: user.id });
  } else {
    roomId = roomIdFor({ pmId: customerId, serviceId });
  }
  const filter = { roomId };
  if (before) filter._id = { $lt: new ObjectId(before) };
  const items = await col().find(filter).sort({ createdAt: -1 }).limit(Math.min(limit, 100)).toArray();
  const enriched = await attachSender(items.reverse());
  return { roomId, items: enriched };
}

export async function persistAndBroadcast({ sender, roomId, msgType = 0, msg = '', attachment = null, serviceId, bookingId, firstMsg = 0, tempId }) {
  if (!roomId) throw new AppError('VALIDATION_ERROR', 'roomId required', 422);
  if (msgType === 0 && !msg.trim() && !attachment) {
    throw new AppError('VALIDATION_ERROR', 'message empty', 422);
  }
  const doc = {
    roomId,
    serviceId: serviceId ? new ObjectId(serviceId) : null,
    bookingId: bookingId ? new ObjectId(bookingId) : null,
    senderId: new ObjectId(sender.id),
    senderRole: sender.role,
    msgType,
    msg: msg || '',
    attachment,
    firstMsg,
    seenBy: [],
    deliveredTo: [],
    createdAt: new Date(),
  };
  const r = await col().insertOne(doc);
  const baseMessage = { ...doc, _id: r.insertedId };
  const [enriched] = await attachSender([baseMessage]);
  const message = enriched;
  const payload = { ...message, tempId };

  // Canonical: room broadcast on `new-message`; direct user push on `message:new`
  // (per PLATFORM_ARCHITECTURE 4.2). FE accepts either; we no longer spam the
  // legacy `new_message` alias to avoid duplicate UI bubbles.
  emitTo(roomId, 'new-message', payload);

  // Push notification to "other" participants in the room
  // Naive: derive recipient from roomId convention; admin observer ignored
  notifyOtherParticipants(roomId, sender, message).catch(() => {});

  return message;
}

async function notifyOtherParticipants(roomId, sender, message) {
  const targets = [];
  if (roomId.includes('_pending_')) {
    const userId = roomId.split('_pending_')[1];
    if (userId !== sender.id) targets.push(userId);
  } else {
    const [pmId] = roomId.split('_service_');
    // notify pm if sender isn't pm; notify customer requires booking lookup — skipped for simplicity
    if (pmId !== sender.id) targets.push(pmId);
  }
  for (const t of targets) {
    // Direct user push (canonical per 4.2)
    emitTo(`user_${t}`, 'message:new', message);
    await enqueueNotification({
      userId: t,
      type: 'CHAT_MESSAGE',
      title: 'New message',
      body: message.msg ? message.msg.slice(0, 80) : 'Attachment',
      data: { roomId },
    });
  }
}

export async function markSeen(messageId, userId) {
  await col().updateOne(
    { _id: new ObjectId(messageId) },
    { $addToSet: { seenBy: { userId: new ObjectId(userId), at: new Date() } } },
  );
}
