import { google } from "googleapis";
function getCalendarClient(accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.calendar({ version: "v3", auth });
}
export async function createCalendarEvent(accessToken, event, calendarId = "primary") {
    const calendar = getCalendarClient(accessToken);
    const startDateTime = event.startTime
        ? `${event.startDate}T${event.startTime}:00`
        : event.startDate;
    const endDateTime = event.endTime && event.endDate
        ? `${event.endDate}T${event.endTime}:00`
        : event.endDate || event.startDate;
    const googleEvent = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: event.startTime
            ? { dateTime: startDateTime, timeZone: "America/New_York" }
            : { date: event.startDate },
        end: event.endTime
            ? { dateTime: endDateTime, timeZone: "America/New_York" }
            : { date: endDateTime },
        attendees: event.attendees?.map(email => ({ email })),
    };
    const response = await calendar.events.insert({
        calendarId,
        requestBody: googleEvent,
    });
    return response.data;
}
export async function createBatchEvents(accessToken, events, calendarId = "primary") {
    const results = { created: 0, errors: [] };
    for (const event of events) {
        try {
            await createCalendarEvent(accessToken, event, calendarId);
            results.created++;
        }
        catch (error) {
            results.errors.push(`Failed to create "${event.title}": ${error}`);
        }
    }
    return results;
}
export async function listUserCalendars(accessToken) {
    const calendar = getCalendarClient(accessToken);
    const response = await calendar.calendarList.list();
    return response.data.items || [];
}
export async function deleteCalendarEvent(accessToken, eventId, calendarId = "primary") {
    const calendar = getCalendarClient(accessToken);
    await calendar.events.delete({ calendarId, eventId });
}
export async function listCalendarEvents(accessToken, timeMin, timeMax, calendarId = "primary") {
    const calendar = getCalendarClient(accessToken);
    const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
    });
    return (response.data.items || []).map(event => ({
        id: event.id || "",
        title: event.summary || "(No title)",
        startDate: event.start?.date || event.start?.dateTime?.split("T")[0] || "",
        startTime: event.start?.dateTime?.split("T")[1]?.substring(0, 5),
        endDate: event.end?.date || event.end?.dateTime?.split("T")[0],
        endTime: event.end?.dateTime?.split("T")[1]?.substring(0, 5),
        location: event.location || undefined,
        description: event.description || undefined,
    }));
}
//# sourceMappingURL=google-calendar.js.map