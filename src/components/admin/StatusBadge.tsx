import { Chip } from "@heroui/react";

import { PATHAO_PRODUCT_READINESS_LABELS, type PathaoProductReadiness } from "@/lib/courier/readiness";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus, type PaymentStatus } from "@/types/order";

const ORDER_STATUS_COLOR: Record<OrderStatus, "default" | "accent" | "success" | "warning" | "danger"> = {
  pending: "default",
  confirmed: "accent",
  processing: "accent",
  supplier_submitted: "accent",
  shipped: "warning",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
};

const PAYMENT_STATUS_COLOR: Record<PaymentStatus, "default" | "accent" | "success" | "warning" | "danger"> = {
  unpaid: "default",
  cod_pending: "default",
  pending_verification: "warning",
  paid: "success",
  failed: "danger",
  refunded: "danger",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Chip color={ORDER_STATUS_COLOR[status]} variant="soft" size="sm" className={className}>
      {ORDER_STATUS_LABELS[status]}
    </Chip>
  );
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Chip color={PAYMENT_STATUS_COLOR[status]} variant="soft" size="sm" className={className}>
      {PAYMENT_STATUS_LABELS[status]}
    </Chip>
  );
}

const PATHAO_READINESS_COLOR: Record<PathaoProductReadiness, "default" | "success" | "warning" | "danger"> = {
  ready: "success",
  missing_weight: "warning",
  invalid_weight: "danger",
};

/** Phase 15 — used on `/admin/products`, the product edit form, and anywhere else a per-product Pathao shipping readiness needs a consistent visual. */
export function PathaoReadinessBadge({ readiness, className }: { readiness: PathaoProductReadiness; className?: string }) {
  return (
    <Chip color={PATHAO_READINESS_COLOR[readiness]} variant="soft" size="sm" className={className}>
      {PATHAO_PRODUCT_READINESS_LABELS[readiness]}
    </Chip>
  );
}
