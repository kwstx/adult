"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Radio,
  Clock,
  Sparkles,
  MessageSquare,
  Flame,
  Star,
  Film,
  Calendar,
  X,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, any>;
  sender?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

interface NotificationCenterProps {
  userId?: string;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId = "fan_alex",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"ALL" | "LIVE" | "MESSAGES" | "DROPS" | "RENEWALS">("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=30`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.pagination.unreadCount);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  // 2. Connect to real-time Server-Sent Events (SSE)
  useEffect(() => {
    if (!userId) return;

    const eventSource = new EventSource(`/api/notifications/stream?userId=${userId}`);

    eventSource.addEventListener("notification", (event) => {
      try {
        const newNotif: NotificationItem = JSON.parse(event.data);

        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Flash toast notification
        setToastNotification(newNotif);
        setTimeout(() => {
          setToastNotification((curr) => (curr?.id === newNotif.id ? null : curr));
        }, 5000);
      } catch (err) {
        console.error("Error parsing SSE notification:", err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  // 3. Mark single notification as read
  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  // 4. Mark all as read
  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  // 5. Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter items by category
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "LIVE") return n.type === "CREATOR_WENT_LIVE";
    if (activeTab === "MESSAGES") return n.type === "MESSAGE_RECEIVED";
    if (activeTab === "DROPS") return n.type === "DROP_RELEASE" || n.type === "CONTENT_RELEASE";
    if (activeTab === "RENEWALS") return n.type === "SUB_RENEWAL" || n.type === "PRIVATE_SESSION_REMINDER";
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "CREATOR_WENT_LIVE":
        return <Radio className="w-4 h-4 text-red-500 animate-pulse" />;
      case "PRIVATE_SESSION_REMINDER":
        return <Clock className="w-4 h-4 text-amber-400" />;
      case "SUB_RENEWAL":
        return <Star className="w-4 h-4 text-yellow-400" />;
      case "MESSAGE_RECEIVED":
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case "CONTENT_RELEASE":
        return <Film className="w-4 h-4 text-pink-400" />;
      case "GOAL_COMPLETED":
      case "GOAL_REACHED":
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case "CREATOR_EVENT":
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case "DROP_RELEASE":
        return <Flame className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow-lg animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Toast Alert */}
      {toastNotification && !isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 w-80 rounded-xl bg-zinc-950/95 border border-zinc-700 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          <div className="mt-0.5 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
            {getNotificationIcon(toastNotification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{toastNotification.title}</h4>
            <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{toastNotification.body}</p>
            {toastNotification.actionUrl && (
              <a
                href={toastNotification.actionUrl}
                onClick={() => markAsRead(toastNotification.id)}
                className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium mt-2"
              >
                View Details <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="text-zinc-500 hover:text-zinc-300 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-2xl bg-zinc-950/95 border border-zinc-800 shadow-2xl backdrop-blur-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchNotifications}
                disabled={isLoading}
                title="Refresh"
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition text-xs flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800/60 overflow-x-auto text-xs scrollbar-none">
            {[
              { id: "ALL", label: "All" },
              { id: "LIVE", label: "Live 🔴" },
              { id: "MESSAGES", label: "Messages 💬" },
              { id: "DROPS", label: "Drops & PPV 🔥" },
              { id: "RENEWALS", label: "Reminders ⏰" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition font-medium ${
                  activeTab === tab.id
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-900">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500 mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-zinc-300">No notifications yet</p>
                <p className="text-xs text-zinc-500 mt-1">
                  You will receive real-time alerts when creators go live, drop content, or message you.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-3.5 flex gap-3 hover:bg-zinc-900/60 cursor-pointer transition relative group ${
                    !notif.isRead ? "bg-rose-950/10" : ""
                  }`}
                >
                  {!notif.isRead && (
                    <div className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-rose-500" />
                  )}
                  <div className="mt-0.5 p-2 rounded-xl bg-zinc-900 border border-zinc-800/80 shrink-0 self-start">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className={`text-xs font-semibold leading-snug truncate ${
                          !notif.isRead ? "text-white" : "text-zinc-300"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    {notif.actionUrl && (
                      <a
                        href={notif.actionUrl}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-medium mt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Open <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={(e) => markAsRead(notif.id, e)}
                      title="Mark as read"
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-zinc-300 transition self-center"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 text-center">
            <span className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-time SSE Notification Engine Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
