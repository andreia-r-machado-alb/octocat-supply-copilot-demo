<!-- markdownlint-disable-file -->
# Release Changes: Order Stock Management and Cancellation Workflow

**Related Plan**: .copilot-tracking/plans/2026-05-22/order-stock-management-plan.instructions.md
**Implementation Date**: 2026-05-22

## Summary

Implement deterministic stock deduction on order confirmation and compensating stock restoration on cancellation through service-layer orchestration.

## Changes

### Added

* api/src/state/dataStore.ts - Added shared mutable in-memory state with snapshot and reset helpers
* api/src/services/inventoryTransaction.ts - Added lock-plus-snapshot transaction helper for all-or-nothing inventory mutations
* api/src/services/types.ts - Added shared service result and error contract types for `422`, `404`, and `409` mapping
* api/src/services/orderAuditService.ts - Added append-only audit and inventory movement ledger helpers for stock workflows
* api/src/services/orderStatePolicy.ts - Added order cancellation policy guards and transition decisions
* api/src/services/stockCompensationService.ts - Added restorable quantity calculation and stock compensation helpers
* api/src/services/orderInventoryService.ts - Added atomic order confirmation and stock deduction orchestration
* api/src/services/orderCancellationService.ts - Added transactional cancellation orchestration with compensation and idempotent outcomes
* api/src/routes/order.test.ts - Added route-level regression tests for confirmation and cancellation stock workflows
* api/src/services/orderInventoryService.test.ts - Added service-level tests for atomic deduction and insufficiency behavior
* api/src/services/orderCancellationService.test.ts - Added cancellation service tests for compensation, idempotency, and guard outcomes

### Modified

* api/src/models/product.ts - Added `stockLevel` and optional inventory concurrency metadata fields
* api/src/seedData.ts - Added deterministic seeded `stockLevel` values for all products
* api/src/routes/order.ts - Switched route state source from local arrays to shared data store access
* api/src/routes/product.ts - Switched inventory-mutating route state source from local arrays to shared data store access
* api/src/models/order.ts - Added optional order version metadata field to support optimistic domain checks
* api/src/routes/order.ts - Delegated processing confirmation and cancellation endpoints to domain services with structured `422`/`409` error envelopes
* api/src/routes/orderDetail.ts - Switched order-detail route state access to shared data store for deferred stock-deduction compatibility

### Removed

## Additional or Deviating Changes

* Final validation completed with full workspace build and API test pass; no additional code fix was required in Phase 4.
* Frontend build emitted a non-blocking Vite warning related to `/runtime-config.js` script module loading.

## Release Summary

Phases completed: 4 of 4. All implementation and validation steps are marked complete.

Files affected: 16 total
* Added: 11
* Modified: 5
* Removed: 0

Implemented capabilities:
* Introduced shared mutable data-store and deterministic reset/snapshot utilities for in-memory state safety.
* Added lock-plus-snapshot inventory transaction utilities with shared typed service result contracts.
* Added domain services for atomic order confirmation stock deduction and cancellation compensation with policy and audit support.
* Refactored order routing to delegate stock-affecting transitions to service orchestration, including dedicated cancellation command endpoint and structured `422`/`409` error mapping.
* Added route and service regression tests for confirmation success/failure, cancellation compensation, idempotency, and state guards.

Validation outcomes:
* `npm run build --workspace=api` passed during phase validations.
* `npm run test --workspace=api -- --run` passed during phase validations.
* Final `npm run build` passed.
* Final `npm run test --workspace=api -- --run` passed (4 test files, 16 tests).
