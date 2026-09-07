# AGENTS.md

## Repository Operating Contract

This repository contains the production implementation of an 18+ web-first creator livestream and monetization platform. The platform combines live discovery, livestreaming, creator subscriptions, PPV content, paid messaging, virtual-credit transactions, live interactions, creator/fan progression, private sessions, social status, and trust/safety.

This file is the permanent operating contract for AI coding agents working in this repository.

The detailed specifications live under `docs/`. This file establishes the rules that apply everywhere.

---

## 1. Source of Truth

Treat the repository documentation as the product and engineering source of truth.

Before implementing a feature:
1. Inspect the repository.
2. Locate the relevant specification under `docs/`.
3. Read the relevant product, UX, architecture, data, API, realtime, security, and acceptance documentation.
4. Inspect existing implementations before creating new abstractions.
5. Identify dependencies and affected domains.
6. Produce an implementation plan when the task is non-trivial.
7. Implement only after the plan is internally consistent with the existing architecture.
8. Do not invent product behavior when the specification already defines it.
9. If the specification is ambiguous, contradictory, incomplete, or missing a decision that materially affects behavior, stop and report the ambiguity rather than silently choosing a product rule.
10. Small implementation details may be chosen by the agent when they do not change product behavior, security boundaries, financial behavior, public API contracts, or architectural principles. Record significant architectural choices in an ADR under `docs/decisions/`.

---

## 2. Core Product Principles

The product is:
- web-first
- live-first
- creator-centric
- interaction-driven
- relationship-driven
- marketplace-oriented
- minimalist and premium in presentation
- designed for 18+ users
- security- and trust-sensitive
- financially transactional

The core loop is:
**Discover creator → enter live → watch → interact → transact → earn progression → unlock status/access → return → deepen creator relationship.**

The principal product differentiation is the creator-attention economy.

A livestream is not merely video. It may contain:
- audience presence
- chat
- paid interactions
- gifts/tips
- goals
- queues
- progression
- relationship status
- leaderboards
- subscriptions
- content
- private-session opportunities
- creator-controlled experiences

Do not gradually turn the product into a generic social network, generic video site, or generic subscription platform.

---

## 3. Architectural Principles

Use a modular full-stack architecture first. Do not introduce microservices unless there is a documented reason.

The initial conceptual architecture is:
```
Browser
→ Next.js / React application
→ domain/business layer
→ PostgreSQL
```

With supporting infrastructure:
- Redis for temporary/high-speed shared state and realtime support
- object storage for uploaded media
- CDN for media/static delivery
- specialist livestream/media infrastructure
- payment provider
- identity/age-verification provider
- background job queue/workers
- email/push notification infrastructure
- search infrastructure when required
- analytics infrastructure as scale requires

Keep domain boundaries explicit even when multiple domains live in the same deployable application.

Do not create architecture merely because it is fashionable.

---

## 4. Technology Rules

Unless an approved ADR says otherwise:
- TypeScript is the application language.
- Next.js + React is the web application framework.
- PostgreSQL is the authoritative transactional database.
- Redis is used for temporary/shared realtime state where appropriate.
- Object storage is used for uploaded media.
- A CDN is used for media/static distribution.
- Specialized infrastructure is preferred for livestream media rather than implementing video delivery from scratch.
- Database migrations are version-controlled.
- Environment-specific configuration is externalized.
- Secrets never belong in source code.

Use current stable versions compatible with the repository and existing dependency policy. Do not perform broad dependency upgrades as part of unrelated feature work.

---

## 5. Frontend Rules

The frontend is responsible for presentation and interaction, not authority.

Use Next.js Server Components by default where appropriate.
Use Client Components when the UI requires:
- browser APIs
- interactive state
- event handlers
- realtime updates
- live player controls
- chat
- swipe gestures
- drawers/modals
- interactive purchasing
- animations driven by browser state

Do not move business-critical authorization or financial logic into client code merely for convenience.

The browser is never authoritative for:
- price
- wallet balance
- XP
- relationship level
- entitlement
- ownership
- creator permissions
- subscription state
- payment success
- payout state
- moderation state
- game outcome
- reward amount
- eligibility
- role

The browser may request an operation. The backend decides whether the operation is valid.

---

## 6. Backend Rules

Backend endpoints should remain thin.

A typical request flow is:
```
Authentication
→ input validation
→ authorization
→ domain service
→ transactional/data operations
→ domain event
→ response
```

Business rules belong in domain/application services rather than UI components or route handlers.

