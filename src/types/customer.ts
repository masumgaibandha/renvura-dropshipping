/**
 * Admin-facing customer projections (Phase 10). A "customer" here is a
 * Better Auth `user` document — there is no separate Customer model, see
 * `src/services/customers.ts`. Never includes password/session data; that
 * lives in Better Auth's `account`/`session` collections, which this app's
 * admin surface never queries.
 */

export interface AdminCustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  /** Sum of `pricing.total` across this customer's `delivered` orders only — see `getCustomerOrderStats`'s doc comment for why this is narrower than the dashboard's revenue definition. */
  totalDeliveredValue: number;
  lastOrderAt: string | null;
}

export interface AdminCustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalDeliveredValue: number;
}
