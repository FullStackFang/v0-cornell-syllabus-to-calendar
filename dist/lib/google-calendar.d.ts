import type { CalendarEvent } from "@/types";
export interface GoogleCalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    location?: string;
    start: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
        timeZone?: string;
    };
    attendees?: {
        email: string;
    }[];
}
export declare function createCalendarEvent(accessToken: string, event: CalendarEvent, calendarId?: string): Promise<GoogleCalendarEvent>;
export declare function createBatchEvents(accessToken: string, events: CalendarEvent[], calendarId?: string): Promise<{
    created: number;
    errors: string[];
}>;
export declare function listUserCalendars(accessToken: string): Promise<import("googleapis").calendar_v3.Schema$CalendarListEntry[]>;
export declare function deleteCalendarEvent(accessToken: string, eventId: string, calendarId?: string): Promise<void>;
export interface ListedCalendarEvent {
    id: string;
    title: string;
    startDate: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    location?: string;
    description?: string;
}
export declare function listCalendarEvents(accessToken: string, timeMin: string, timeMax: string, calendarId?: string): Promise<ListedCalendarEvent[]>;
//# sourceMappingURL=google-calendar.d.ts.map