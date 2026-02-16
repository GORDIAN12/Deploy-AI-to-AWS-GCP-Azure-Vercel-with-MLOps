import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs/server';

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

export async function POST(req: NextRequest) {
  try {
    // Autenticación con Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const visit: Visit = await req.json();
    
    // Inicializar Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    const userPrompt = userPromptFor(visit);
    
    // Combinar system prompt y user prompt
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    // Crear stream con Gemini
    const result = await model.generateContentStream(fullPrompt);

    // Crear un ReadableStream para SSE
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const lines = text.split('\n');
              for (let i = 0; i < lines.length - 1; i++) {
                controller.enqueue(encoder.encode(`data: ${lines[i]}\n\n`));
                controller.enqueue(encoder.encode('data:  \n'));
              }
              controller.enqueue(encoder.encode(`data: ${lines[lines.length - 1]}\n\n`));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}