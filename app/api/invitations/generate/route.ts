import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';
import * as Brevo from '@getbrevo/brevo';

// Initialize Brevo safely with fallback to prevent build-time crash
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = crypto.randomBytes(32).toString('hex');
    
    // Log the generated invitation to the Supabase Database
    const { error } = await supabase.from('interview_invitations').insert([{
      token,
      candidate_name: body.candidate_name,
      candidate_email: body.candidate_email,
      target_role: body.target_role,
      status: 'sent'
    }]);

    if (error) {
      console.warn("Supabase insertion failed. Check table definitions.", error);
    }
    
    // Dispatch transactional payload via Brevo
    const magicLink = `https://talentai-serverless-nnxlefp12-kartiksinghdav-6251s-projects.vercel.app/interview/${token}`;
    const formattedDate = body.time_slot 
      ? new Date(body.time_slot).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : 'As per scheduled slot';
    
    try {
      const sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail.sender = { name: "TalentAI Platforms", email: "kartik.singh.dav@gmail.com" };
      sendSmtpEmail.to = [{ email: body.candidate_email, name: body.candidate_name }];
      sendSmtpEmail.subject = `Official Selection Invitation: AI Interview for ${body.target_role} - TalentAI`;
      sendSmtpEmail.htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #F4F6F9; border-radius: 12px; max-width: 600px; margin: 0 auto; color: #1E293B;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3B82F6; margin: 0; font-size: 24px;">TalentAI Platform</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.7; font-size: 14px;">Secure Assessment Authorization</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05);">
            <h2 style="margin-top: 0;">Hello ${body.candidate_name},</h2>
            <p>You have been invited to complete a proctored technical assessment for the role of <strong>${body.target_role}</strong>.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; font-weight: bold; color: #64748b; text-transform: uppercase;">Scheduled Target (IST)</p>
              <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 16px;">${formattedDate}</p>
            </div>

            <p style="margin-bottom: 25px; font-size: 14px; color: #475569;">
              <strong>System Requirements:</strong> You must complete this assessment on a desktop or laptop device. You will be required to grant microphone, camera, and full-screen monitoring access.
            </p>
            
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${magicLink}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Initialize Terminal Session</a>
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
              Token Identifier:<br>
              <code style="background-color: #f1f5f9; padding: 3px 6px; border-radius: 4px;">${token}</code>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
            This is an automated transmission from the TalentAI Recruitment Node.
          </div>
        </div>
      `;
      
      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`[BREVO SUCCESS] Sent secure token to ${body.candidate_email}`);
    } catch (emailError) {
      console.error("[BREVO ERROR] Failed to push email dispatch.", emailError);
    }
    
    return NextResponse.json({ 
      status: 'success', 
      token: token,
      message: 'Invitation generated, recorded, and dispatched via Brevo.'
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
