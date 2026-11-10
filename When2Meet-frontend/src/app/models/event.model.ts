export interface CalendarEvent {
  id?: number;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  type: 'PRIVATE' | 'SHARED';
  category: string;
}
export interface TimetableClass {
  subject: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: string | null;
}

export interface TimetableExtraction {
  classes: TimetableClass[];
}

export interface ConfirmTimetable {
  startDate: string;
  endDate: string;
  classes: TimetableClass[];
}