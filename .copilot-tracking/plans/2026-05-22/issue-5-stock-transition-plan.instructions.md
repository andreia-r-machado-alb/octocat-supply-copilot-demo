<!-- markdownlint-disable-file -->

## User Requests

* Fetch Issue #5 in fork and gather relevant source via MCP.
* Research the problem thoroughly.
* Produce a detailed implementation plan.
* Implement the fix.

## Overview

Implement inventory side effects for order status transitions in API while preserving existing route behavior:

* pending -> processing decrements stock atomically.
* processing -> cancelled restores stock.
* Other transitions do not affect stock.
* Product model/seed include stockLevel.

## Context Summary

* Repo instructions consulted:
  * .github/copilot-instructions.md
  * markdown and prompt authoring instructions for tracking artifacts
* Research reference:
  * .copilot-tracking/research/2026-05-22/issue-5-stock-transition-research.md
* Relevant code areas:
  * api/src/routes/order.ts
  * api/src/routes/product.ts
  * api/src/routes/orderDetail.ts
  * api/src/models/product.ts
  * api/src/seedData.ts

## Implementation Checklist

### Phase 1: Shared State Preparation <!-- parallelizable: false -->

- [x] Add centralized in-memory data store for orders, products, and orderDetails with reset helper.
- [x] Refactor affected routes to consume centralized arrays.

### Phase 2: Domain Model Update <!-- parallelizable: true -->

- [x] Add stockLevel to Product TypeScript interface.
- [x] Add stockLevel values to seed products.

### Phase 3: Order Inventory Logic <!-- parallelizable: false -->

- [x] Update PUT /api/orders/:id to compute status transition from stored order to request status.
- [x] Add atomic pre-check for pending -> processing.
- [x] Add stock restoration for processing -> cancelled.
- [x] Return 422 with JSON error for insufficient stock and missing products during confirmation.

### Phase 4: Test Coverage <!-- parallelizable: false -->

- [x] Add route tests covering:
  - successful pending -> processing decrement
  - insufficient stock rejection with no partial stock mutation
  - processing -> cancelled restoration

### Phase 5: Validation And Review <!-- parallelizable: false -->

- [x] Run API build.
- [x] Run API tests.
- [x] Update changes and review logs.

## Dependencies

* Existing dependencies in api workspace (express, vitest, supertest).
* No new npm packages required.

## Planning Log Reference

* .copilot-tracking/plans/logs/2026-05-22/issue-5-stock-transition-log.md

## Success Criteria

* Order confirmation decrements stock only when all items have sufficient stock.
* Failed confirmation performs zero stock mutations.
* Cancellation from processing restores stock.
* Product model and seed data contain stockLevel.
* API build and tests pass.
