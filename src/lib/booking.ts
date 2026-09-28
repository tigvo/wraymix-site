export type ServiceType = "short" | "full";

export type AvailabilityStatus = "available" | "few" | "full";

export function getBookingCost(service: ServiceType, singers: number): number {
  if (service === "short") {
    return 3;
  }

  if (singers <= 1) return 10;
  if (singers === 2) return 17;
  if (singers === 3) return 23;

  return 23 + (singers - 3) * 6;
}

export function canAcceptBooking(
  capacity: number,
  used: number,
  required: number,
): boolean {
  const remaining = capacity - used;

  return remaining >= required;
}

export function getAvailabilityStatus(
  capacity: number,
  used: number,
  required: number,
): AvailabilityStatus {
  const remaining = capacity - used;

  if (remaining < required) {
    return "full";
  }

  // 今回の依頼は入るけど、入れたら残りが少ない
  if (remaining - required < 5) {
    return "few";
  }

  return "available";
}

export function getAvailabilityLabel(status: AvailabilityStatus): string {
  switch (status) {
    case "available":
      return "○ 予約可能";

    case "few":
      return "△ 残りわずか";

    case "full":
      return "× 受付終了";
  }
}
