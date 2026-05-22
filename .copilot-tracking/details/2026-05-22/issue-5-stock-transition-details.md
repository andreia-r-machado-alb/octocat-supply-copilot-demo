<!-- markdownlint-disable-file -->

## Context References

* Plan: .copilot-tracking/plans/2026-05-22/issue-5-stock-transition-plan.instructions.md
* Research: .copilot-tracking/research/2026-05-22/issue-5-stock-transition-research.md

## Phase Details

### Phase 1: Shared State Preparation

1. Create api/src/state/dataStore.ts
2. Export mutable arrays initialized from seed data:
   * orders
   * products
   * orderDetails
3. Export resetDataStore() for tests.
4. Update order/product/orderDetail routes to import arrays from dataStore.

Success criteria:

* Route modules share the same mutable arrays.
* Existing route behavior remains functionally identical before stock logic changes.

### Phase 2: Domain Model Update

1. Add required stockLevel: number in Product interface.
2. Add stockLevel values to each product in seedData.

Success criteria:

* TypeScript compile uses stockLevel consistently.
* Seed products provide stock quantities.

### Phase 3: Order Inventory Logic

1. In PUT /api/orders/:id locate existing order by id.
2. Derive previous and next status.
3. For pending -> processing:
   * Gather all orderDetails for order.
   * For each detail, find product by productId.
   * Validate availability before mutation.
   * If any invalid, return 422 JSON and stop.
   * If valid, decrement stock for each detail.
4. For processing -> cancelled:
   * Add quantities back to product stock levels.
5. Preserve existing update path and response structure.

Success criteria:

* Transition-triggered stock side effects are correct.
* No partial decrement occurs on failure.

### Phase 4: Test Coverage

1. Add api/src/routes/order.test.ts using supertest against app.
2. Reset shared store before each test.
3. Cover decrement, reject-no-partial, restore scenarios.

Success criteria:

* Tests fail without feature and pass with feature.
* Tests do not depend on execution order.

### Phase 5: Validation

1. Build API workspace.
2. Run API tests.
3. Resolve any compile/test regressions.

Success criteria:

* Validation commands pass.
