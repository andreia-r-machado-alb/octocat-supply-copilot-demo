<!-- markdownlint-disable-file -->
# Planning Log: Order Stock Management and Cancellation Workflow

## Discrepancy Log

Gaps and differences identified between research findings and the implementation plan.

### Unaddressed Research Items

* DR-01: Research proposes optional `reservedQuantity` and `lastStockUpdate` inventory expansion, but this plan prioritizes minimal stock fields needed for Option B confirmation workflow.
  * Source: .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 765-768)
  * Reason: Keep first implementation bounded to confirmation-time deduction and cancellation compensation.
  * Impact: medium

* DR-02: Research recommends full shared-store enforcement across all route modules; this plan scopes mandatory shared-state migration to inventory-affecting modules first.
  * Source: .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 563-569)
  * Reason: Reduce migration risk while delivering stock safety outcomes in order/product lifecycle.
  * Impact: medium

* DR-03: Research calls out multi-instance and persistence risks that cannot be fully solved with in-memory lock patterns.
  * Source: .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 581-585)
  * Reason: Out of immediate feature scope; requires infrastructure and storage redesign.
  * Impact: high

* DR-04: Research includes delivery-driven automatic order status updates and cross-aggregate delivery synchronization scenarios.
  * Source: .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 253-320)
  * Reason: Deferred to avoid coupling inventory confirmation with delivery orchestration in first increment.
  * Impact: medium

* DR-05: Research recommends broad validation middleware and richer HTTP error coverage (`400`, `401`, `403`, `429`) beyond stock-specific flows.
  * Source: .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 458-495)
  * Reason: This plan addresses `422` and `409` for order stock workflows only.
  * Impact: low

### Plan Deviations from Research

* DD-01: Order confirmation implementation keeps optimistic concurrency support optional in initial pass.
  * Research recommends: Add per-order `version` and reject stale updates with `409`.
  * Plan implements: Service-first confirmation and lock serialization with optional version field integration.
  * Rationale: Lock serialization provides deterministic single-process safety now; optimistic versioning can follow with lower rollout risk.

* DD-02: Cancellation implementation adopts Approach D service decomposition but may defer complete order/inventory event schema hardening.
  * Research recommends: Full append-only audit and movement event metadata set (`reasonCode`, `reason`, `cancelledBy`, `cancelledAt`, `idempotencyKey`, `correlationId`).
  * Plan implements: Transactional cancellation service plus baseline audit records, with full metadata expansion as follow-on work.
  * Rationale: Prioritize correctness and idempotent compensation first, then broaden reporting payloads.

## Implementation Paths Considered

### Selected: Option B Confirmation Deduction plus Approach D Cancellation Command

* Approach: Defer stock deduction until transition to `processing`, then apply explicit cancellation endpoint and compensating stock restoration through services.
* Rationale: Best balance of all-or-nothing correctness, implementation effort, and route clarity for this in-memory architecture.
* Evidence: .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 547-557)

### IP-01: Option A Eager Deduction on OrderDetail Creation

* Approach: Deduct stock at detail creation time with pre-validation.
* Trade-offs: Early stock correctness but strict draft-order behavior and heavier rollback complexity.
* Rejection rationale: Inferior fit for pending-order editing workflow and cancellation ergonomics.

### IP-02: Option C Reservation then Deduction

* Approach: Two-phase inventory model with reservation and conversion to physical deduction.
* Trade-offs: Strong anti-oversell behavior but highest model/state complexity in current codebase.
* Rejection rationale: Excessive implementation cost for first stock-management increment.

## Suggested Follow-On Work

* WI-01: Global request validation middleware — Add schema-driven validation across all API routes, not only stock paths (high)
  * Source: Research validation and HTTP gap findings
  * Dependency: Completion of current stock workflow implementation

* WI-02: Persistence-backed inventory transaction model — Replace in-memory snapshots with database transactions and durable ledger storage (high)
  * Source: Residual risk analysis for restart and multi-instance scenarios
  * Dependency: Data model stabilization after initial feature rollout

* WI-03: Delivery-driven fulfillment synchronization — Introduce automatic order state updates from delivery outcomes and partial fulfillment tracking (medium)
  * Source: Delivery/order relationship analysis and cancellation partial-delivery logic
  * Dependency: Completion of cancellation and compensation services

* WI-04: Centralized non-service exception envelope — Align uncaught route/runtime errors with structured stock workflow error payload shape in API middleware (medium)
  * Source: Implementation Phase 3, Step 3.2 suggested additional work
  * Dependency: Preserve existing API success payload compatibility

* WI-05: Frontend runtime-config script warning cleanup — Address Vite warning for non-module runtime config script loading strategy in frontend index HTML (low)
  * Source: Implementation Phase 4 final validation output
  * Dependency: None
