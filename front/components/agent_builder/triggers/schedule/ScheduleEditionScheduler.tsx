import type { TriggerViewsSheetFormValues } from "@app/components/agent_builder/triggers/triggerViewsSheetFormSchema";
import { describeScheduleConfig } from "@app/lib/utils/schedule_description";
import { getNextOccurrences } from "@app/lib/utils/schedule_next_occurrences";
import type { ScheduleConfig } from "@app/types/assistant/triggers";
import {
  ArrowRight,
  Button,
  ContentMessage,
  ContentMessageInline,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icon,
  InfoCircle,
  Input,
  Label,
  Tooltip,
} from "@dust-tt/sparkle";
import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";

const NEXT_OCCURRENCES_COUNT = 5;

type Frequency = "daily" | "weekly" | "monthly" | "interval";

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
  interval: "Every N days",
};

// Cron day-of-week convention: 0 = Sunday .. 6 = Saturday.
const WEEKDAYS: { label: string; value: number }[] = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTimezone(timezone: string): string {
  const parts = timezone.split("/");
  if (parts.length < 2) {
    return timezone;
  }
  const city = parts[parts.length - 1].replace(/_/g, " ");
  return `${city} (${timezone})`;
}

interface UiState {
  frequency: Frequency;
  hour: number;
  minute: number;
  weekdays: number[];
  intervalDays: number;
  dayOfMonth: number;
}

// Parses a simple cron ("m h * * dow" for daily/weekly, "m h dom * *" for monthly)
// back into the structured UI. Returns null for anything more complex (handled as a
// read-only custom expression).
function parseSimpleCron(cron: string): UiState | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }
  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] =
    parts;
  if (
    !/^\d{1,2}$/.test(minuteField) ||
    !/^\d{1,2}$/.test(hourField) ||
    monthField !== "*"
  ) {
    return null;
  }
  const base = {
    hour: Number(hourField),
    minute: Number(minuteField),
    weekdays: [] as number[],
    intervalDays: 1,
    dayOfMonth: 1,
  };
  // Monthly: a specific day of month, any weekday.
  if (
    dayOfWeekField === "*" &&
    /^([1-9]|[12]\d|3[01])$/.test(dayOfMonthField)
  ) {
    return {
      ...base,
      frequency: "monthly",
      dayOfMonth: Number(dayOfMonthField),
    };
  }
  if (dayOfMonthField !== "*") {
    return null;
  }
  if (dayOfWeekField === "*") {
    return { ...base, frequency: "daily" };
  }
  if (/^[0-6](,[0-6])*$/.test(dayOfWeekField)) {
    return {
      ...base,
      frequency: "weekly",
      weekdays: dayOfWeekField.split(",").map(Number),
      intervalDays: 7,
    };
  }
  return null;
}

function buildConfig(state: UiState, timezone: string): ScheduleConfig | null {
  const { frequency, hour, minute, weekdays, intervalDays, dayOfMonth } = state;
  if (frequency === "interval") {
    return {
      type: "interval",
      intervalDays: Math.max(1, intervalDays),
      dayOfWeek: null,
      hour,
      minute,
      timezone,
    };
  }
  if (frequency === "monthly") {
    return {
      type: "cron",
      cron: `${minute} ${hour} ${dayOfMonth} * *`,
      timezone,
    };
  }
  if (frequency === "weekly") {
    if (weekdays.length === 0) {
      return null;
    }
    const dow = [...weekdays].sort((a, b) => a - b).join(",");
    return { type: "cron", cron: `${minute} ${hour} * * ${dow}`, timezone };
  }
  return { type: "cron", cron: `${minute} ${hour} * * *`, timezone };
}

interface ScheduleEditionSchedulerProps {
  isEditor: boolean;
}