Do not duplicate important business rules across frontend and backend.

Frontend validation is for user experience.
Backend validation is authoritative.

Every externally supplied identifier must be validated and authorized against server-side state.

---

## 7. Authentication and Authorization

Authentication answers:
> Who is this user?

Authorization answers:
> What is this authenticated user allowed to do?

Never treat authentication as authorization.

Examples:
A logged-in fan may not automatically:
- access PPV media
- enter VIP rooms
- purchase an interaction
- book a private session
- view creator analytics
- start a livestream

A logged-in creator may not automatically:
- monetize
- publish content
- receive payouts
- change financial settings
- access another creator's data

Administrative access must use explicit roles/permissions and stronger security controls.

Never rely on hidden frontend buttons for security.

---

## 8. Financial System Rules

Financial and wallet logic is high-risk code.

Treat all financial operations as authoritative backend operations.

The system must distinguish conceptually between:
- **Orders** — what was purchased.
- **Payments** — how the purchase was financially processed.
- **Wallet ledger entries** — movement of platform credits.
- **Entitlements** — what the user received access to.
- **Creator earnings** — what the creator is owed.
- **Payouts** — movement of creator earnings to an external payout method.

Do not collapse these concepts into one mutable balance field or one generic transaction object unless the specification explicitly defines such a model.

### Wallet
- Do not implement the wallet as an un-audited mutable number.
- Use a ledger-based design.
- Every balance-changing operation must be traceable.
- Financial operations must be atomic.
- Use database transactions for operations that modify related financial records.
- Protect concurrent balance modifications using appropriate database concurrency controls.
- Use idempotency for operations that may be retried, especially:
  - payment fulfillment
  - wallet crediting
  - wallet debits
  - purchases
  - refunds
  - webhook processing
  - payout operations

A repeated request must not accidentally create a second financial effect.

Never trust a client-supplied:
- price
- balance
- creator share
- discount
- transaction result
- payment status
- entitlement

Look up authoritative values on the server.

---

## 9. Payment Rules

The frontend does not decide that payment succeeded.

A normal payment flow should conceptually be:
```
User initiates purchase
→ backend creates internal purchase/order state
→ payment provider processes payment
→ provider sends server-side confirmation/webhook
→ backend verifies the webhook
→ backend transitions payment/order state
→ entitlement and/or wallet ledger are updated
→ domain event is emitted
→ frontend receives authoritative state
```

Webhook processing must be idempotent.

Do not fulfill financial value solely because a browser redirected to a "success" page.

Payment-provider behavior must comply with the provider's rules and the platform's applicable legal/compliance requirements.

Do not hard-code a payment provider's assumptions into unrelated domains.

---

## 10. Age Assurance, Creator Verification, and Trust

This is an 18+ platform.

Do not implement age assurance as merely a client-side checkbox if the applicable specification requires stronger verification.

Treat verification as a backend-controlled state/entitlement.

Sensitive verification information must be minimized.
Do not store sensitive identity information unless required.

Creator onboarding must use explicit states.
Only appropriately verified and approved creators may access monetization capabilities.

Trust/safety is not an optional later feature.
Relevant user-generated objects should have moderation states where appropriate.
Important actions must be auditable.

Do not build features that intentionally bypass applicable platform rules, payment rules, age-assurance requirements, gambling restrictions, privacy requirements, or other legal controls.

---

## 11. Free Game Rules

Free games are a separate domain and must remain isolated from the financial wallet.

The game system must not directly mutate paid credit balances.

Do not allow the browser to determine authoritative game outcomes or rewards.
Game outcomes and rewards must be server-controlled.

The game system may award explicitly permitted non-monetary/product rewards such as:
- fan XP
- creator relationship XP
- status/badges
- access entitlements
- priority interaction
- premium seating/status
- predetermined creator experiences

Do not introduce credit, cash, payout, or economically equivalent rewards into free games unless a separate approved product/legal specification explicitly permits them.

Any future game mechanics involving paid entry, wagering, chance-based economic value, or redeemable value require a dedicated legal/product decision before implementation.

---

## 12. Realtime Rules

Realtime events represent authoritative state changes.

Use a standardized event vocabulary.
Examples include:
- `LIVE_STARTED`
- `LIVE_ENDED`
- `USER_JOINED`
- `USER_LEFT`
- `MESSAGE_CREATED`
- `GIFT_SENT`
- `INTERACTION_CREATED`
- `INTERACTION_PURCHASED`
- `INTERACTION_ACCEPTED`
- `INTERACTION_COMPLETED`
- `GOAL_PROGRESS`
- `GOAL_COMPLETED`
- `RELATIONSHIP_LEVEL_UP`
- `LEADERBOARD_UPDATED`
- `CONTENT_PURCHASED`
- `SESSION_BOOKED`

