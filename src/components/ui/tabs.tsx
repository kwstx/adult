"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

export type TabsVariant = "pill" | "underline" | "segmented";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: TabsVariant;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = "pill",
  className,
  children,
  ...props
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue || "");
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (tab: string) => {
    if (value === undefined) setInternalTab(tab);
    if (onValueChange) onValueChange(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      <div className={cn("w-full flex flex-col", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = useContext(TabsContext);
  const variant = context?.variant || "pill";

  const variantListClasses: Record<TabsVariant, string> = {
    pill: "gap-1.5 p-1 bg-surface-base border border-white/[0.06] rounded-md inline-flex items-center",
    underline: "gap-6 border-b border-white/[0.08] flex items-center",
    segmented: "gap-1 p-1 bg-zinc-900/90 border border-white/[0.08] rounded-lg inline-flex items-center w-full",
  };

  return (
    <div
      role="tablist"
      className={cn(variantListClasses[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export function TabsTrigger({
  value,
  badge,
  icon,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be within Tabs");

  const { activeTab, setActiveTab, variant } = context;
  const isActive = activeTab === value;

  const variantTriggerClasses: Record<TabsVariant, string> = {
    pill: cn(
      "px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 ease-snappy select-none flex items-center gap-2",
      isActive
        ? "bg-accent text-white font-semibold shadow-sm shadow-accent/20"
        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
    ),
    underline: cn(
      "pb-3 pt-1 text-sm font-medium transition-all duration-150 ease-snappy select-none relative flex items-center gap-2 border-b-2 -mb-px",
      isActive
        ? "text-white font-semibold border-accent"
        : "text-zinc-400 hover:text-zinc-200 border-transparent"
    ),
    segmented: cn(
      "flex-1 justify-center py-2 text-xs font-medium rounded-md transition-all duration-150 ease-snappy select-none flex items-center gap-2",
      isActive
        ? "bg-surface-elevated text-white font-semibold shadow-md border border-white/[0.08]"
        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
    ),
  };

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(variantTriggerClasses[variant], className)}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span className="ml-1 text-[10px]">{badge}</span>
      )}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be within Tabs");

  if (context.activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("mt-4 animate-fade-in outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}
