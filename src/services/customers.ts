import { ObjectId } from "mongodb";

import { authDb } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { OrderModel } from "@/models/Order";
import type { AdminCustomerDetail, AdminCustomerListItem } from "@/types/customer";
import { getOrdersForCustomer, toOrderListItem } from "./orders";
import { getAddressesForUser } from "./addresses";

/**
 * Admin customer data-access layer. There is no `Customer` Mongoose model —
 * "customer" is a Better Auth `user` document, which lives in a collection
 * Better Auth owns via the native MongoDB driver (see `authDb` in
 * `src/lib/auth.ts`), not Mongoose. Every read here explicitly projects
 * only `{_id, name, email, phone, createdAt}` — never the full document —
 * so a password hash or provider token living elsewhere in that collection
 * (there shouldn't be one; Better Auth stores credentials in `account`) can
 * never leak through this path even by accident.
 *
 * **`_id` is a real BSON `ObjectId` here**, not a string — Better Auth's
 * mongodb adapter stores it that way and only exposes the string form as
 * `session.user.id` (which is what `Order.customerUserId` and every
 * `Address.userId` actually store). Every function below is careful to
 * convert `ObjectId` -> `.toString()` when producing an app-facing "user
 * id" and `ObjectId.isValid(...)`/`new ObjectId(...)` when going the other
 * way for a `_id` filter — mixing the two silently matches nothing (a
 * string is never `===` an `ObjectId` in a Mongo query), which is exactly
 * the bug this comment is here to prevent reintroducing.
 */

interface UserProjection {
  _id: ObjectId;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
}

const USER_PROJECTION = { _id: 1, name: 1, email: 1, phone: 1, createdAt: 1 } as const;

function userCollection() {
  return authDb.collection<UserProjection>("user");
}

/**
 * `pricing.total` summed only for this customer's `delivered` orders — a
 * narrower, more literal reading of "Total Delivered Order Value" than the
 * dashboard's `revenueToday`/`revenueThisMonth` (which also count
 * manually-verified `paid` bKash/Nagad/Rocket orders regardless of
 * delivery status). Both are intentionally conservative; they just answer
 * slightly different questions, so don't expect the numbers to match 1:1.
 */
async function getOrderStatsForUserIds(userIds: string[]): Promise<Map<string, { orderCount: number; totalDeliveredValue: number; lastOrderAt: string | null }>> {
  await connectToDatabase();
  if (userIds.length === 0) return new Map();

  const rows = await OrderModel.aggregate<{ _id: string; orderCount: number; totalDeliveredValue: number; lastOrderAt: Date }>([
    { $match: { customerUserId: { $in: userIds } } },
    {
      $group: {
        _id: "$customerUserId",
        orderCount: { $sum: 1 },
        totalDeliveredValue: { $sum: { $cond: [{ $eq: ["$orderStatus", "delivered"] }, "$pricing.total", 0] } },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id, { orderCount: row.orderCount, totalDeliveredValue: row.totalDeliveredValue, lastOrderAt: row.lastOrderAt.toISOString() }]));
}

export interface AdminCustomerListParams {
  page?: number;
  pageSize?: number;
  /** Matches name, email, or phone (case-insensitive). */
  search?: string;
}

export interface AdminCustomerListResult {
  customers: AdminCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listCustomersForAdmin(params: AdminCustomerListParams): Promise<AdminCustomerListResult> {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const page = Math.max(params.page ?? 1, 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  const collection = userCollection();
  const [docs, total] = await Promise.all([
    collection
      .find(filter, { projection: USER_PROJECTION })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  const stats = await getOrderStatsForUserIds(docs.map((doc) => doc._id.toString()));

  const customers: AdminCustomerListItem[] = docs.map((doc) => {
    const id = doc._id.toString();
    const stat = stats.get(id);
    return {
      id,
      name: doc.name,
      email: doc.email,
      phone: doc.phone ?? null,
      createdAt: doc.createdAt.toISOString(),
      orderCount: stat?.orderCount ?? 0,
      totalDeliveredValue: stat?.totalDeliveredValue ?? 0,
      lastOrderAt: stat?.lastOrderAt ?? null,
    };
  });

  return { customers, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function countCustomers(): Promise<number> {
  return userCollection().countDocuments();
}

export interface AdminCustomerDetailResult {
  customer: AdminCustomerDetail;
  addresses: Awaited<ReturnType<typeof getAddressesForUser>>;
  orders: ReturnType<typeof toOrderListItem>[];
}

/** `null` if no user with this id exists — indistinguishable, by design, from any other "not found" case elsewhere in this app. Also `null` for a structurally-invalid id (not a valid ObjectId hex string) rather than letting the driver throw. */
export async function getCustomerDetailForAdmin(userId: string): Promise<AdminCustomerDetailResult | null> {
  if (!ObjectId.isValid(userId)) return null;

  const doc = await userCollection().findOne({ _id: new ObjectId(userId) }, { projection: USER_PROJECTION });
  if (!doc) return null;

  const [addresses, orderRecords] = await Promise.all([getAddressesForUser(userId), getOrdersForCustomer(userId)]);
  const orders = orderRecords.map(toOrderListItem);
  const totalDeliveredValue = orderRecords.reduce((sum, order) => (order.orderStatus === "delivered" ? sum + order.pricing.total : sum), 0);

  return {
    customer: {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      phone: doc.phone ?? null,
      createdAt: doc.createdAt.toISOString(),
      orderCount: orders.length,
      totalDeliveredValue,
    },
    addresses,
    orders,
  };
}
