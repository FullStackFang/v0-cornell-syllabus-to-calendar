import Anthropic from "@anthropic-ai/sdk";
import { searchFAQs, buildKnowledgeContext, } from "./knowledge-base";
import { MODEL_IDS, MODEL_INFO } from "./course-config";
const DEFAULT_MODEL = "haiku";
const CONFIDENCE_THRESHOLD = 0.85;
function getAnthropicClient(apiKey) {
    if (apiKey) {
        return new Anthropic({ apiKey });
    }
    return new Anthropic();
}
function getNextModel(currentModel) {
    if (currentModel === "haiku")
        return "sonnet";
    if (currentModel === "sonnet")
        return "opus";
    return null; // Already at opus
}
export async function analyzeQuestion(email, knowledgeBase, options = {}) {
    const { model = DEFAULT_MODEL, apiKey, useSmartModelForLowConfidence = false, smartModelThreshold = 0.5, } = options;
    // Search for matching FAQs
    const matchedFaqs = await searchFAQs(knowledgeBase.courseId, email.body);
    const matchedFaqIds = matchedFaqs.slice(0, 3).map((f) => f.id);
    // Build context from knowledge base
    const kbContext = buildKnowledgeContext(knowledgeBase);
    // If we have a very high similarity match, use it directly (no API call needed!)
    if (matchedFaqs.length > 0 && matchedFaqs[0].similarity > 0.8) {
        return {
            confidence: 0.95,
            response: matchedFaqs[0].answer,
            matchedFaqIds,
            reasoning: `Found highly similar FAQ: "${matchedFaqs[0].question}"`,
            modelUsed: model, // No model actually used, but report the configured one
        };
    }
    // Use Claude to generate a response
    const decision = await callClaude(email, kbContext, matchedFaqs, model, apiKey, matchedFaqIds);
    // If confidence is low and we should try a smarter model
    if (useSmartModelForLowConfidence &&
        decision.confidence < smartModelThreshold) {
        const smarterModel = getNextModel(model);
        if (smarterModel) {
            console.log(`Low confidence (${(decision.confidence * 100).toFixed(0)}%), retrying with ${smarterModel}`);
            const smarterDecision = await callClaude(email, kbContext, matchedFaqs, smarterModel, apiKey, matchedFaqIds);
            // Only use smarter model's answer if it's actually more confident
            if (smarterDecision.confidence > decision.confidence) {
                return smarterDecision;
            }
        }
    }
    return decision;
}
async function callClaude(email, kbContext, matchedFaqs, model, apiKey, matchedFaqIds) {
    const anthropic = getAnthropicClient(apiKey);
    const modelId = MODEL_IDS[model];
    const systemPrompt = `You are a helpful course assistant. Answer student questions based on the provided course knowledge base.

IMPORTANT: You must respond with a JSON object containing:
- "confidence": number between 0 and 1 indicating how confident you are in your answer
  - 0.9-1.0: Answer is directly from syllabus, FAQ, or course materials
  - 0.7-0.9: Answer is reasonably inferred from available information
  - 0.5-0.7: Answer is partially based on course info, needs verification
  - 0.0-0.5: Cannot answer from available information, needs professor
- "response": your answer to the student (write naturally, as if from the professor)
- "reasoning": brief explanation of why you assigned this confidence level

Be conservative with confidence scores. If you're unsure or the question requires professor judgment, use a lower score.

COURSE KNOWLEDGE BASE:
${kbContext || "No knowledge base content available yet."}

Similar previous Q&A (if any):
${matchedFaqs.slice(0, 3).map((f) => `Q: ${f.question}\nA: ${f.answer}\nSimilarity: ${(f.similarity * 100).toFixed(0)}%`).join("\n\n") || "No similar questions found."}`;
    const userMessage = `Student email:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}

Message:
${email.body}

Generate a helpful response and rate your confidence.`;
    try {
        const response = await anthropic.messages.create({
            model: modelId,
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
        });
        const textBlock = response.content.find((block) => block.type === "text");
        if (!textBlock) {
            return createLowConfidenceDecision(email, matchedFaqIds, model);
        }
        // Parse the JSON response
        const parsed = parseAgentResponse(textBlock.text);
        return {
            confidence: parsed.confidence,
            response: parsed.response,
            matchedFaqIds,
            reasoning: parsed.reasoning,
            modelUsed: model,
        };
    }
    catch (error) {
        console.error(`Agent decision error (${model}):`, error);
        return createLowConfidenceDecision(email, matchedFaqIds, model);
    }
}
function parseAgentResponse(text) {
    // Try to parse as JSON
    try {
        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
                response: parsed.response || text,
                reasoning: parsed.reasoning || "No reasoning provided",
            };
        }
    }
    catch {
        // If JSON parsing fails, treat the whole response as a low-confidence answer
    }
    // Fallback: use the text as the response with moderate confidence
    return {
        confidence: 0.5,
        response: text,
        reasoning: "Could not parse structured response, defaulting to moderate confidence",
    };
}
function createLowConfidenceDecision(email, matchedFaqIds, model) {
    return {
        confidence: 0.3,
        response: `I received your question about "${email.subject}". I'll forward this to the professor for a more accurate response.`,
        matchedFaqIds,
        reasoning: "Error processing question, routing to professor for safety",
        modelUsed: model,
    };
}
export function shouldAutoReply(decision, threshold = CONFIDENCE_THRESHOLD) {
    return decision.confidence >= threshold;
}
export function formatProfessorNotification(email, decision, approvalLinks) {
    const modelInfo = MODEL_INFO[decision.modelUsed];
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📬 NEW STUDENT QUESTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FROM: ${email.from}
DATE: ${email.date}
SUBJECT: ${email.subject}

STUDENT'S QUESTION:
${email.body}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 AI SUGGESTED RESPONSE (${(decision.confidence * 100).toFixed(0)}% confidence)
Model: ${modelInfo.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${decision.response}

Reasoning: ${decision.reasoning}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ APPROVE & SEND:
${approvalLinks.approve}

✎ EDIT & SEND:
${approvalLinks.edit}

✗ IGNORE:
${approvalLinks.ignore}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
/**
 * Creates analyze options from course settings.
 */
export function createOptionsFromSettings(settings, apiKey) {
    return {
        model: settings.model || DEFAULT_MODEL,
        apiKey,
        autoReplyThreshold: settings.autoReplyThreshold,
        useSmartModelForLowConfidence: settings.useSmartModelForLowConfidence,
        smartModelThreshold: settings.smartModelThreshold,
    };
}
/**
 * Estimates cost for a question based on model.
 * Assumes ~500 input tokens and ~200 output tokens per question.
 */
export function estimateCost(model) {
    const info = MODEL_INFO[model];
    const inputTokens = 500;
    const outputTokens = 200;
    const inputCost = (inputTokens / 1_000_000) * info.costPer1M.input;
    const outputCost = (outputTokens / 1_000_000) * info.costPer1M.output;
    return {
        input: inputCost,
        output: outputCost,
        total: inputCost + outputCost,
    };
}
//# sourceMappingURL=agent-decision.js.map