Do not make multiple unrelated systems independently guess that an important event occurred.

Prefer:
```
authoritative state change
→ domain event
→ interested consumers update their state
```

Realtime events must be authorized.
Do not broadcast private information to users who are not entitled to receive it.

The database remains authoritative for durable state.
Redis/realtime infrastructure must not become an accidental source of permanent truth.

---

## 13. State Machines

Use explicit state machines for lifecycle-heavy domains.

Examples:
- creator onboarding
- livestream lifecycle
- interaction lifecycle
- payment lifecycle
- subscription lifecycle
- private-session lifecycle
- moderation lifecycle
- payout lifecycle
- verification lifecycle

Avoid collections of unrelated booleans that allow impossible states.

Every state transition should have:
- valid previous state(s)
- valid next state
- authorization requirements
- side effects
- emitted events where applicable
- audit requirements where applicable

Do not create an undocumented state transition merely to make a test pass.

---

## 14. Entitlements

Treat entitlements as a first-class abstraction.

An entitlement answers:
> What does this user currently have access to?

Examples:
- subscription access
- VIP access
- purchased PPV content
- private-session access
- premium seat
- priority interaction
- special event
- predetermined reward

Entitlements must be determined server-side.

The frontend may request the user's current entitlements and render the appropriate interface.

Do not duplicate entitlement logic throughout dozens of components.

---

## 15. Orders

Monetizable actions should have explicit order/purchase representations where appropriate.

Examples:
- subscription
- PPV
- gift
- paid interaction
- private session
- paid experience

An order should describe what was purchased.
A wallet ledger entry describes credit movement.
A payment describes financial processing.
An entitlement describes what access/value was granted.

Keep these concepts separate.

---

## 16. Media Rules

Uploaded media must not become public merely because a database record exists.

Private/PPV media should use protected storage.

Prefer direct-to-storage uploads using controlled temporary authorization where appropriate.

Media processing may include:
- validation
- transcoding
- thumbnails
- moderation
- metadata extraction
- publishing state

Do not expose permanent unrestricted URLs for protected content.

Livestream media transport should be handled by appropriate specialized infrastructure.

The application backend authorizes access and manages application state; it should not unnecessarily transport every video frame.

---

## 17. Messaging and User-Generated Content

All user-generated content is untrusted input.

Validate:
- size
- type
- encoding
- authorization
- ownership
- moderation state
- rate limits

Protect against:
- injection
- XSS
- spam
- abuse
- unauthorized media access
- message flooding
- malicious attachments

Do not assume that content rendered inside the application is safe merely because it originated from an authenticated user.

---

## 18. Creator Interaction Marketplace

Creator interactions are business objects, not merely buttons.

An interaction may contain:
- creator
- name
- description
- price
- eligibility
- quantity/capacity
- duration
- acceptance requirement
- queue behavior
- active/inactive state

When a fan purchases an interaction:
1. Load the authoritative interaction.
2. Verify it exists.
3. Verify it is active.
4. Verify current price.
5. Verify eligibility.
6. Verify capacity.
7. Verify the fan is permitted.
8. Verify wallet/payment requirements.
9. Execute the transaction atomically.
10. Create the purchase/order state.
11. Create/update the queue.
12. Emit the relevant event.
13. Return authoritative state.

Never accept the browser's submitted price as authoritative.

---

## 19. Private Sessions

Private-session booking is a scarce-resource problem.

The system must prevent double booking.

Use database constraints and appropriate transactional concurrency control.

A booking flow should conceptually be:
```
Discover availability
→ select slot
→ reserve atomically
→ complete required payment
→ confirm booking
→ generate access entitlement
→ notify participants
→ authorize media access at session time
```

Do not solve double booking with frontend checks.

---

## 20. Discovery and Recommendations

Initially prefer deterministic, explainable ranking over premature machine learning.

Useful signals include:
- follows
- watch duration
- repeat visits
- category affinity
- interactions
- purchases
- subscriptions
- negative engagement
- current popularity

Collect behavioral events from the beginning.

Do not create an opaque recommendation system before there is sufficient behavioral data.

Recommendation systems must respect:
- account status
- age/region eligibility
- creator visibility
- moderation restrictions
- blocking
- privacy settings
- availability
- platform policy

