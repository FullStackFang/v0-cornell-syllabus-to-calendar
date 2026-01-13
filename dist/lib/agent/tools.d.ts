import { z } from "zod";
export declare const calendarEventSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodString;
    startTime: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    endTime: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    startDate: string;
    startTime?: string | undefined;
    description?: string | undefined;
    endDate?: string | undefined;
    endTime?: string | undefined;
    location?: string | undefined;
}, {
    title: string;
    startDate: string;
    startTime?: string | undefined;
    description?: string | undefined;
    endDate?: string | undefined;
    endTime?: string | undefined;
    location?: string | undefined;
}>;
export declare const toolSchemas: {
    create_calendar_events: {
        description: string;
        parameters: z.ZodObject<{
            events: z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                startDate: z.ZodString;
                startTime: z.ZodOptional<z.ZodString>;
                endDate: z.ZodOptional<z.ZodString>;
                endTime: z.ZodOptional<z.ZodString>;
                location: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                title: string;
                startDate: string;
                startTime?: string | undefined;
                description?: string | undefined;
                endDate?: string | undefined;
                endTime?: string | undefined;
                location?: string | undefined;
            }, {
                title: string;
                startDate: string;
                startTime?: string | undefined;
                description?: string | undefined;
                endDate?: string | undefined;
                endTime?: string | undefined;
                location?: string | undefined;
            }>, "many">;
            calendarId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            events: {
                title: string;
                startDate: string;
                startTime?: string | undefined;
                description?: string | undefined;
                endDate?: string | undefined;
                endTime?: string | undefined;
                location?: string | undefined;
            }[];
            calendarId?: string | undefined;
        }, {
            events: {
                title: string;
                startDate: string;
                startTime?: string | undefined;
                description?: string | undefined;
                endDate?: string | undefined;
                endTime?: string | undefined;
                location?: string | undefined;
            }[];
            calendarId?: string | undefined;
        }>;
    };
    search_emails: {
        description: string;
        parameters: z.ZodObject<{
            query: z.ZodString;
            maxResults: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            query: string;
            maxResults?: number | undefined;
        }, {
            query: string;
            maxResults?: number | undefined;
        }>;
    };
    summarize_email_thread: {
        description: string;
        parameters: z.ZodObject<{
            threadId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            threadId: string;
        }, {
            threadId: string;
        }>;
    };
    parse_syllabus: {
        description: string;
        parameters: z.ZodObject<{
            syllabusText: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            syllabusText: string;
        }, {
            syllabusText: string;
        }>;
    };
};
export declare function executeCreateCalendarEvents(accessToken: string, params: z.infer<typeof toolSchemas.create_calendar_events.parameters>): Promise<{
    success: boolean;
    message: string;
    created: any;
    errors: any;
}>;
export declare function executeSearchEmails(accessToken: string, params: z.infer<typeof toolSchemas.search_emails.parameters>): Promise<{
    success: boolean;
    count: any;
    emails: any;
}>;
export declare function executeSummarizeEmailThread(accessToken: string, params: z.infer<typeof toolSchemas.summarize_email_thread.parameters>): Promise<{
    success: boolean;
    threadId: any;
    messageCount: any;
    messages: any;
}>;
export declare function executeParseSyllabus(params: z.infer<typeof toolSchemas.parse_syllabus.parameters>): Promise<{
    success: boolean;
    data: any;
}>;
//# sourceMappingURL=tools.d.ts.map