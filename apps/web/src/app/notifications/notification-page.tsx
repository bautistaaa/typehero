'use client';

import { Button } from '@repo/ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { ToastAction } from '@repo/ui/components/toast';
import { useToast } from '@repo/ui/components/use-toast';
import { Bell } from '@repo/ui/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { NOTIFICATION_QUERY_KEY } from '~/components/Navigation/notification-link';
import { markAllAsRead, markNotificationsAsRead } from './notification.actions';
import { NotificationsAll } from './notifications-all';
import { NotificationsMentions } from './notifications-mentions';

export default function NotificationPage() {
  const seenNotifications = useRef(new Set<number>());
  const timeoutRef = useRef<number>(undefined);
  const { toast } = useToast();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: markNotificationsAsRead,
  });

  const onSeen = (id: number) => {
    seenNotifications.current.add(id);
    const copy = new Set(seenNotifications.current);
    copy.add(id);
    clearTimeout(timeoutRef.current);

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = undefined;
      mutation.mutate(Array.from(seenNotifications.current), {
        onSuccess: () => {
          for (const id of copy) {
            seenNotifications.current.delete(id);
          }
        },
      });
      client.setQueryData([NOTIFICATION_QUERY_KEY], 0);
    }, 500);
  };

  const onMarkAllAsReadClick = async () => {
    await markAllAsRead();
    // partial matching is not working for some reason
    await client.invalidateQueries({ queryKey: ['notifications-all'] });
    await client.invalidateQueries({ queryKey: ['notifications-mentions'] });
    await client.refetchQueries({ queryKey: ['notifications-all'] });
    await client.refetchQueries({ queryKey: ['notifications-mentions'] });
    toast({
      variant: 'success',
      title: 'All notifications marked as read.',
      action: <ToastAction altText="Dismiss">Dismiss</ToastAction>,
    });
  };

  return (
    <div className="bg-background mx-auto min-w-[300px] max-w-3xl rounded-lg ">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-foreground flex items-center text-xl font-bold">
          <Bell className="mr-2 h-5 w-5" />
          Notifications
        </h2>
        <Button size="sm" variant="outline" onClick={onMarkAllAsReadClick}>
          Mark all as read
        </Button>
      </div>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-muted grid w-full grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="mentions">Mentions</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="border-border border">
          <NotificationsAll onSeen={onSeen} />
        </TabsContent>
        <TabsContent value="mentions" className="border-border border">
          <NotificationsMentions onSeen={onSeen} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
