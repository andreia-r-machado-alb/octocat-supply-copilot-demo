---
applyTo: '.copilot-tracking/changes/2026-05-22/order-stock-management-changes.md'
---
<!-- markdownlint-disable-file -->
# Implementation Plan: Order Stock Management and Cancellation Workflow

## Overview

Implement deterministic, all-or-nothing stock deduction on order confirmation and compensating stock restoration on cancellation through a service-first architecture.

## Objectives

### User Requirements

* Create a task plan using the provided research file as the planning foundation — Source: user request with `#file:order-stock-management-research.md`
* Summarize planning outcomes including implementation files and deferred scope items — Source: task-plan prompt requirement 3

### Derived Objectives

* Enforce inventory updates only through transaction-like service boundaries to prevent route-level partial mutations — Derived from: research findings on route-local mutable arrays and missing transaction guarantees
* Introduce explicit cancellation command handling with stock compensation and state guards — Derived from: research recommendation favoring Approach D cancellation semantics
* Standardize API error contracts for stock and state validation failures (`422`, `409`) — Derived from: documented HTTP gap analysis

## Context Summary

### Project Files

* api/src/models/product.ts - Inventory contract currently mismatched with documented `stockLevel`
* api/src/routes/order.ts - Current status transitions and cancellation handling are insufficient for stock safety
* api/src/routes/orderDetail.ts - Order line creation lifecycle influences stock confirmation behavior
* api/src/seedData.ts - Seeded inventory values must support deterministic stock tests
* api/src/services/ - Target location for new orchestration and policy services

### References

* .copilot-tracking/research/2026-05-22/order-stock-management-research.md - Primary architecture and recommendation source
* .github/copilot-instructions.md - Build and API test validation requirements

### Standards References

* /home/andreia-r-machado/.vscode-server/extensions/ise-hve-essentials.hve-core-all-3.2.2/.github/instructions/shared/hve-core-location.instructions.md — Fallback location guidance for instruction lookup

## Implementation Checklist

### [x] Implementation Phase 1: Data and Transaction Foundation

<!-- parallelizable: false -->

* [x] Step 1.1: Align product inventory model with API contract
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 12-32)
* [x] Step 1.2: Introduce shared data store for mutable API state
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 34-55)
* [x] Step 1.3: Implement lock-plus-snapshot transaction helper
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 57-77)
* [x] Step 1.4: Validate phase changes
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 79-84)

### [x] Implementation Phase 2: Inventory and Cancellation Domain Services

<!-- parallelizable: false -->

* [x] Step 2.1: Implement confirm-and-deduct service (Option B)
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 90-110)
* [x] Step 2.2: Implement cancellation compensation service suite (Approach D)
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 112-134)
* [x] Step 2.3: Validate phase changes
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 136-142)

### [x] Implementation Phase 3: Route Integration and Error Contracting

<!-- parallelizable: false -->

* [x] Step 3.1: Route orchestration refactor for service delegation
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 148-168)
* [x] Step 3.2: Standardize `422` and `409` error payloads
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 170-190)
* [x] Step 3.3: Implement inventory and cancellation regression tests
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 192-214)
* [x] Step 3.4: Validate phase changes
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 216-222)

### [x] Implementation Phase 4: Final Validation

<!-- parallelizable: false -->

* [x] Step 4.1: Run full project validation
  * Execute all lint and build commands
  * Run test suites covering modified code
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 227-233)
* [x] Step 4.2: Fix minor validation issues
  * Apply straightforward compile/test fixes discovered during final validation
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 235-237)
* [x] Step 4.3: Report blocking issues
  * Document blockers requiring additional research or plan expansion
  * Details: .copilot-tracking/details/2026-05-22/order-stock-management-details.md (Lines 239-241)

## Planning Log

See .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md for discrepancy tracking, implementation paths considered, and suggested follow-on work.

## Outcomes Summary

Created planning artifacts:
* .copilot-tracking/plans/2026-05-22/order-stock-management-plan.instructions.md
* .copilot-tracking/details/2026-05-22/order-stock-management-details.md
* .copilot-tracking/plans/logs/2026-05-22/order-stock-management-log.md

Deferred scope for follow-on planning:
* WI-01: Global request validation middleware
* WI-02: Persistence-backed inventory transaction model
* WI-03: Delivery-driven fulfillment synchronization

## Dependencies

* Node.js and npm workspace scripts
* Existing API workspace build and Vitest test commands

## Success Criteria

* Confirmation to `processing` enforces all-or-nothing stock deduction with deterministic `422` failures for insufficiency — Traces to: research Option B recommendation
* Cancellation uses explicit command semantics and compensating stock updates with transition guards — Traces to: research Approach D recommendation
* Implementation passes `npm run build` and `npm run test --workspace=api -- --run` for modified scope — Traces to: repository build/test conventions
