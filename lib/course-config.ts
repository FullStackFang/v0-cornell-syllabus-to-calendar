import {
  getOrCreateCourseFolder,
  readJsonFile,
  writeJsonFile,
  listCourseFolders,
} from "./drive"
import { encryptApiKey, decryptApiKey } from "./encryption"

/**
 * Available Claude models with cost/capability tradeoffs.
 *
 * Costs (approx per 1M tokens):
 * - haiku: $0.25 input, $1.25 output - Fast, cheap, good for simple Q&A
 * - sonnet: $3 input, $15 output - Balanced quality/cost
 * - opus: $15 input, $75 output - Most capable, use sparingly
 */
export type ClaudeModel = "haiku" | "sonnet" | "opus"

export const MODEL_IDS: Record<ClaudeModel, string> = {
  haiku: "claude-3-5-haiku-20241022",
  sonnet: "claude-sonnet-4-20250514",
  opus: "claude-opus-4-20250514",
}

export const MODEL_INFO: Record<ClaudeModel, { name: string; costPer1M: { input: number; output: number }; description: string }> = {
  haiku: {
    name: "Claude 3.5 Haiku",
    costPer1M: { input: 0.25, output: 1.25 },
    description: "Fast and cheap. Great for simple FAQ matching.",
  },
  sonnet: {
    name: "Claude Sonnet 4",
    costPer1M: { input: 3, output: 15 },
    description: "Balanced quality and cost. Good for most questions.",
  },
  opus: {
    name: "Claude Opus 4",
    costPer1M: { input: 15, output: 75 },
    description: "Most capable. Use for complex reasoning only.",
  },
}

export interface CourseSettings {
  autoReplyThreshold: number
  notifyOnNewQuestion: boolean
  maxAutoRepliesPerDay?: number
  /** Model to use for answering questions. Defaults to 'haiku' for cost efficiency. */
  model: ClaudeModel
  /** Use a smarter model when confidence is low. Defaults to false. */
  useSmartModelForLowConfidence?: boolean
  /** Threshold below which to use smarter model. Defaults to 0.5. */
  smartModelThreshold?: number
}

export interface CourseConfig {
  courseId: string
  courseName: string
  professorEmail: string
  professorName?: string
  encryptedApiKey?: string
  settings: CourseSettings
  createdAt: string
  updatedAt: string
}

export interface PendingQuestion {
  id: string
  emailId: string
  threadId: string
  from: string
  subject: string
  body: string
  receivedAt: string
  suggestedResponse: string
  confidence: number
  reasoning: string
}

export interface AnsweredQuestion {
  id: string
  emailId: string
  from: string
  subject: string
  question: string
  response: string
  answeredAt: string
  wasAutoReply: boolean
  addedToFaq: boolean
}

const CONFIG_FILE = "config.json"
const PENDING_QUEUE_FILE = "pending-queue.json"
const HISTORY_FILE = "history.json"

/**
 * Creates a new course configuration.
 */
export async function createCourse(
  accessToken: string,
  courseId: string,
  courseName: string,
  professorEmail: string,
  professorName?: string,
  anthropicApiKey?: string
): Promise<CourseConfig> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)

  const config: CourseConfig = {
    courseId,
    courseName,
    professorEmail,
    professorName,
    encryptedApiKey: anthropicApiKey
      ? encryptApiKey(anthropicApiKey, professorEmail)
      : undefined,
    settings: {
      autoReplyThreshold: 0.85,
      notifyOnNewQuestion: true,
      model: "haiku",
      useSmartModelForLowConfidence: false,
      smartModelThreshold: 0.5,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await writeJsonFile(accessToken, folderId, CONFIG_FILE, config)

  // Initialize empty pending queue and history
  await writeJsonFile(accessToken, folderId, PENDING_QUEUE_FILE, { questions: [] })
  await writeJsonFile(accessToken, folderId, HISTORY_FILE, { questions: [] })

  return config
}

/**
 * Gets a course configuration.
 */
export async function getCourseConfig(
  accessToken: string,
  courseId: string
): Promise<CourseConfig | null> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)
  return readJsonFile<CourseConfig>(accessToken, folderId, CONFIG_FILE)
}

/**
 * Updates a course configuration.
 */
export async function updateCourseConfig(
  accessToken: string,
  courseId: string,
  updates: Partial<Omit<CourseConfig, "courseId" | "createdAt">>
): Promise<CourseConfig> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)
  const existing = await getCourseConfig(accessToken, courseId)

  if (!existing) {
    throw new Error(`Course ${courseId} not found`)
  }

  const updated: CourseConfig = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  await writeJsonFile(accessToken, folderId, CONFIG_FILE, updated)
  return updated
}

