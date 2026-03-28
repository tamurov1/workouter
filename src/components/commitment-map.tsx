import { getLocalDeadlineDay } from "@/lib/deadline";

type CommitmentStatus = "none" | "assigned" | "done" | "missed";

type CommitmentItem = {
  deadline: Date;
  isDone: boolean;
};

type CommitmentMapProps = {
  items: CommitmentItem[];
  year?: number;
};

type DayCell = {
  key: string;
  status: CommitmentStatus;
  isCurrentMonth: boolean;
  label: string;
};

type MonthBlock = {
  name: string;
  weeks: DayCell[][];
};

type YearWeek = {
  key: string;
  days: DayCell[];
  startsMonth: boolean;
};

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildStatusMap(items: CommitmentItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const statusMap = new Map<string, CommitmentStatus>();

  for (const item of items) {
    const deadline = getLocalDeadlineDay(item.deadline);
    const key = toDateKey(deadline);
    const nextStatus: CommitmentStatus = item.isDone ? "done" : deadline < today ? "missed" : "assigned";
    const currentStatus = statusMap.get(key);

    if (currentStatus === "missed" || nextStatus === currentStatus) {
      continue;
    }

    if (nextStatus === "missed") {
      statusMap.set(key, nextStatus);
      continue;
    }

    if (nextStatus === "done" || !currentStatus) {
      statusMap.set(key, nextStatus);
    }
  }

  return statusMap;
}

function buildMonthBlocks(year: number, statusMap: Map<string, CommitmentStatus>) {
  const months: MonthBlock[] = [];

  for (let month = 0; month < 12; month += 1) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const firstGridDay = new Date(monthStart);
    firstGridDay.setDate(monthStart.getDate() - monthStart.getDay());

    const lastGridDay = new Date(monthEnd);
    lastGridDay.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

    const weeks: DayCell[][] = [];
    const cursor = new Date(firstGridDay);

    while (cursor <= lastGridDay) {
      const week: DayCell[] = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const day = new Date(cursor);
        const key = toDateKey(day);
        week.push({
          key,
          status: statusMap.get(key) ?? "none",
          isCurrentMonth: day.getMonth() === month,
          label: `${day.toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
          })}: ${statusMap.get(key) ?? "none"}`,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      weeks.push(week);
    }

    months.push({
      name: monthStart.toLocaleString("en-CA", { month: "short" }),
      weeks,
    });
  }

  return months;
}

function buildYearWeeks(year: number, statusMap: Map<string, CommitmentStatus>) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const firstGridDay = new Date(start);
  firstGridDay.setDate(start.getDate() - start.getDay());

  const lastGridDay = new Date(end);
  lastGridDay.setDate(end.getDate() + (6 - end.getDay()));

  const weeks: YearWeek[] = [];
  const cursor = new Date(firstGridDay);

  while (cursor <= lastGridDay) {
    const days: DayCell[] = [];
    let startsMonth = false;

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = new Date(cursor);
      const key = toDateKey(day);

      if (day.getFullYear() === year && day.getDate() === 1) {
        startsMonth = true;
      }

      days.push({
        key,
        status: statusMap.get(key) ?? "none",
        isCurrentMonth: day.getFullYear() === year,
        label: `${day.toLocaleDateString("en-CA", {
          month: "short",
          day: "numeric",
        })}: ${statusMap.get(key) ?? "none"}`,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({
      key: days[0].key,
      days,
      startsMonth,
    });
  }

  return weeks;
}

function buildDesktopMonthLabels(weeks: YearWeek[], year: number) {
  const labels: Array<{ name: string; column: number }> = [];

  for (let month = 0; month < 12; month += 1) {
    const target = new Date(year, month, 1);
    const column = weeks.findIndex((week) =>
      week.days.some(
        (day) =>
          day.key === toDateKey(target),
      ),
    );

    labels.push({
      name: target.toLocaleString("en-CA", { month: "short" }),
      column: column >= 0 ? column + 1 : 1,
    });
  }

  return labels;
}

export function CommitmentMap({ items, year = new Date().getFullYear() }: CommitmentMapProps) {
  const statusMap = buildStatusMap(items);
  const months = buildMonthBlocks(year, statusMap);
  const yearWeeks = buildYearWeeks(year, statusMap);
  const monthLabels = buildDesktopMonthLabels(yearWeeks, year);

  return (
    <section className="panel workout-panel">
      <div className="commitment-desktop-map">
        <div
          className="commitment-desktop-months"
          aria-hidden="true"
          style={{ gridTemplateColumns: `repeat(${yearWeeks.length}, 9px)` }}
        >
          {monthLabels.map((month) => (
            <span key={month.name} style={{ gridColumn: `${month.column} / span 4` }}>
              {month.name}
            </span>
          ))}
        </div>

        <div className="commitment-desktop-grid" role="img" aria-label={`Workout map for ${year}`}>
          {yearWeeks.map((week) => (
            <div className={`commitment-week ${week.startsMonth ? "commitment-week-month-start" : ""}`.trim()} key={week.key}>
              {week.days.map((day) => (
                <span
                  className={`commitment-dot commitment-${day.status} ${day.isCurrentMonth ? "" : "commitment-outside"}`.trim()}
                  key={day.key}
                  title={day.label}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="commitment-month-grid" aria-label={`Workout map for ${year}`}>
        {months.map((month) => (
          <article className="commitment-month-card" key={month.name}>
            <p className="commitment-month-name">{month.name}</p>

            <div
              className="commitment-grid"
              role="img"
              aria-label={`${month.name} workout status`}
              style={{ gridTemplateColumns: `repeat(${month.weeks.length}, minmax(0, 1fr))` }}
            >
              {month.weeks.map((week, weekIndex) => (
                <div className="commitment-week" key={`${month.name}-${weekIndex + 1}`}>
                  {week.map((day) => (
                    <span
                      className={`commitment-dot commitment-${day.status} ${day.isCurrentMonth ? "" : "commitment-outside"}`.trim()}
                      key={day.key}
                      title={day.label}
                    />
                  ))}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
