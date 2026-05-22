<!-- markdownlint-disable-file -->
# Implementation Details: Order Stock Management and Cancellation Workflow

## Context Reference

Sources: .copilot-tracking/research/2026-05-22/order-stock-management-research.md, .github/copilot-instructions.md

## Implementation Phase 1: Data Models and Shared State Foundation

<!-- parallelizable: false -->

### Step 1.1: Normalize inventory model fields and API contract

Add and align product inventory fields so TypeScript model definitions and OpenAPI documentation are consistent for stock behavior.

Files:
* api/src/models/product.ts - Add required `stockLevel` and optional optimistic concurrency field for order-level conflict checks
* api/src/seedData.ts - Ensure all seeded products include deterministic stock values for testability

Discrepancy references:
* Addresses DR-01 in .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Success criteria:
* Product interface includes inventory fields used by stock workflows
* Seed data satisfies updated interface with no fallback `undefined` stock behavior

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 111-167) - Product model mismatch findings
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 431-455) - Critical stock field gap

Dependencies:
* None

### Step 1.2: Centralize mutable in-memory state behind shared store APIs

Introduce a shared state module for orders, order details, and products to support transaction-like update workflows and to avoid route-local mutation bypass.

Files:
* api/src/state/dataStore.ts - Define canonical mutable arrays, snapshot helpers, and reset helper for tests
* api/src/routes/order.ts - Replace direct route-local array ownership with shared store access
* api/src/routes/product.ts - Replace direct route-local array ownership with shared store access when inventory is mutated

Discrepancy references:
* Addresses DR-02 in .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Success criteria:
* Inventory-affecting routes use shared state APIs only
* Tests can reset global state deterministically through one helper

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 327-356) - Existing route-local in-memory data pattern
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 563-569) - Shared state recommendation

Dependencies:
* Step 1.1 completion

### Step 1.3: Add transaction-like lock and snapshot commit utility

Create utility wrappers to provide all-or-nothing write behavior for inventory operations in a single process.

Files:
* api/src/services/inventoryTransaction.ts - Implement lock queue, snapshot clone, validation-on-snapshot, and commit swap primitives
* api/src/services/types.ts - Define shared service result and error contract types for `422`, `404`, `409`

Discrepancy references:
* Addresses DR-03 in .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Success criteria:
* Concurrent inventory mutations are serialized
* Failed validation leaves persisted in-memory state unchanged

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 519-557) - Option B transactional pseudocode
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 563-569) - Unit-of-work pattern guidance

Dependencies:
* Step 1.2 completion

### Step 1.4: Validate phase changes

Run lint and build commands for files modified in this phase.

Validation commands:
* npm run build --workspace=api - TypeScript compile validation for model/store/service foundation

## Implementation Phase 2: Inventory Confirmation and Cancellation Services

<!-- parallelizable: false -->

### Step 2.1: Implement order confirmation stock deduction service (Option B)

Implement deferred stock deduction that executes when order transitions from `pending` to `processing`, with full pre-validation and `422` response on insufficiency.

Files:
* api/src/services/orderInventoryService.ts - `confirmOrderAndDeductStock(orderId)` domain logic with ledger write
* api/src/models/order.ts - Add optional order version metadata if needed for optimistic conflict checks

Discrepancy references:
* Addresses DD-01 in .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Success criteria:
* Confirmation rejects insufficient stock with structured `422`
* Successful confirmation updates order status and stock atomically

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 499-543) - Option B design and failure behavior
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 547-557) - Recommendation rationale

Dependencies:
* Implementation Phase 1 completion

### Step 2.2: Implement cancellation compensation service (Approach D)

Implement dedicated cancellation transaction that restores only restorable quantity and records compensating stock events.

Files:
* api/src/services/orderCancellationService.ts - `cancelOrderTransactional(command)` orchestration
* api/src/services/orderStatePolicy.ts - `canCancel(order, deliveredSummary)` transition guard
* api/src/services/stockCompensationService.ts - Restorable quantity calculation and stock updates
* api/src/services/orderAuditService.ts - Append-only cancellation and inventory movement entries