---

## 21. Analytics

Separate operational truth from analytical workloads.

Operational questions:
- What is the current wallet state?
- Is this subscription active?
- Does this user own this content?
- Is this live active?

Analytical questions:
- What was revenue last week?
- Which creators have the best retention?
- Which feed position converts best?
- Which interactions generate repeat purchases?

Do not run large analytical workloads against critical transactional paths if a scalable analytical system is appropriate.

Capture meaningful product events consistently.

---

## 22. Privacy and Data Minimization

Collect only what is needed.

Sensitive information must have stricter access controls.

Do not expose internal identity or verification data to normal application APIs.

Administrative access to sensitive information should be restricted and auditable.

Implement data retention/deletion behavior according to the product/legal specification.

Do not log secrets, payment credentials, identity documents, authentication tokens, or unnecessary sensitive personal data.

Logs should contain enough information to debug without becoming a second sensitive database.

---

## 23. Security Rules

Assume every client request can be malicious.

Use:
- HTTPS
- secure authentication/session handling
- authorization checks
- input validation
- output encoding where appropriate
- rate limiting
- abuse controls
- secure headers where appropriate
- CSRF protections where applicable
- secure secret management
- dependency/security scanning
- database least privilege
- audit logging
- backup and recovery procedures

Never commit:
- API keys
- private keys
- database passwords
- provider secrets
- signing secrets
- production credentials

Never log secrets.

Never bypass authorization because "the frontend already hides it."

---

## 24. API Rules

API contracts must be explicit.

Every endpoint should define:
- purpose
- authentication requirement
- authorization requirement
- request schema
- response schema
- validation behavior
- error behavior
- idempotency requirements where applicable
- side effects
- emitted events where applicable

Do not make breaking API changes without updating the specification and relevant consumers.

Prefer consistent error formats.

Do not expose internal database implementation details unnecessarily.

---

## 25. Database Rules

PostgreSQL is authoritative for durable transactional state.

Use:
- foreign keys
- unique constraints
- check constraints where useful
- appropriate indexes
- explicit transaction boundaries
- appropriate locking/concurrency controls
- timestamps
- audit fields where appropriate

Do not rely exclusively on application code for invariants that the database can safely enforce.

Never edit production data manually as a shortcut.

Use migrations for schema changes.

Migrations must be:
- version-controlled
- reviewable
- repeatable
- safe for deployment
- compatible with the application's rollout strategy

Destructive schema changes require careful migration planning.

---

## 26. Redis Rules

Redis is not the default source of truth.

Use Redis for appropriate temporary/high-speed workloads such as:
- presence
- cached state
- rate limiting
- short-lived coordination
- realtime fan-out support
- temporary leaderboards
- queues where explicitly designed

Durable financial state, ownership, entitlements, subscriptions, bookings, moderation decisions, and other authoritative business records belong in PostgreSQL or their explicitly approved authoritative system.

If Redis loses all data, the platform must be able to reconstruct durable business state from authoritative sources.

---

## 27. Background Jobs

Use background workers for work that does not need to block the immediate user request.

Examples:
- video processing
- thumbnails
- notifications
- emails
- search indexing
- analytics processing
- moderation pipelines
- fraud analysis
- payout processing

Jobs must be designed for retries.

Retryable jobs must be idempotent or otherwise protected from duplicate side effects.

Do not put slow external provider calls into critical synchronous paths unless necessary.

---

## 28. Observability

Production systems must be observable.

Track appropriate:
- request latency
- error rates
- database performance
- queue depth
- realtime connection health
- payment failures
- wallet failures
- media failures
- worker failures
- moderation backlog
- payout failures

Use structured logs.
Use correlation/request identifiers.
Add tracing where the architecture benefits from it.

Never sacrifice security/privacy merely to make logs more verbose.

---

## 29. Testing Requirements

Every meaningful feature requires tests.

Use the appropriate combination of:
- unit tests
- integration tests
- API tests
- database tests
- end-to-end tests
- security/authorization tests
- concurrency tests
- load tests where relevant

Financial and permission-sensitive code requires stronger coverage.

Important scenarios include:
- insufficient balance
- concurrent spending
- duplicate requests
- duplicate payment webhooks
- delayed webhooks
- refunds
- chargebacks
- expired subscriptions
- revoked entitlements
- concurrent booking attempts
- interaction capacity exhaustion
- creator disabling an interaction during purchase
- unauthorized content access
- unauthorized creator/admin actions
- moderation restrictions
- account suspension

