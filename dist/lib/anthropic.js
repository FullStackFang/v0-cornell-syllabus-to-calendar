import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic();
const systemPrompt = `You are a syllabus parser. Extract structured information from this course syllabus.

Extract ALL assignments, due dates, class sessions, and exams. If a due date is not explicitly stated, set it to null. If class times are not specified, estimate based on typical academic schedules.

Generate unique IDs for each schedule item (format: s1, s2, s3...) and assignment (format: a1, a2, a3...).

Return ONLY valid JSON in this exact format:
{
  "course": {
    "name": "string",
    "code": "string",
    "instructor": "string",
    "email": "string",
    "semester": "string",
    "credits": number
  },
  "schedule": [
    {
      "id": "s1",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "duration_hours": number,
      "topic": "string",
      "location": "string"
    }
  ],
  "assignments": [
    {
      "id": "a1",
      "name": "string",
      "type": "homework" | "exam" | "project" | "quiz" | "participation",
      "dueDate": "YYYY-MM-DD" | null,
      "weight": "string",
      "description": "string"
    }
  ],
  "gradingBreakdown": {
    "category": "percentage"
  }
}`;
export async function extractSyllabusData(content, type = "text") {
    if (type === "pdf") {
        // Use Claude's native PDF support via document content
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "document",
                            source: {
                                type: "base64",
                                media_type: "application/pdf",
                                data: content,
                            },
                        },
                        {
                            type: "text",
                            text: systemPrompt,
                        },
                    ],
                },
            ],
        });
        const textBlock = response.content.find(block => block.type === "text");
        if (!textBlock || textBlock.type !== "text") {
            throw new Error("No text response from Claude");
        }
        // Extract JSON from response (handle potential markdown code blocks)
        let jsonStr = textBlock.text;
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }
        return JSON.parse(jsonStr.trim());
    }
    // Text input
    const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
            {
                role: "user",
                content: `${systemPrompt}

Syllabus content:
${content}`,
            },
        ],
    });
    const textBlock = response.content.find(block => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
    }
    let jsonStr = textBlock.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1];
    }
    return JSON.parse(jsonStr.trim());
}
//# sourceMappingURL=anthropic.js.map