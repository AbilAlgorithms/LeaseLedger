import { Notification } from '../models/index.js';
import { sendEmail } from './mail.service.js';

export async function notifyUser({
  userId,
  type,
  message,
  link = '',
  email = null,
  emailSubject = '',
  emailHtml = '',
}) {
  try {
    // 1. Create in-app notification record
    const notification = await Notification.create({
      user: userId,
      type,
      message,
      link,
      isRead: false,
    });

    // 2. Dispatch email if specified
    if (email && emailSubject && emailHtml) {
      sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
      });
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Failed to dispatch notification:', error.message);
    return null; // Non-blocking
  }
}

export async function getUserNotifications(userId, { isRead = null, limit = 20, page = 1 } = {}) {
  const query = { user: userId };
  if (isRead !== null) {
    query.isRead = isRead === 'true' || isRead === true;
  }

  const skip = (page - 1) * limit;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  return {
    items,
    total,
    unreadCount,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function markNotificationAsRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { isRead: true } },
    { new: true }
  );
}

export async function markAllNotificationsAsRead(userId) {
  await Notification.updateMany({ user: userId, isRead: false }, { $set: { isRead: true } });
  return { message: 'All notifications marked as read' };
}
