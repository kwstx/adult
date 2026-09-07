"use client";

import React from "react";
import { Bell, Heart, Coins, Lock, Radio } from "lucide-react";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";

export type NotificationType = "tip" | "live" | "subscription" | "ppv" | "system";

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead?: boolean;
  avatarUrl?: string;
  actionUrl?: string;
  amount?: number;
}

export interface NotificationItemProps {
  notification: NotificationData;
  onRead?: (id: string) => void;
  onAction?: (notification: NotificationData) => void;
}

export function NotificationItem({
  notification,
  onRead,
  onAction,
}: NotificationItemProps) {
  const icons: Record<NotificationType, React.ReactNode> = {
    tip: <Coins className="h-3.5 w-3.5 text-amber-400" />,
    live: <Radio className="h-3.5 w-3.5 text-accent animate-pulse" />,
    subscription: <Heart className="h-3.5 w-3.5 text-pink-400" />,
    ppv: <Lock className="h-3.5 w-3.5 text-purple-400" />,
    system: <Bell className="h-3.5 w-3.5 text-zinc-400" />,
  };

  return (
    <div
      onClick={() => {
        if (!notification.isRead && onRead) onRead(notification.id);
        if (onAction) onAction(notification);
      }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-md transition-colors cursor-pointer select-none group",
        notification.isRead
          ? "bg-transparent hover:bg-surface-hover/50 text-zinc-400"
          : "bg-surface-elevated/80 hover:bg-surface-elevated text-zinc-200 border border-white/[0.06]"
      )}
    >
      <div className="relative shrink-0 pt-0.5">
        <Avatar
          src={notification.avatarUrl}
          name={notification.title}
          size="sm"
        />
        <div className="absolute -bottom-1 -right-1 rounded-full bg-surface-base p-0.5 border border-white/[0.1]">
          {icons[notification.type]}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-zinc-100 truncate group-hover:text-accent transition-colors">
            {notification.title}
          </p>
          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
            {notification.timestamp}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
      </div>

      {!notification.isRead && (
        <span className="h-2 w-2 rounded-full bg-accent shrink-0 self-center shadow-[0_0_8px_rgba(244,37,103,0.8)]" />
      )}
    </div>
  );
}

export function NotificationList({
  notifications = [],
  onRead,
  onAction,
  onClearAll,
}: {
  notifications: NotificationData[];
  onRead?: (id: string) => void;
  onAction?: (notification: NotificationData) => void;
  onClearAll?: () => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Bell className="h-8 w-8 text-zinc-600 mb-2" />
        <p className="text-xs font-medium text-zinc-400">No notifications yet</p>
        <p className="text-[11px] text-zinc-600 mt-0.5">
          Live stream alerts and tips will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-1">
      {onClearAll && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Activity
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Mark all read
          </button>
        </div>
      )}

      {notifications.map((n) => (
        <NotificationItem
          key={n.id}
          notification={n}
          onRead={onRead}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
