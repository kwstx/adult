# Platform Overview & Core Principles

## 1. What You Are Actually Building

At the highest level, the platform is five systems connected together:

1. **Consumer Application**: What fans see — discovery, live video, profiles, chat, interactions, wallet, content, subscriptions, progression, and so on.
2. **Creator Operating System**: What creators use — go live, configure interaction menus, manage audiences, sell products, manage content, view earnings, and control room settings.
3. **Economic Engine**: Handles credits, purchases, subscriptions, PPV, gifts, paid interactions, creator earnings, refunds, and payouts.
4. **Real-time Engine**: Handles livestream presence, chat, gifts, interaction queues, goal progress, leaderboard updates, and events requiring immediate broadcast.
5. **Trust and Safety Engine**: Handles age assurance, creator verification, moderation, reports, fraud prevention, chargeback handling, account restrictions, audit trails, and platform security.

Everything else sits on top of these five core systems.

---

## 2. Fundamental Security & Authority Principle

> **The frontend is never the authority.**

- The browser can say: *"I want to buy this."*
  - It cannot say: *"I successfully bought this."*
  - **The backend decides whether the purchase happened.**

- The browser can say: *"I want to send 500 credits."*
  - It cannot say: *"Deduct 500 credits from me."*
  - **The backend controls the wallet.**

- The browser can say: *"I want to enter this VIP room."*
  - It cannot say: *"Grant access."*
  - **The backend decides whether the user actually has access.**

This distinction is fundamental to building a trustworthy and secure platform.
