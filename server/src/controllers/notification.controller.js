import { asyncHandler } from '../utils/asyncHandler.js';
import * as notificationService from '../services/notification.service.js';

export const getNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user._id, req.query);
  res.json({
    success: true,
    data: result.items,
    meta: {
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
      pages: result.pages,
    },
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationAsRead(req.params.id, req.user._id);
  res.json({
    success: true,
    data: notification,
    message: 'Notification marked as read',
  });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsAsRead(req.user._id);
  res.json({
    success: true,
    message: result.message,
  });
});