/**
 * Updates the API key for a course.
 */
export async function updateApiKey(
  accessToken: string,
  courseId: string,
  anthropicApiKey: string,
  professorEmail: string
): Promise<void> {
  await updateCourseConfig(accessToken, courseId, {
    encryptedApiKey: encryptApiKey(anthropicApiKey, professorEmail),
  })
}

/**
 * Gets the decrypted API key for a course.
 */
export async function getDecryptedApiKey(
  accessToken: string,
  courseId: string,
  professorEmail: string
): Promise<string | null> {
  const config = await getCourseConfig(accessToken, courseId)
  if (!config?.encryptedApiKey) {
    return null
  }
  return decryptApiKey(config.encryptedApiKey, professorEmail)
}

/**
 * Lists all courses for a user.
 */
export async function listCourses(
  accessToken: string
): Promise<CourseConfig[]> {
  const folders = await listCourseFolders(accessToken)
  const courses: CourseConfig[] = []

  for (const folder of folders) {
    if (folder.mimeType === "application/vnd.google-apps.folder") {
      const config = await readJsonFile<CourseConfig>(
        accessToken,
        folder.id,
        CONFIG_FILE
      )
      if (config) {
        courses.push(config)
      }
    }
  }

  return courses
}

/**
 * Gets the pending questions queue.
 */
export async function getPendingQuestions(
  accessToken: string,
  courseId: string
): Promise<PendingQuestion[]> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)
  const data = await readJsonFile<{ questions: PendingQuestion[] }>(
    accessToken,
    folderId,
    PENDING_QUEUE_FILE
  )
  return data?.questions || []
}

/**
 * Adds a question to the pending queue.
 */
export async function addPendingQuestion(
  accessToken: string,
  courseId: string,
  question: PendingQuestion
): Promise<void> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)
  const questions = await getPendingQuestions(accessToken, courseId)
  questions.push(question)
  await writeJsonFile(accessToken, folderId, PENDING_QUEUE_FILE, { questions })
}

/**
 * Removes a question from the pending queue.
 */
export async function removePendingQuestion(
  accessToken: string,
  courseId: string,
  questionId: string
): Promise<PendingQuestion | null> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)
  const questions = await getPendingQuestions(accessToken, courseId)
  const index = questions.findIndex((q) => q.id === questionId)

  if (index === -1) {
    return null
  }

  const removed = questions.splice(index, 1)[0]
  await writeJsonFile(accessToken, folderId, PENDING_QUEUE_FILE, { questions })
  return removed
}

/**
 * Gets the question history.
 */
export async function getQuestionHistory(
  accessToken: string,
  courseId: string,
  limit?: number
): Promise<AnsweredQuestion[]> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)
  const data = await readJsonFile<{ questions: AnsweredQuestion[] }>(
    accessToken,
    folderId,
    HISTORY_FILE
  )
  const questions = data?.questions || []

  if (limit) {
    return questions.slice(-limit)
  }
  return questions
}

/**
 * Adds an answered question to history.
 */
export async function addToHistory(
  accessToken: string,
  courseId: string,
  question: AnsweredQuestion
): Promise<void> {
  const folderId = await getOrCreateCourseFolder(accessToken, courseId)
  const questions = await getQuestionHistory(accessToken, courseId)
  questions.push(question)

  // Keep only last 1000 questions
  const trimmed = questions.slice(-1000)
  await writeJsonFile(accessToken, folderId, HISTORY_FILE, { questions: trimmed })
}

/**
 * Gets course statistics.
 */
export async function getCourseStats(
  accessToken: string,
  courseId: string
): Promise<{
  totalQuestions: number
  autoReplied: number
  manuallyAnswered: number
  pendingCount: number
  autoReplyRate: number
  thisWeek: number
}> {
  const history = await getQuestionHistory(accessToken, courseId)
  const pending = await getPendingQuestions(accessToken, courseId)

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const thisWeek = history.filter(
    (q) => new Date(q.answeredAt) > oneWeekAgo
  ).length

  const autoReplied = history.filter((q) => q.wasAutoReply).length
  const manuallyAnswered = history.filter((q) => !q.wasAutoReply).length

  return {
    totalQuestions: history.length,
    autoReplied,
    manuallyAnswered,
    pendingCount: pending.length,
    autoReplyRate:
      history.length > 0 ? (autoReplied / history.length) * 100 : 0,
    thisWeek,
  }
}
