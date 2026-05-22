<!-- markdownlint-disable-file -->

## Related Plan

* .copilot-tracking/plans/2026-05-22/issue-5-stock-transition-plan.instructions.md

## Implementation Date

* 2026-05-22

## Summary

Implemented stock-level support and inventory side effects tied to order status transitions in API.

## Added

* api/src/state/dataStore.ts
* api/src/routes/order.test.ts
* .copilot-tracking/research/2026-05-22/issue-5-stock-transition-research.md
* .copilot-tracking/plans/2026-05-22/issue-5-stock-transition-plan.instructions.md
* .copilot-tracking/details/2026-05-22/issue-5-stock-transition-details.md
* .copilot-tracking/plans/logs/2026-05-22/issue-5-stock-transition-log.md

## Modified

* api/src/models/product.ts
* api/src/seedData.ts
* api/src/routes/order.ts
* api/src/routes/product.ts
* api/src/routes/orderDetail.ts

## Removed

* None

## Validation

* Build API task: passed
* npm run test --workspace=api -- --run: passed (2 files, 9 tests)

## Release Summary

Issue #5 behavior now works as requested:

* pending -> processing decrements stock with all-or-nothing pre-check.
* processing -> cancelled restores stock.
* insufficient stock yields 422 with no partial decrement.
* product model and seed data now include stockLevel.
