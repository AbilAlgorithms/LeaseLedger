import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notification.api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Bell, CheckCheck, Check, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterUnread, setFilterUnread] = useState(false);

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications', filterUnread],
    queryFn: async () => {
      const res = await notificationApi.getNotifications({
        isRead: filterUnread ? false : null,
      });
      return res.data;
    },
    refetchInterval: 15000, // Poll every 15s
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('All notifications marked as read');
    },
  });

  const items = notifData?.data || [];
  const unreadCount = notifData?.meta?.unreadCount || 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline font-bold text-2xl text-primary">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="disputed" size="sm">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            System notices, inspection sign-off requests, and incident dispatch alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFilterUnread(!filterUnread)}
          >
            {filterUnread ? 'Show All' : 'Show Unread Only'}
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              isLoading={markAllMutation.isPending}
              icon={CheckCheck}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Spinner size="lg" />
      ) : items.length === 0 ? (
        <EmptyState
          title="All caught up!"
          description="You have no notifications at this time. Handover requests and inspection updates will appear here."
          icon={Bell}
        />
      ) : (
        <div className="space-y-3">
          {items.map((notif) => (
            <div
              key={notif.id || notif._id}
              className={`p-4 rounded-lg border transition-all flex items-start justify-between gap-4 ${
                notif.isRead
                  ? 'bg-surface-container-lowest border-outline-variant/30 opacity-75'
                  : 'bg-surface-container-low border-primary/30 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    notif.isRead
                      ? 'bg-surface-container text-on-surface-variant'
                      : 'bg-primary-container text-on-primary-container'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-primary">
                      {notif.message}
                    </span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-damage inline-block" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-outline flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notif.link && (
                  <Link to={notif.link}>
                    <Button variant="ghost" size="sm" icon={ArrowRight}>
                      View
                    </Button>
                  </Link>
                )}
                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={() => markReadMutation.mutate(notif.id || notif._id)}
                    className="p-1 rounded text-outline hover:text-primary transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
