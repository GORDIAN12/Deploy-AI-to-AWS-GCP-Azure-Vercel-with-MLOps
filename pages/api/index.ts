// /pages/api/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth } from "@clerk/nextjs/server";

interface Visit {
  patient_name: string;
  date_of_visit: string;
  notes: string;
}

const systemPrompt = `
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.
Reply with exactly three sections with the headings:
### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language
`;

function userPromptFor(visit: Visit): string {
  return `Create the summary, next steps and draft email for:
Patient Name: ${visit.patient_name}
Date of Visit: ${visit.date_of_visit}
Notes:
${visit.notes}`;
}

// (Opcional) evita que Next intente transformar/comprimir respuestas streaming
export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Auth Clerk (Pages Router)
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const visit = req.body as Visit;

    // SSE headers
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); 
    res.flushHeaders?.();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });


    const fullPrompt = `${systemPrompt}\n\n${userPromptFor(visit)}`;
    const result = await model.generateContentStream(fullPrompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (!text) continue;

      // manda línea por línea para que tu cliente lo concatene igual
      const lines = text.split("\n");
      for (const line of lines) {
        res.write(`data: ${line}\n\n`);
      }
    }

    // señal de cierre “normal”
    res.write("event: done\ndata: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("API Error:", err);

    // si ya abriste SSE, intenta mandar evento de error
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
      res.end();
    } catch {
      // fallback
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