Do not delete or weaken tests simply to make a feature pass.

If behavior intentionally changes, update the specification and tests together.

---

## 30. Definition of Done

A feature is not complete because the UI renders.

A feature is complete only when the applicable requirements are satisfied.

At minimum, consider:
- product behavior implemented
- frontend implemented
- backend implemented
- database changes implemented
- migrations created
- authorization implemented
- validation implemented
- error states implemented
- loading states implemented
- realtime behavior implemented where required
- analytics/events implemented where required
- security requirements implemented
- tests added
- existing tests pass
- type checking passes
- linting passes
- build passes
- no unexplained console errors
- documentation updated
- acceptance criteria verified

For financial functionality, also verify:
- transaction atomicity
- idempotency
- concurrency behavior
- auditability
- refund behavior
- failure behavior
- webhook behavior

---

## 31. Implementation Workflow

For every non-trivial task:

- **Step 1 — Understand**: Read the task and relevant documentation.
- **Step 2 — Inspect**: Inspect existing code, architecture, schema, APIs, tests, and dependencies.
- **Step 3 — Plan**: Create a concise implementation plan. Identify:
  - files to modify
  - files to create
  - database changes
  - API changes
  - frontend changes
  - domain changes
  - events
  - security implications
  - tests
  - documentation changes
- **Step 4 — Validate the plan**: Check that the plan does not violate existing architecture or specifications. If there is an unresolved product decision, stop.
- **Step 5 — Implement**: Implement the smallest coherent slice. Do not create speculative abstractions for hypothetical future requirements.
- **Step 6 — Test**: Run targeted tests first, then the broader required checks.
- **Step 7 — Review**: Review the diff for:
  - security
  - authorization
  - financial correctness
  - race conditions
  - unintended scope
  - duplicated business logic
  - performance
  - accessibility
  - responsive behavior
- **Step 8 — Document**: Update the relevant documentation if implementation behavior changed.
- **Step 9 — Report**: Summarize:
  - what changed
  - tests run
  - architectural decisions
  - known limitations
  - unresolved decisions

---

## 32. Scope Discipline

Do not modify unrelated code merely because it could be improved.

Avoid:
- broad refactors during feature work
- dependency upgrades unrelated to the task
- renaming large portions of the repository without need
- introducing new infrastructure without justification
- speculative abstractions
- replacing working systems for stylistic reasons

If you discover unrelated technical debt, document it separately.

A small required refactor is acceptable when it is necessary to implement the feature safely.

---

## 33. No Mocked Production Behavior

Do not represent a feature as complete using fake behavior.

Examples of unacceptable shortcuts:
- fake wallet balances
- fake successful payments
- fake creator earnings
- fake verification status
- hard-coded entitlement checks
- client-generated XP
- client-generated financial outcomes
- fake booking confirmation
- permanent public PPV URLs
- simulated realtime events presented as production behavior

Mocks are acceptable in tests and explicitly designated development environments.
They must not accidentally become production logic.

---

## 34. Error and Failure Philosophy

Failures are normal system states.

Design explicitly for:
- network failure
- payment failure
- provider timeout
- duplicate requests
- stale frontend state
- database contention
- worker retry
- livestream disconnect
- realtime disconnect
- moderation rejection
- authorization failure
- expired entitlement
- account restriction

Never hide a failure by displaying false success.

For financial operations, communicate clearly whether:
- the operation succeeded
- it failed before charging
- it is pending
- it requires reconciliation

---

## 35. Accessibility and Responsive Design

Accessibility is part of implementation quality.

Use:
- semantic HTML
- keyboard accessibility
- visible focus states
- appropriate labels
- sufficient contrast
- accessible dialogs/drawers
- reduced-motion support where appropriate
- screen-reader-friendly states

The product is mobile-first for the live discovery experience but must provide a high-quality desktop experience.

Do not simply stretch the mobile layout to desktop.

---

## 36. Design Direction

The visual system should be:
- dark
- minimalist
- edgy
- premium
- modern
- restrained

Prefer:
- strong typography
- dark neutral surfaces
- one primary accent
- subtle transparency where useful
- high-quality imagery
- purposeful motion
- generous spacing
- clear hierarchy

Avoid:
- visual clutter
- excessive gradients
- excessive badges
- unnecessary animations
- casino-like visual overload
- feature overload on the primary live screen

The primary live experience should be understandable within approximately two seconds.

Complexity should appear progressively when the user intentionally opens a feature.

