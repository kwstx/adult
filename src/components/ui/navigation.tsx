"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Bell, Coins, Search, User } from "lucide-react";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

// --- Navbar (Top Navigation Bar) ---
export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  brandLogo?: React.ReactNode;
  brandName?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  tokenBalance?: number;
  onWalletClick?: () => void;
  unreadNotificationsCount?: number;
  onNotificationClick?: () => void;
  userAvatarUrl?: string;
  userName?: string;
  onProfileClick?: () => void;
  actions?: React.ReactNode;
}

export function Navbar({
  brandLogo,
  brandName = "AuraLive",
  showSearch = true,
  searchPlaceholder = "Search creators, tags, live rooms...",
  onSearch,
  tokenBalance,
  onWalletClick,
  unreadNotificationsCount = 0,
  onNotificationClick,
  userAvatarUrl,
  userName,
  onProfileClick,
  actions,
  className,
  ...props
}: NavbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 w-full border-b border-white/[0.08] bg-black/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 select-none",
        className
      )}
      {...props}
    >
      {/* Brand & Left Slot */}
      <div className="flex items-center gap-4 min-w-[140px]">
        <Link href="/" className="flex items-center gap-2.5 group">
          {brandLogo || (
            <div className="h-8 w-8 rounded-md bg-gradient-to-tr from-accent to-pink-600 flex items-center justify-center shadow-[0_0_12px_rgba(244,37,103,0.4)]">
              <span className="font-bold text-white text-base tracking-tighter">A</span>
            </div>
          )}
          <span className="font-bold text-lg tracking-tight text-white group-hover:text-accent transition-colors">
            {brandName}
          </span>
        </Link>
      </div>

      {/* Middle Search Slot */}
      {showSearch && (
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <Input
            size="sm"
            variant="glass"
            placeholder={searchPlaceholder}
            startIcon={<Search className="h-4 w-4 text-zinc-400" />}
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        </div>
      )}

      {/* Right User & Wallet Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {actions}

        {/* Token Balance Pill */}
        {tokenBalance !== undefined && (
          <button
            type="button"
            onClick={onWalletClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-card border border-white/[0.08] hover:border-amber-500/40 hover:bg-surface-hover transition-all duration-150 active:scale-[0.98]"
          >
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-mono text-xs font-bold text-zinc-100 tabular-nums">
              {tokenBalance.toLocaleString()}
            </span>
          </button>
        )}

        {/* Notification Bell */}
        {onNotificationClick && (
          <button
            type="button"
            onClick={onNotificationClick}
            className="relative p-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-black" />
            )}
          </button>
        )}

        {/* User Profile Trigger */}
        {onProfileClick && (
          <button
            type="button"
            onClick={onProfileClick}
            className="flex items-center gap-2 pl-1 rounded-full hover:opacity-85 transition-opacity"
            aria-label="User profile"
          >
            <Avatar src={userAvatarUrl} name={userName} size="sm" />
          </button>
        )}
      </div>
    </header>
  );
}

// --- NavRail (Desktop Left Slim Rail) ---
export interface NavRailProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function NavRail({ className, children, ...props }: NavRailProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-20 hidden lg:flex flex-col items-center justify-between w-[72px] bg-surface-base border-r border-white/[0.08] py-5 select-none",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export interface NavRailItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export function NavRailItem({
  icon,
  label,
  isActive = false,
  href,
  onClick,
  badge,
}: NavRailItemProps) {
  const content = (
    <div
      onClick={onClick}
      title={label}
      className={cn(
        "relative group flex flex-col items-center justify-center h-12 w-12 rounded-lg transition-all duration-150 ease-snappy cursor-pointer",
        isActive
          ? "bg-accent/15 text-accent shadow-sm"
          : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
      )}
    >
      {/* Active Laser Line on Left Edge */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-accent shadow-[0_0_8px_rgba(244,37,103,0.8)]" />
      )}

      <span className="shrink-0">{icon}</span>

      {badge && <span className="absolute top-1 right-1">{badge}</span>}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// --- Mobile Bottom Navigation ---
export interface MobileBottomBarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function MobileBottomBar({
  className,
  children,
  ...props
}: MobileBottomBarProps) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-30 lg:hidden h-14 bg-black/90 backdrop-blur-md border-t border-white/[0.08] px-4 flex items-center justify-around select-none",
        className
      )}
      {...props}
    >
      {children}
    </nav>
  );
}

export function MobileBottomItem({
  icon,
  label,
  isActive = false,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-colors",
        isActive ? "text-accent font-semibold" : "text-zinc-400 hover:text-zinc-200"
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-[10px] leading-none tracking-tight">{label}</span>
    </div>
  );

  if (href) {
    return <Link href={href} className="flex-1">{content}</Link>;
  }

  return content;
}

// --- Breadcrumbs ---
export interface BreadcrumbItemData {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items = [],
  className,
}: {
  items: BreadcrumbItemData[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-xs text-zinc-400", className)}>
      <ol className="flex items-center space-x-2">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center space-x-2">
              {idx > 0 && <ChevronRight className="h-3 w-3 text-zinc-600" />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-zinc-200 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && "text-zinc-100 font-semibold")}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// --- Pagination ---
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center gap-1.5 select-none", className)}>
      <Button
        variant="secondary"
        size="icon-sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="font-mono text-xs text-zinc-400 px-3">
        {currentPage} / {totalPages}
      </span>

      <Button
        variant="secondary"
        size="icon-sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
