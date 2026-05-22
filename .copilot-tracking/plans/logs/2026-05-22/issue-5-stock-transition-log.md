<!-- markdownlint-disable-file -->

## Discrepancy Log

* No discrepancies yet.

## Implementation Paths Considered

1. Add logic only inside order route with duplicated seed arrays from other routes.
   * Rejected: route-local arrays are not shared, causing incorrect or stale stock updates.
2. Introduce dedicated service layer plus dependency injection across routes.
   * Rejected for scope: larger refactor than needed for Issue #5.
3. Introduce lightweight shared dataStore module.
   * Selected: minimal change enabling correct cross-route atomic inventory updates.

## Suggested Follow-On Work

* Issue #4 status transition enforcement can be added independently once Issue #5 lands.
* Add tests for order-detail modifications affecting already processing orders.
