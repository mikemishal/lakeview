export type CalendarEventItem = {
  id: string;
  summary: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  source: "airbnb";
};

export type CalendarSyncResponse = {
  calendarUrl: string;
  count: number;
  items: CalendarEventItem[];
};

export type CalendarSyncError = {
  error: string;
};