export function ScheduleEditionScheduler({
  isEditor,
}: ScheduleEditionSchedulerProps) {
  const { getValues, setValue, getFieldState, formState } =
    useFormContext<TriggerViewsSheetFormValues>();

  const timezone =
    getValues("schedule.timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Initialize the structured controls from whatever is already in the form
  // (editing an existing trigger), defaulting to "every day at 09:00".
  const [state, setState] = useState<UiState>(() => {
    const schedule = getValues("schedule");
    if (schedule?.scheduleType === "interval") {
      return {
        frequency: "interval",
        hour: schedule.hour ?? 9,
        minute: schedule.minute ?? 0,
        weekdays: [],
        intervalDays: schedule.intervalDays ?? 2,
        dayOfMonth: 1,
      };
    }
    const parsed = schedule?.cron ? parseSimpleCron(schedule.cron) : null;
    return (
      parsed ?? {
        frequency: "daily",
        hour: 9,
        minute: 0,
        weekdays: [],
        intervalDays: 2,
        dayOfMonth: 1,
      }
    );
  });

  // An existing config the structured controls cannot represent (non-simple cron,
  // or an "every N weeks on <day>" interval): shown read-only so we never silently
  // drop fields (e.g. dayOfWeek) by overwriting it on the first effect run. Computed
  // once from the initial form value via the lazy initializer.
  const [customCron, setCustomCron] = useState<string | null>(() => {
    const schedule = getValues("schedule");
    if (!schedule) {
      return null;
    }
    if (schedule.scheduleType === "interval") {
      return schedule.dayOfWeek !== null
        ? describeScheduleConfig({
            type: "interval",
            intervalDays: schedule.intervalDays,
            dayOfWeek: schedule.dayOfWeek,
            hour: schedule.hour,
            minute: schedule.minute,
            timezone: schedule.timezone,
          })
        : null;
    }
    if (schedule.cron) {
      return parseSimpleCron(schedule.cron) ? null : schedule.cron;
    }
    return null;
  });

  const config = useMemo(
    () => (customCron ? null : buildConfig(state, timezone)),
    [customCron, state, timezone]
  );

  // Keep the form in sync with the structured controls.
  useEffect(() => {
    if (customCron) {
      return;
    }
    if (!config) {
      // Weekly with no day selected: surface the "cron required" validation.
      setValue("schedule.scheduleType", "cron", { shouldDirty: true });
      setValue("schedule.cron", "", { shouldValidate: true });
      return;
    }
    setValue("schedule.timezone", config.timezone, { shouldDirty: true });
    setValue(
      "schedule.naturalLanguageDescription",
      describeScheduleConfig(config),
      { shouldDirty: true }
    );
    if (config.type === "interval") {
      setValue("schedule.scheduleType", "interval", { shouldDirty: true });
      setValue("schedule.intervalDays", config.intervalDays, {
        shouldDirty: true,
      });
      setValue("schedule.dayOfWeek", config.dayOfWeek, { shouldDirty: true });
      setValue("schedule.hour", config.hour, { shouldDirty: true });
      setValue("schedule.minute", config.minute, { shouldDirty: true });
    } else {
      setValue("schedule.scheduleType", "cron", { shouldDirty: true });
      setValue("schedule.cron", config.cron, { shouldValidate: true });
    }
  }, [config, customCron, setValue]);

  const { error: cronError } = getFieldState("schedule.cron", formState);
  const { error: timezoneError } = getFieldState(
    "schedule.timezone",
    formState
  );

  const nextOccurrences = useMemo(
    () => (config ? getNextOccurrences(config, NEXT_OCCURRENCES_COUNT) : []),
    [config]
  );

  const description = config ? describeScheduleConfig(config) : null;

  const updateTime = (value: string) => {
    const [h, m] = value.split(":");
    const hour = Number(h);
    const minute = Number(m);
    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return;
    }
    setState((s) => ({ ...s, hour, minute }));
  };

  const toggleWeekday = (day: number) => {
    setState((s) => ({
      ...s,
      weekdays: s.weekdays.includes(day)
        ? s.weekdays.filter((d) => d !== day)
        : [...s.weekdays, day],
    }));
  };

  if (customCron) {
    return (
      <div className="space-y-2">
        <Label>Scheduler</Label>
        <ContentMessage variant="info" size="lg">
          <div className="flex flex-col gap-2">
            <span>
              This schedule uses an advanced configuration the simple controls
              can't edit:{" "}
              <span className="font-mono font-semibold">{customCron}</span>.
            </span>
            <Button
              label="Switch to simple mode"
              size="sm"
              variant="outline"
              disabled={!isEditor}
              onClick={() => setCustomCron(null)}
            />
          </div>
        </ContentMessage>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Scheduler</Label>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>Frequency</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                label={FREQUENCY_LABELS[state.frequency]}
                size="sm"
                variant="outline"
                isSelect
                disabled={!isEditor}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((freq) => (
                <DropdownMenuItem
                  key={freq}
                  label={FREQUENCY_LABELS[freq]}
                  onClick={() => setState((s) => ({ ...s, frequency: freq }))}
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {state.frequency === "monthly" && (
          <div className="w-28 space-y-1">
            <Label htmlFor="schedule-dom">Day of month</Label>
            <Input
              id="schedule-dom"
              type="number"
              min={1}
              max={31}
              value={String(state.dayOfMonth)}
              disabled={!isEditor}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  dayOfMonth: Math.min(
                    31,
                    Math.max(1, Number(e.target.value) || 1)
                  ),
                }))
              }
            />
          </div>
        )}

        {state.frequency === "interval" && (
          <div className="w-28 space-y-1">
            <Label htmlFor="schedule-interval">Every (days)</Label>
            <Input
              id="schedule-interval"
              type="number"
              min={1}
              value={String(state.intervalDays)}
              disabled={!isEditor}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  intervalDays: Math.max(1, Number(e.target.value) || 1),
                }))
              }
            />
          </div>
        )}

        <div className="w-36 space-y-1">
          <Label htmlFor="schedule-time">Time</Label>
          <Input
            id="schedule-time"
            type="time"
            value={`${pad2(state.hour)}:${pad2(state.minute)}`}
            disabled={!isEditor}
            onChange={(e) => updateTime(e.target.value)}
          />
        </div>
      </div>

      {state.frequency === "weekly" && (
        <div className="space-y-1">
          <Label>Days</Label>
          <div className="flex flex-row flex-wrap gap-1">
            {WEEKDAYS.map((day) => (
              <Button
                key={day.value}
                label={day.label}
                size="sm"
                variant={
                  state.weekdays.includes(day.value) ? "primary" : "outline"
                }
                disabled={!isEditor}
                onClick={() => toggleWeekday(day.value)}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground dark:text-muted-foreground-night">
        Timezone: {formatTimezone(timezone)}
      </p>

      {description && (
        <div className="my-2">
          <ContentMessage variant="outline" size="lg">
            <div className="flex flex-row items-start gap-2 text-foreground dark:text-foreground-night">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 self-start" />
              <div className="flex flex-1 items-center justify-between">
                <p>{description}.</p>
                {nextOccurrences.length > 0 && (
                  <Tooltip
                    label={
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-semibold">
                          Next 5 occurrences
                        </span>
                        {nextOccurrences.map((date, index) => (
                          <span key={index}>
                            {date.toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ))}
                      </div>
                    }
                    trigger={
                      <Icon
                        visual={InfoCircle}
                        size="xs"
                        className="shrink-0 text-faint dark:text-faint-night"
                      />
                    }
                  />
                )}
              </div>
            </div>
          </ContentMessage>
        </div>
      )}

      {(cronError !== undefined || timezoneError !== undefined) && (
        <ContentMessageInline variant="warning">
          {cronError?.message ?? timezoneError?.message}
        </ContentMessageInline>
      )}
    </div>
  );
}
