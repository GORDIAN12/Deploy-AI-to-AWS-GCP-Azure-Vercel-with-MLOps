import type { NextApiRequest, NextApiResponse } from "next"
import { verifyToken } from "@clerk/backend"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const config = {
  api: {
    bodyParser: false, // necesario para streaming SSE
  },
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  /* =========================================================
   1️⃣ AUTH CLERK (equivalente a Depends(clerk_guard))
  ========================================================= */

  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).end("Missing Authorization header")
    return
  }

  const token = authHeader.replace("Bearer ", "")

  let userId: string

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })

    userId = payload.sub // ← creds.decoded["sub"]
  } catch {
    res.status(401).end("Invalid token")
    return
  }

  /* =========================================================
   2️⃣ HEADERS SSE (StreamingResponse)
  ========================================================= */

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  })

  /* =========================================================
   3️⃣ IA STREAMING
  ========================================================= */

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    })

    const stream = await model.generateContentStream(
      "Reply with a new business idea for AI Agents, formatted with headings, sub-headings and bullet points"
    )

    for await (const chunk of stream.stream) {
      const text = chunk.text()

      if (text) {
        const lines = text.split("\n")
        for (const line of lines) {
          res.write(`data: ${line}\n\n`)
        }
      }
    }

    res.write("event: end\ndata: done\n\n")
    res.end()
  } catch (err) {
    console.error(err)
    res.write(`event: error\ndata: AI error\n\n`)
    res.end()
  }
}
