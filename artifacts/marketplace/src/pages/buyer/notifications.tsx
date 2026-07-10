import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCheck, Circle } from "lucide-react";

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifs = [], isLoading } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey() },
  });

  const markAll = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "All notifications marked as read" });
      },
    },
  });

  const markOne = useMarkNotificationRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    },
  });

  const unreadCount = notifs.filter((n: any) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => markAll.mutate({})}
            disabled={markAll.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex gap-3">
              <Skeleton className="h-4 w-4 rounded-full shrink-0 skeleton-shimmer" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4 skeleton-shimmer" />
                <Skeleton className="h-3 w-32 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Bell className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No notifications yet</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            Order updates, price drops, and alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {(notifs as any[]).map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                n.read
                  ? "bg-card border-border text-muted-foreground"
                  : "bg-card border-primary/20 ring-1 ring-primary/10"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {n.read ? (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                ) : (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary mt-0.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${n.read ? "" : "font-medium text-foreground"}`}>
                  {n.message}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  {new Date(n.createdAt).toLocaleString(undefined, {
                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  })}
                </p>
              </div>
              {!n.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => markOne.mutate({ id: n.id })}
                  disabled={markOne.isPending}
                >
                  Dismiss
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
