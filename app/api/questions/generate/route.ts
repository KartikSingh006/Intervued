import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });
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
      return NextResponse.json({ error: 'AI not initialized' }, { status: 500 });
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
