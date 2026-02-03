import { NextResponse } from "next/server"

// GET /api/config - Return public configuration
export async function GET() {
  const model = process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022"

  // Extract a friendly name from the model ID
  let modelName = "Claude"
  if (model.includes("haiku")) {
    modelName = "Haiku 3.5"
  } else if (model.includes("sonnet")) {
    modelName = "Sonnet 4"
  } else if (model.includes("opus")) {
    modelName = "Opus 4.5"
  }

  return NextResponse.json({
    model,
    modelName,
  })
}
