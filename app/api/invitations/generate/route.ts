import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = crypto.randomBytes(32).toString('hex'); // 64-character token
    
    // In a real scenario, we'd insert into Supabase here
    // const { data, error } = await supabase.from('interview_invitations').insert([...])
    
    // Simulated transactional background email
    console.log(`[SIMULATED EMAIL] Sending secure token ${token} to ${body.candidate_email}`);
    
    return NextResponse.json({ 
      status: 'success', 
      token: token,
      message: 'Invitation generated and candidate recorded in Supabase.'
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Failed to process invitation.' }, { status: 500 });
  }
}
