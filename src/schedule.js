const MIN_POST_GAP_HOURS = 6;
const MINUTE_MS = 60 * 1000;

const DEFAULT_SLOTS = [
  {
    key: 'noon',
    label: 'weekday_noon',
    startHour: 11,
    startMinute: 45,
    endHour: 12,
    endMinute: 15
  },
  {
    key: 'evening',
    label: 'weekday_evening',
    startHour: 19,
    startMinute: 30,
    endHour: 20,
    endMinute: 30
  }
];

const SATURDAY_SLOTS = [
  {
    key: 'morning',
    label: 'saturday_morning',
    startHour: 9,
    startMinute: 45,
    endHour: 10,
    endMinute: 15
  },
  {
    key: 'evening',
    label: 'saturday_evening',
    startHour: 19,
    startMinute: 45,
    endHour: 20,
    endMinute: 15
  }
];

const SUNDAY_SLOTS = [
  {
    key: 'morning',
    label: 'sunday_morning',
    startHour: 8,
    startMinute: 45,
    endHour: 9,
    endMinute: 15
  },
  {
    key: 'evening',
    label: 'sunday_evening',
    startHour: 19,
    startMinute: 45,
    endHour: 20,
    endMinute: 15
  }
];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDateAtTime(baseDate, hour, minute) {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hour,
    minute,
    0,
    0
  );
}

function formatDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function hashString(input) {
  let hash = 0;

  for (const character of input) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function pickStableMinuteOffset(seed, slotDurationMinutes) {
  if (slotDurationMinutes <= 0) {
    return 0;
  }

  return hashString(seed) % (slotDurationMinutes + 1);
}

function getSlotTemplates(dayOfWeek) {
  if (dayOfWeek === 6) {
    return SATURDAY_SLOTS;
  }

  if (dayOfWeek === 0) {
    return SUNDAY_SLOTS;
  }

  return DEFAULT_SLOTS;
}

export function getScheduleSlots(now = new Date()) {
  const baseDate = startOfDay(now);
  const dateKey = formatDateKey(baseDate);

  return getSlotTemplates(now.getDay()).map((slot) => {
    const windowStart = buildDateAtTime(baseDate, slot.startHour, slot.startMinute);
    const windowEnd = buildDateAtTime(baseDate, slot.endHour, slot.endMinute);
    const durationMinutes = Math.round((windowEnd.getTime() - windowStart.getTime()) / MINUTE_MS);
    const scheduledMinuteOffset = pickStableMinuteOffset(
      `${dateKey}:${slot.label}`,
      durationMinutes
    );
    const scheduledAt = new Date(windowStart.getTime() + scheduledMinuteOffset * MINUTE_MS);

    return {
      ...slot,
      windowStart,
      windowEnd,
      scheduledAt
    };
  });
}

export function getActiveScheduleSlot(now = new Date()) {
  const currentTime = now.getTime();

  return (
    getScheduleSlots(now).find((slot) => {
      return currentTime >= slot.scheduledAt.getTime() && currentTime <= slot.windowEnd.getTime();
    }) || null
  );
}

export function getMinPostGapMs() {
  return MIN_POST_GAP_HOURS * 60 * 60 * 1000;
}
