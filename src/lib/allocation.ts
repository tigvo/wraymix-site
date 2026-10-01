export type WorkDay = {
  date: string;
  capacity: number;
  used: number;
};

export type AllocationPlan = {
  date: string;
  points: number;
};

export function buildAllocationPlan(
  days: WorkDay[],
  requiredPoints: number,
): AllocationPlan[] | null {
  let remaining = requiredPoints;

  const plan: AllocationPlan[] = [];

  // 納品日に近い日から使う
  const sortedDays = [...days].sort((a, b) => b.date.localeCompare(a.date));

  for (const day of sortedDays) {
    const free = Math.max(day.capacity - day.used, 0);

    if (free === 0) {
      continue;
    }

    const points = Math.min(free, remaining);

    plan.push({
      date: day.date,
      points,
    });

    remaining -= points;

    if (remaining === 0) {
      return plan;
    }
  }

  // 必要量を確保できなかった
  return null;
}

export function shiftDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}
