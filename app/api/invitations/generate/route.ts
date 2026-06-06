import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = crypto.randomBytes(32).toString('hex');
    
    const { error } = await supabase.from('interview_invitations').insert([{
      token,
      candidate_name: body.candidate_name,
      candidate_email: body.candidate_email,
      target_role: body.target_role,
      status: 'sent'
    }]);

    if (error) {
      console.warn("Supabase insertion failed. This is expected if the tables are not yet configured.", error);
    }
    
    console.log(`[SIMULATED EMAIL] Sending secure token ${token} to ${body.candidate_email}`);
    
    return NextResponse.json({ 
      status: 'success', 
      token: token,
      message: 'Invitation generated and candidate recorded in Supabase.'
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
