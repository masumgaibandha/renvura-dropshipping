import { Chip } from "@heroui/react";

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