---

## 37. Product Priorities

The initial product should prove the core loop before expanding breadth.

Prioritize:
1. identity and trust
2. creator onboarding
3. creator profiles
4. discovery
5. livestreaming
6. realtime interaction
7. wallet
8. payments
9. subscriptions
10. PPV
11. messaging
12. gifts
13. interaction marketplace
14. collective goals
15. relationship progression
16. XP/status
17. private sessions
18. storefront
19. matchmaking
20. free games
21. advanced analytics and optimization

Do not build native apps, proprietary payment processing, proprietary video infrastructure, complex microservices, sophisticated ML recommendations, or wallet-connected games prematurely.

---

## 38. Human-Owned Product Decisions

The agent must not silently decide important business or legal policy.

Human/product-owner decisions include, but are not limited to:
- creator revenue share
- exact pricing
- subscription tiers
- credit packages
- promotional-credit rules
- expiration rules
- refund policy
- chargeback policy
- XP values
- level thresholds
- VIP semantics
- seat semantics
- interaction pricing rules
- private-session policies
- supported countries
- age-assurance requirements
- creator verification requirements
- content policy
- moderation policy
- payment provider selection
- payout provider selection
- game mechanics with legal implications

If these are unspecified, create a decision request rather than guessing.

---

## 39. Decision Records

Significant architectural or product decisions should be recorded under:
`docs/decisions/`

Use an ADR format containing:
- title
- status
- date
- context
- decision
- alternatives considered
- consequences
- affected systems

Do not overwrite history to hide previous decisions.
If a decision changes, create a new ADR or explicitly supersede the old one.

---

## 40. Documentation Structure

The repository should progressively maintain documentation similar to:

```text
docs/
├── 00-MASTER-BUILD-SPEC.md
├── 01-PRODUCT-SPEC.md
├── 02-ARCHITECTURE.md
├── 03-DATA-MODEL.md
├── 04-API-CONTRACTS.md
├── 05-REALTIME.md
├── 06-SECURITY-TRUST-SAFETY.md
├── 07-DESIGN-SYSTEM.md
├── 08-TESTING-ACCEPTANCE.md
├── 09-IMPLEMENTATION-PLAN.md
├── 10-ENVIRONMENT-OPERATIONS.md
├── 11-DOMAIN-RULES.md
├── 12-AGENT-PROMPT.md
├── 13-DEFINITION-OF-DONE.md
├── 14-DECISION-LOG.md
├── domains/
├── decisions/
└── exec-plans/
```

Do not create documentation purely for ceremony. Documentation must make implementation and future agent reasoning easier.

---

## 41. Working With Existing Code

Before adding a new implementation:
- search for existing related functionality
- reuse existing domain services where appropriate
- inspect existing database models
- inspect existing validation
- inspect existing authorization
- inspect existing event definitions
- inspect existing UI components
- inspect existing tests

Do not create duplicate systems because the relevant code was not searched for.

Prefer extending a correct existing abstraction over creating a parallel one.

---

## 42. Agent Communication

When a task is complete, report concisely:
- **Implemented**: What changed.
- **Tests**: What was run and the result.
- **Database**: Migrations/schema changes.
- **APIs**: New or changed endpoints.
- **Realtime**: New or changed events.
- **Security**: Relevant security/authorization changes.
- **Documentation**: Documents updated.
- **Decisions**: Any ADRs or product decisions required.
- **Remaining**: Known limitations or follow-up work.

Do not claim a feature is complete if it is only partially implemented.

---

## 43. Stop Conditions

Stop implementation and ask for a decision when:
- requirements conflict
- a security boundary is unclear
- financial behavior is ambiguous
- authorization is ambiguous
- legal/compliance-sensitive behavior is unspecified
- an external provider requirement materially changes the architecture
- a destructive migration is required without an approved migration strategy
- a feature requires breaking an established API contract
- a requested shortcut would make the system materially less secure
- the correct implementation cannot be determined from available specifications

Do not guess in these cases.

---

## 44. Final Rule

Optimize for a system that is:
`correct → secure → testable → observable → maintainable → scalable → visually polished`

Do not optimize for:
`fastest code generation → largest amount of code → most abstractions → most services → most features`

The goal is not to generate a large application.
The goal is to build the specified product correctly.

When speed and correctness conflict, protect correctness.
When convenience and security conflict, protect security.
When a feature request conflicts with an explicit specification, follow the specification until the specification is intentionally changed.
When the specification is silent on a consequential decision, stop and ask.
