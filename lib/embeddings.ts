import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"

const openai = new OpenAI()

// Configuration
const CHUNK_SIZE = 500 // tokens (approximate)
const CHUNK_OVERLAP = 50 // tokens overlap between chunks
const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536
const BATCH_SIZE = 20 // max embeddings per API call

// Rough token estimation (1 token ≈ 4 characters for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Split text into chunks with overlap
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = []

  // Split by paragraphs first to preserve semantic boundaries
  const paragraphs = text.split(/\n\n+/)

  let currentChunk = ""
  let currentTokens = 0

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph)

    // If a single paragraph is too long, split by sentences
    if (paragraphTokens > chunkSize) {
      // Save current chunk if it has content
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ""
        currentTokens = 0
      }

      // Split long paragraph by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence)

        if (currentTokens + sentenceTokens > chunkSize && currentChunk.trim()) {
          chunks.push(currentChunk.trim())
          // Keep overlap from end of previous chunk
          const words = currentChunk.split(/\s+/)
          const overlapWords = words.slice(-Math.floor(overlap / 2))
          currentChunk = overlapWords.join(" ") + " " + sentence
          currentTokens = estimateTokens(currentChunk)
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence
          currentTokens += sentenceTokens
        }
      }
    } else {
      // Check if adding this paragraph would exceed chunk size
      if (currentTokens + paragraphTokens > chunkSize && currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        // Keep overlap from end of previous chunk
        const words = currentChunk.split(/\s+/)
        const overlapWords = words.slice(-Math.floor(overlap / 2))
        currentChunk = overlapWords.join(" ") + "\n\n" + paragraph
        currentTokens = estimateTokens(currentChunk)
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph
        currentTokens += paragraphTokens
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

// Generate embeddings for an array of texts
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []

  // Process in batches
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    })

    for (const item of response.data) {
      embeddings.push(item.embedding)
    }
  }

  return embeddings
}

// Generate embedding for a single text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  })

  return response.data[0].embedding
}

// Process a material: chunk text, generate embeddings, store in database
export async function processMaterialEmbeddings(materialId: string, text: string): Promise<void> {
  const supabase = await createClient()

  // Chunk the text
  const chunks = chunkText(text)

  if (chunks.length === 0) {
    console.log("No chunks to process for material:", materialId)
    return
  }

  // Generate embeddings for all chunks
  const embeddings = await generateEmbeddings(chunks)

  // Prepare records for batch insert
  const records = chunks.map((content, index) => ({
    material_id: materialId,
    content,
    chunk_index: index,
    token_count: estimateTokens(content),
    embedding: `[${embeddings[index].join(",")}]`, // PostgreSQL vector format
  }))

  // Insert chunks in batches
  const INSERT_BATCH_SIZE = 100
  for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
    const batch = records.slice(i, i + INSERT_BATCH_SIZE)

    const { error } = await supabase
      .from("material_chunks")
      .insert(batch)

    if (error) {
      console.error("Failed to insert chunks:", error)
      throw new Error(`Failed to insert chunks: ${error.message}`)
    }
  }

  console.log(`Processed ${chunks.length} chunks for material ${materialId}`)
}

// Search for similar chunks using cosine similarity
export async function searchSimilarChunks(
  courseId: string,
  queryText: string,
  limit = 5,
  threshold = 0.7
): Promise<Array<{ content: string; similarity: number; materialId: string }>> {
  const supabase = await createClient()

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText)

  // Search using pgvector cosine similarity
  // Note: Supabase requires a stored function for vector similarity search
  const { data, error } = await supabase.rpc("search_material_chunks", {
    query_embedding: `[${queryEmbedding.join(",")}]`,
    course_id_filter: courseId,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error("Search failed:", error)
    throw new Error(`Search failed: ${error.message}`)
  }

  return data || []
}

// Export configuration for reference
export const EMBEDDING_CONFIG = {
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
}
