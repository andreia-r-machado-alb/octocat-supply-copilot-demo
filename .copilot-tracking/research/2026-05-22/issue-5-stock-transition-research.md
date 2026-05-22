<!-- markdownlint-disable-file -->

## Scope

Implement Issue #5 in fork andreia-r-machado-alb/octocat-supply-copilot-demo:

* pending -> processing: decrement product stock for all order details atomically.
* processing -> cancelled: restore stock for all order details.
* Any insufficient stock during confirmation: reject with 422 and no partial updates.
* Keep existing status transition behavior unchanged.
* Add Product.stockLevel in model and seed data.

## Inputs And Evidence

* MCP issue fetch:
  * Issue #5: decrement on confirmation, restore on cancellation, all-or-nothing, stockLevel field required.
  * Issue #4 context: status-transition enforcement is separate work and currently open; Issue #5 must not alter that behavior.
* Workspace evidence:
  * api/src/routes/order.ts currently replaces the full order object on PUT with no stock logic.
  * api/src/models/product.ts swagger mentions stockLevel but Product interface lacks stockLevel.
  * api/src/seedData.ts product objects omit stockLevel entirely.
  * api/src/routes/product.ts stores product state in module-scoped array copied from seed data.
  * api/src/routes/orderDetail.ts stores details in independent module-scoped array.
  * api/src/routes/branch.test.ts is the only current API route test.

## Problem Breakdown

1. Data model gap:
   * Product schema and runtime shape are inconsistent (docs mention stockLevel, type/data omit it).
2. Cross-route state gap:
   * Order updates happen in order route.
   * Product inventory exists in product route state.
   * Order details exist in order detail route state.
   * Current architecture uses independent in-memory arrays per route module.
3. Atomicity requirement:
   * Need pre-check before mutation to guarantee no partial decrements.

## Architectural Decision

Use shared in-memory state module to centralize mutable arrays for products, orders, and order details.

Rationale:

* Enables order route to evaluate and mutate inventory with authoritative product/order-detail data.
* Preserves app's current in-memory architecture and avoids persistence-layer scope creep.
* Supports atomic pre-check and then apply pattern for decrements.
* Minimizes public API changes.

## Implementation Strategy

1. Introduce shared state exports in api/src/state/dataStore.ts with reset helper.
2. Refactor order, product, and orderDetail routes to use shared arrays from dataStore.
3. Update Product interface and seed products to include stockLevel.
4. In PUT /api/orders/:id:
   * Load current order by id; preserve existing 404 behavior.
   * Detect oldStatus -> newStatus.
   * For pending -> processing:
     * Gather orderDetails for order.
     * Verify each referenced product exists and has enough stock.
     * On failure return 422 JSON error and do not mutate any product stock.
     * On success decrement stock for each product.
   * For processing -> cancelled:
     * Restore stock by adding ordered quantity per detail.
   * All other transitions do not change stock.
   * Keep order update semantics otherwise unchanged.
5. Add route-level tests for both stock decrement and restore behavior plus atomic rejection.

## Error And Response Behavior

* Continue returning 404 for unknown order id.
* Use 422 for insufficient stock with JSON body:
  * error: message
  * productId, requested, available for debugging.
* Do not introduce new status-transition validation logic (Issue #4 remains separate).

## Risks

* Shared mutable state can leak across tests.
  * Mitigation: expose resetDataStore() and call in tests.
* Existing PUT semantics overwrite full object.
  * Mitigation: preserve this behavior; only add stock side effects based on status delta.
* Order details with missing product references.
  * Mitigation: fail confirmation with 422 and no stock mutation.

## Validation Plan

* npm run build --workspace=api
* npm run test --workspace=api -- --run

## Success Criteria Mapping

* All-or-nothing decrement: pre-check before stock mutation.
* Restore on processing -> cancelled only.
* Product.stockLevel present in type and seed data.
* Existing status transition behavior remains unchanged (no new transition guard logic introduced).
