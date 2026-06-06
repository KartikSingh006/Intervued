import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '@/lib/supabase';

let ai: GoogleGenAI | null = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key" });
} catch (e) {
  console.warn("Gemini API Key missing or SDK failed to initialize.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, mode, question, answer, proctor_flags } = body;
    
    let contentToGrade = answer;
    
    if (mode === 'speech_video') {
      console.log("[SIMULATED STT] Routing data into automated speech-to-text transcription layer...");
      contentToGrade = answer || "[Simulated Transcript Data: The candidate provided an adequate analytical response, though missed a few edge cases.]";
    }

    if (proctor_flags && proctor_flags.length > 0) {
      const { error: logError } = await supabase.from('proctoring_violations_timeline').insert(
        proctor_flags.map((flag: any) => ({
          token,
          violation_type: flag.type,
          details: flag.details
        }))
      );
      if (logError) console.error("Error logging flags", logError);
    }

    if (!ai) {
      return NextResponse.json({ error: 'AI not initialized' }, { status: 500 });
    }

    const prompt = `You are an expert technical interviewer. Question: '${question}'. Candidate Answer: '${contentToGrade}'. Score the candidate out of 10. Map technical gaps and strengths. Return ONLY a JSON object with keys: score (number), strengths (array of strings), gaps (array of strings). Do not use markdown blocks.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text || "{}";
    if (text.startsWith("```json")) text = text.slice(7, -3).trim();
    else if (text.startsWith("```")) text = text.slice(3, -3).trim();

    const evaluation = JSON.parse(text);

    const { error: evalError } = await supabase.from('interview_evaluations').insert({
      token,
      question,
      answer: contentToGrade,
      score: evaluation.score,
      strengths: evaluation.strengths,
      gaps: evaluation.gaps
    });

    if (evalError) console.warn("Error saving evaluation to Supabase", evalError);

    return NextResponse.json({
      ...evaluation,
      proctor_flags_recorded: proctor_flags?.length || 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
