"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export type ModalType =
  | "wallet"
  | "report"
  | "fanStatus"
  | "search"
  | "marketplace"
  | "claimSeat"
  | "settings"
  | "goal"
  | "levelUp"
  | "custom";

export interface SelectedInteractionState {
  id: string;
  name: string;
  price: number;
  type?: string;
  description?: string;
}

export interface LiveRoomUIState {
  // 1. Gift Drawer
  isGiftDrawerOpen: boolean;
  openGiftDrawer: () => void;
  closeGiftDrawer: () => void;
  toggleGiftDrawer: () => void;

  // 2. Chat Expanded / Collapsed
  isChatExpanded: boolean;
  expandChat: () => void;
  collapseChat: () => void;
  toggleChatExpanded: () => void;

  // 3. Selected Interaction
  selectedInteractionId: string | null;
  selectedInteraction: SelectedInteractionState | null;
  setSelectedInteraction: (interaction: SelectedInteractionState | null) => void;
  setSelectedInteractionId: (id: string | null) => void;
  clearSelectedInteraction: () => void;

  // 4. Video Audio & Mute State
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;

  // 5. Modal Management
  activeModal: ModalType | null;
  modalData: Record<string, any> | null;
  openModal: (modal: ModalType, data?: Record<string, any>) => void;
  closeModal: () => void;
  isModalOpen: (modal: ModalType) => boolean;

  // 6. Navigation & Layout Tabs
  activeDrawerTab: string;
  setActiveDrawerTab: (tab: string) => void;

  // 7. Touch & Drag Physics
  dragOffsetY: number;
  setDragOffsetY: (offset: number) => void;
  resetDragOffset: () => void;

  // 8. Global UI Reset
  resetUIState: () => void;
}

const LiveRoomUIContext = createContext<LiveRoomUIState | null>(null);

export function LiveRoomUIProvider({
  children,
  initialMuted = true,
  initialChatExpanded = true,
}: {
  children: React.ReactNode;
  initialMuted?: boolean;
  initialChatExpanded?: boolean;
}) {
  // 1. Gift Drawer
  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);

  // 2. Chat Expanded
  const [isChatExpanded, setIsChatExpanded] = useState(initialChatExpanded);

  // 3. Selected Interaction
  const [selectedInteraction, setSelectedInteraction] =
    useState<SelectedInteractionState | null>(null);

  // 4. Video Mute & Volume
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [volume, setVolumeState] = useState(1.0);

  // 5. Modal Management
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [modalData, setModalData] = useState<Record<string, any> | null>(null);

  // 6. Drawer Tab
  const [activeDrawerTab, setActiveDrawerTab] = useState<string>("gifts");

  // 7. Drag offset
  const [dragOffsetY, setDragOffsetY] = useState(0);

  // Handlers
  const openGiftDrawer = useCallback(() => setIsGiftDrawerOpen(true), []);
  const closeGiftDrawer = useCallback(() => {
    setIsGiftDrawerOpen(false);
    setSelectedInteraction(null);
  }, []);
  const toggleGiftDrawer = useCallback(() => setIsGiftDrawerOpen((prev) => !prev), []);

  const expandChat = useCallback(() => setIsChatExpanded(true), []);
  const collapseChat = useCallback(() => setIsChatExpanded(false), []);
  const toggleChatExpanded = useCallback(() => setIsChatExpanded((prev) => !prev), []);

  const setSelectedInteractionId = useCallback((id: string | null) => {
    if (!id) {
      setSelectedInteraction(null);
    } else {
      setSelectedInteraction((prev) =>
        prev?.id === id ? prev : { id, name: "Selected Item", price: 0 }
      );
    }
  }, []);

  const clearSelectedInteraction = useCallback(() => {
    setSelectedInteraction(null);
  }, []);

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);
  const setMuted = useCallback((muted: boolean) => setIsMuted(muted), []);
  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
    if (vol > 0) setIsMuted(false);
  }, []);

  const openModal = useCallback((modal: ModalType, data?: Record<string, any>) => {
    setActiveModal(modal);
    setModalData(data || null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  const isModalOpen = useCallback(
    (modal: ModalType) => activeModal === modal,
    [activeModal]
  );

  const resetDragOffset = useCallback(() => setDragOffsetY(0), []);

  const resetUIState = useCallback(() => {
    setIsGiftDrawerOpen(false);
    setSelectedInteraction(null);
    setActiveModal(null);
    setModalData(null);
    setDragOffsetY(0);
    setActiveDrawerTab("gifts");
  }, []);

  const value = useMemo(
    () => ({
      isGiftDrawerOpen,
      openGiftDrawer,
      closeGiftDrawer,
      toggleGiftDrawer,

      isChatExpanded,
      expandChat,
      collapseChat,
      toggleChatExpanded,

      selectedInteractionId: selectedInteraction?.id || null,
      selectedInteraction,
      setSelectedInteraction,
      setSelectedInteractionId,
      clearSelectedInteraction,

      isMuted,
      volume,
      toggleMute,
      setMuted,
      setVolume,

      activeModal,
      modalData,
      openModal,
      closeModal,
      isModalOpen,

      activeDrawerTab,
      setActiveDrawerTab,

      dragOffsetY,
      setDragOffsetY,
      resetDragOffset,

      resetUIState,
    }),
    [
      isGiftDrawerOpen,
      openGiftDrawer,
      closeGiftDrawer,
      toggleGiftDrawer,
      isChatExpanded,
      expandChat,
      collapseChat,
      toggleChatExpanded,
      selectedInteraction,
      setSelectedInteractionId,
      clearSelectedInteraction,
      isMuted,
      volume,
      toggleMute,
      setMuted,
      setVolume,
      activeModal,
      modalData,
      openModal,
      closeModal,
      isModalOpen,
      activeDrawerTab,
      dragOffsetY,
      resetDragOffset,
      resetUIState,
    ]
  );

  return (
    <LiveRoomUIContext.Provider value={value}>
      {children}
    </LiveRoomUIContext.Provider>
  );
}

/**
 * Hook to consume Local UI State anywhere in the component tree.
 * Guaranteed zero network overhead and instant local React reactivity.
 */
export function useLiveRoomUI(): LiveRoomUIState {
  const context = useContext(LiveRoomUIContext);
  if (!context) {
    throw new Error("useLiveRoomUI must be used within a LiveRoomUIProvider");
  }
  return context;
}
