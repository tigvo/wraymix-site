export type ServiceType = "full" | "one_chorus" | "short";

export function getServiceLabel(serviceType: string) {
  switch (serviceType) {
    case "full":
      return "フルコーラス";

    case "one_chorus":
      return "ワンコーラス";

    case "short":
      return "short";

    default:
      return serviceType;
  }
}

export function getBasePrice(serviceType: ServiceType) {
  switch (serviceType) {
    case "full":
      return 6500;

    case "one_chorus":
      return 4500;

    case "short":
      return 2500;
  }
}

function getFullCost(singerCount: number) {
  const singers = Math.max(1, Math.floor(singerCount));

  if (singers === 1) {
    return 10;
  }

  if (singers === 2) {
    return 17;
  }

  if (singers === 3) {
    return 23;
  }

  return 23 + (singers - 3) * 6;
}

export function getBookingCost(serviceType: ServiceType, singerCount: number) {
  if (serviceType === "short") {
    return 3;
  }

  if (serviceType === "one_chorus") {
    return Math.ceil(getFullCost(singerCount) * 0.6);
  }

  return getFullCost(singerCount);
}

export function bookingConsumesCapacity(status: string) {
  return status === "pending_review" || status === "reserved";
}