Discrepancy references:
* Addresses DD-02 in .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Success criteria:
* Cancellation supports idempotency and status guard outcomes (`404`, `409`, success)
* Processing orders are restocked using compensating entries

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 623-704) - Cancellation alternatives and selected approach
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 744-760) - Recommended service decomposition

Dependencies:
* Step 2.1 completion

### Step 2.3: Validate phase changes

Run build and targeted tests for confirmation and cancellation domain behavior.

Validation commands:
* npm run build --workspace=api - Compile service and model changes
* npm run test --workspace=api -- --run - Validate unit/integration behavior for services and routes

## Implementation Phase 3: Route Integration and Error Contract Standardization

<!-- parallelizable: false -->

### Step 3.1: Refactor order routes to use service-layer orchestration

Keep route handlers focused on HTTP mapping; delegate inventory and cancellation logic to dedicated services.

Files:
* api/src/routes/order.ts - Wire status transition flow to confirmation service and add `POST /:id/cancel`
* api/src/routes/orderDetail.ts - Ensure route behavior is compatible with deferred stock deduction model

Discrepancy references:
* Addresses DR-04 in .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Success criteria:
* Generic PUT no longer bypasses status policy for stock-affecting transitions
* Dedicated cancellation endpoint exists and returns structured outcomes

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 179-230) - Current route limitations
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 727-742) - Decision flow for cancellation behavior

Dependencies:
* Implementation Phase 2 completion

### Step 3.2: Standardize validation and error payloads for stock workflows

Introduce consistent API error envelopes for validation and state conflict paths while preserving existing successful response structure.

Files:
* api/src/routes/order.ts - Map service result discriminators to `422` and `409`
* api/src/index.ts - Add or update shared error middleware registration if needed

Discrepancy references:
* Addresses DR-05 in .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Success criteria:
* Insufficient stock returns `422` with product-level deficit detail
* Invalid cancellation transition returns `409` with stable error code

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 458-495) - Missing status codes and validation infrastructure
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 705-726) - Error scenario strategy

Dependencies:
* Step 3.1 completion

### Step 3.3: Implement inventory and cancellation regression tests

Add focused tests that cover successful confirmation, insufficient stock failure, concurrent confirmation conflict behavior, and cancellation restock compensation.

Files:
* api/src/routes/order.test.ts - Route-level behavior tests for confirm and cancel endpoints
* api/src/services/orderInventoryService.test.ts - Service-level atomic deduction and insufficiency scenarios
* api/src/services/orderCancellationService.test.ts - Compensation, idempotency, and transition guard scenarios

Discrepancy references:
* Addresses the research implementation-sequence requirement for explicit stock workflow tests

Success criteria:
* New tests fail before implementation and pass after implementation for all four core inventory scenarios
* Test setup uses shared data-store reset helper to avoid cross-test contamination

Context references:
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 571-579) - Implementation sequence includes required stock workflow tests
* .copilot-tracking/research/2026-05-22/order-stock-management-research.md (Lines 547-557) - Option B behavior expectations

Dependencies:
* Step 3.2 completion

### Step 3.4: Validate phase changes

Run compile and API test suite after route integration.

Validation commands:
* npm run build --workspace=api - Compile route integration and middleware changes
* npm run test --workspace=api -- --run - Validate route behavior and regression coverage

## Implementation Phase 4: Validation

<!-- parallelizable: false -->

### Step 4.1: Run full project validation

Execute all relevant validation commands after all implementation phases complete.

Validation commands:
* npm run build
* npm run test --workspace=api -- --run

### Step 4.2: Fix minor validation issues

Iterate on lint errors, build warnings, and targeted test failures that are isolated and straightforward.

### Step 4.3: Report blocking issues

For failures requiring large refactors or architecture changes, document blockers and prepare follow-on planning updates rather than expanding scope inline.

## Dependencies

* Node.js and npm workspace tooling
* Existing Vitest configuration under api/vitest.config.ts

## Success Criteria

* All stock-affecting order transitions execute all-or-nothing with deterministic outcomes
* Cancellation restores restorable stock with auditable compensating events
* API build and API tests pass for modified scope
