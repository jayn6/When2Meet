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