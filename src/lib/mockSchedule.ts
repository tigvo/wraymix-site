export type ScheduleDay = {
  date: string;
  capacity: number;
  used: number;
};

export const schedule: ScheduleDay[] = [
  {
    date: "2026-10-01",
    capacity: 20,
    used: 10,
  },
  {
    date: "2026-10-02",
    capacity: 10,
    used: 3,
  },
  {
    date: "2026-10-03",
    capacity: 10,
    used: 10,
  },
  {
    date: "2026-10-04",
    capacity: 20,
    used: 0,
  },
  {
    date: "2026-10-05",
    capacity: 10,
    used: 7,
  },
  {
    date: "2026-10-06",
    capacity: 20,
    used: 3,
  },
  {
    date: "2026-10-07",
    capacity: 0,
    used: 0,
  },
];
