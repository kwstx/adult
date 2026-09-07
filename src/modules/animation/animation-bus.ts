/**
 * Animation Event Bus & Audio Synthesis Engine
 *
 * Coordinates animation event dispatch, priority queueing, concurrency limits,
 * and synthesized celebratory audio chimes without external asset dependencies.
 */

import {
  AnimationQueueItem,
  MajorGiftAnimationPayload,
  RelationshipLevelUpAnimationPayload,
  GoalMetamorphosisAnimationPayload,
  VipEntranceAnimationPayload,
  SynthesizedChimeConfig,
} from "./types";

type AnimationSubscriber = (item: AnimationQueueItem | null) => void;

class AnimationBus {
  private subscribers: Set<AnimationSubscriber> = new Set();
  private queue: AnimationQueueItem[] = [];
  private activeItem: AnimationQueueItem | null = null;
  private timer: NodeJS.Timeout | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Check reduced motion in browser
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.soundEnabled = !mediaQuery.matches;
    }
  }

  public subscribe(fn: AnimationSubscriber): () => void {
    this.subscribers.add(fn);
    // Notify with current item
    fn(this.activeItem);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  private notify() {
    this.subscribers.forEach((fn) => fn(this.activeItem));
  }

  // Enqueue animation based on priority
  public enqueue(item: AnimationQueueItem) {
    // Check if duplicate ID exists
    const exists = this.queue.some((q) => (q.payload as any).id === (item.payload as any).id);
    if (exists || (this.activeItem && (this.activeItem.payload as any).id === (item.payload as any).id)) {
      return;
    }

    // Insert according to priority
    const priorityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      NORMAL: 2,
      SUBTLE: 1,
    };

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityWeight[item.priority] > priorityWeight[this.queue[i].priority]) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, item);
    this.processNext();
  }

  private processNext() {
    if (this.activeItem !== null) return;
    if (this.queue.length === 0) return;

    this.activeItem = this.queue.shift()!;
    this.notify();

    // Trigger corresponding audio cue
    this.playAudioForEvent(this.activeItem);

    // Calculate duration
    let duration = 3500;
    if (this.activeItem.type === "MAJOR_GIFT") {
      duration = (this.activeItem.payload as MajorGiftAnimationPayload).durationMs || 4200;
    } else if (this.activeItem.type === "RELATIONSHIP_LEVEL_UP") {
      duration = (this.activeItem.payload as RelationshipLevelUpAnimationPayload).durationMs || 4500;
    } else if (this.activeItem.type === "GOAL_100_METAMORPHOSIS") {
      duration = (this.activeItem.payload as GoalMetamorphosisAnimationPayload).durationMs || 5000;
    } else if (this.activeItem.type === "VIP_ENTRANCE") {
      duration = (this.activeItem.payload as VipEntranceAnimationPayload).durationMs || 3500;
    }

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.dismissCurrent();
    }, duration);
  }

  public dismissCurrent() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.activeItem = null;
    this.notify();
    // Process next item in queue
    setTimeout(() => {
      this.processNext();
    }, 150);
  }

  // Public Event Helpers
  public triggerMajorGift(payload: MajorGiftAnimationPayload) {
    this.enqueue({
      type: "MAJOR_GIFT",
      priority: payload.gift.tier === "LEGENDARY" ? "CRITICAL" : "HIGH",
      payload,
      createdAt: Date.now(),
    });
  }

  public triggerRelationshipLevelUp(payload: RelationshipLevelUpAnimationPayload) {
    this.enqueue({
      type: "RELATIONSHIP_LEVEL_UP",
      priority: payload.didTierAscend ? "HIGH" : "NORMAL",
      payload,
      createdAt: Date.now(),
    });
  }

  public triggerGoalMetamorphosis(payload: GoalMetamorphosisAnimationPayload) {
    this.enqueue({
      type: "GOAL_100_METAMORPHOSIS",
      priority: "CRITICAL",
      payload,
      createdAt: Date.now(),
    });
  }

  public triggerVipEntrance(payload: VipEntranceAnimationPayload) {
    this.enqueue({
      type: "VIP_ENTRANCE",
      priority: "NORMAL",
      payload,
      createdAt: Date.now(),
    });
  }

  // Synthesized Web Audio Harmonic Fanfare
  private playAudioForEvent(item: AnimationQueueItem) {
    if (!this.soundEnabled || typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      let config: SynthesizedChimeConfig;

      switch (item.type) {
        case "MAJOR_GIFT": {
          const isLegendary = (item.payload as MajorGiftAnimationPayload).gift.tier === "LEGENDARY";
          config = isLegendary
            ? { freqs: [587.33, 739.99, 880.0, 1174.66, 1479.98], durationSec: 1.2, gain: 0.18 } // D5, F#5, A5, D6, F#6 (Legendary chime)
            : { freqs: [440.0, 554.37, 659.25, 880.0], durationSec: 0.8, gain: 0.14 }; // A major
          break;
        }
        case "RELATIONSHIP_LEVEL_UP": {
          const ascended = (item.payload as RelationshipLevelUpAnimationPayload).didTierAscend;
          config = ascended
            ? { freqs: [523.25, 659.25, 783.99, 1046.5, 1318.51], durationSec: 1.1, gain: 0.2 } // C major ascension
            : { freqs: [493.88, 622.25, 739.99, 987.77], durationSec: 0.75, gain: 0.15 };
          break;
        }
        case "GOAL_100_METAMORPHOSIS": {
          config = { freqs: [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98], durationSec: 1.5, gain: 0.22 }; // Grand victory arpeggio
          break;
        }
        case "VIP_ENTRANCE": {
          config = { freqs: [659.25, 830.61, 987.77, 1318.51], durationSec: 0.85, gain: 0.12 }; // E major luxury shimmer
          break;
        }
        default:
          return;
      }

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      config.freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = config.type || "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gainNode.gain.setValueAtTime(0, now + idx * 0.08);
        gainNode.gain.linearRampToValueAtTime(config.gain || 0.15, now + idx * 0.08 + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + (config.durationSec || 0.8));

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + (config.durationSec || 0.8) + 0.1);
      });
    } catch {
      // Audio autoplay policy catch
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }
}

// Global Singleton Instance
export const animationBus = new AnimationBus();
