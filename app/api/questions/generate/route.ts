import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini SDK
let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI(); // Looks for process.env.GEMINI_API_KEY
} catch (e) {
  console.warn("Gemini API Key missing or SDK failed to initialize.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    if (!ai) {
      // Mock fallback if no API key
      return NextResponse.json({
        questions: [
          `Describe your architectural approach to building scalable ${role} systems.`,
          "Can you walk me through a complex debugging scenario you recently encountered?",
          "How do you handle technical debt while meeting strict deadlines?",
          "What is your strategy for optimizing performance in large-scale applications?",
          "Where do you see the future of this technology stack heading?"
        ]
      });
    }

    const prompt = `You are a Principal Engineering Manager. Generate exactly 5 highly analytical, progressive interview questions for the role of '${role}'. Return ONLY a JSON array of strings. Do not use markdown blocks.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text || "[]";
    if (text.startsWith("```json")) text = text.slice(7, -3).trim();
    else if (text.startsWith("```")) text = text.slice(3, -3).trim();

    const questions = JSON.parse(text);

    return NextResponse.json({ questions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
