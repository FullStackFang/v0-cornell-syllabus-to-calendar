/**
 * MCP Tool Registry
 *
 * Registers all available tools with the MCP server.
 * Tools are organized by category and connect to lib/ functions.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
/**
 * Registers all tools with the MCP server
 */
export declare function registerTools(server: Server): void;
/**
 * Returns the list of available tools for registration
 */
export declare function getToolDefinitions(): ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            courseName: {
                type: string;
                description: string;
            };
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId?: undefined;
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required?: undefined;
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            settings: {
                type: string;
                description: string;
                properties: {
                    autoReplyThreshold: {
                        type: string;
                        description: string;
                    };
                };
            };
            courseName?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            syllabusText: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            question: {
                type: string;
                description: string;
            };
            answer: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            faqId: {
                type: string;
                description: string;
            };
            question: {
                type: string;
                description: string;
            };
            answer: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            faqId: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            query: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            date: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            policy: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            query: {
                type: string;
                description: string;
            };
            maxResults: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            emailId: {
                type: string;
                description: string;
            };
            threadId: {
                type: string;
                description: string;
            };
            to: {
                type: string;
                description: string;
            };
            response: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            to: {
                type: string;
                description: string;
            };
            subject: {
                type: string;
                description: string;
            };
            body: {
                type: string;
                description: string;
            };
            courseId?: undefined;
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            response?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            courseId: {
                type: string;
                description: string;
            };
            questionId: {
                type: string;
                description: string;
            };
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            maxResults: {
                type: string;
                description: string;
            };
            courseId?: undefined;
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            threadId: {
                type: string;
                description: string;
            };
            courseId?: undefined;
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            to: {
                type: string;
                description: string;
            };
            subject: {
                type: string;
                description: string;
            };
            body: {
                type: string;
                description: string;
            };
            threadId: {
                type: string;
                description: string;
            };
            courseId?: undefined;
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            response?: undefined;
            questionId?: undefined;
            title?: undefined;
            startDate?: undefined;
            startTime?: undefined;
            endDate?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            title: {
                type: string;
                description: string;
            };
            startDate: {
                type: string;
                description: string;
            };
            startTime: {
                type: string;
                description: string;
            };
            endDate: {
                type: string;
                description: string;
            };
            endTime: {
                type: string;
                description: string;
            };
            location: {
                type: string;
                description: string;
            };
            description: {
                type: string;
                description: string;
            };
            courseId?: undefined;
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            startDate: {
                type: string;
                description: string;
            };
            endDate: {
                type: string;
                description: string;
            };
            courseId?: undefined;
            courseName?: undefined;
            settings?: undefined;
            syllabusText?: undefined;
            question?: undefined;
            answer?: undefined;
            faqId?: undefined;
            query?: undefined;
            date?: undefined;
            description?: undefined;
            policy?: undefined;
            maxResults?: undefined;
            emailId?: undefined;
            threadId?: undefined;
            to?: undefined;
            response?: undefined;
            subject?: undefined;
            body?: undefined;
            questionId?: undefined;
            title?: undefined;
            startTime?: undefined;
            endTime?: undefined;
            location?: undefined;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=index.d.ts.map