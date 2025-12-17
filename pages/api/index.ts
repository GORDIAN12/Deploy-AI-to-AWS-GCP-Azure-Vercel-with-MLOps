import type { NextApiRequest, NextApiResponse } from "next"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const config = {
  api: {
    bodyParser: false, // necesario para streaming
  },
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  })

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
    res.write(`event: error\ndata: Gemini error\n\n`)
    res.end()
  }
}
