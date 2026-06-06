import { NextResponse } from 'next/server';
import * as Brevo from '@getbrevo/brevo';

// Strict dynamic configuration overrides placed at the absolute top layout line
export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Flexible parameter mapping checks
    const candidateEmail = body.candidateEmail || body.email || body.candidate_email;
    const candidateName = body.candidateName || body.name || body.candidate_name || "Candidate";
    const targetRole = body.targetRole || body.jobRole || body.target_role || "Engineering Role";
    const rawTimeSlot = body.timeSlot || body.time_slot || "Scheduled Slot";

    if (!candidateEmail) {
      return NextResponse.json({ status: 'error', message: 'Missing candidate email parameter' }, { status: 400 });
    }

    // Initialize clean standalone Brevo Client instance
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || "");

    const token = Math.random().toString(36).substring(2, 15);
    const magicLink = `https://talentai-serverless-nnxlefp12-kartiksinghdav-6251s-projects.vercel.app/interview/${token}`;

    const sendSmtpEmail = {
      sender: { name: "TalentAI Platforms", email: "kartik.singh.dav@gmail.com" },
      to: [{ email: candidateEmail, name: candidateName }],
      subject: `Official Selection Invitation: AI Interview for ${targetRole} - TalentAI`,
      htmlContent: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #2563EB;">Hello ${candidateName},</h2>
          <p>You have been invited to complete a proctored technical assessment for the role of <strong>${targetRole}</strong>.</p>
          <p><strong>Scheduled Slot (IST):</strong> ${rawTimeSlot}</p>
          <p>Please click the button below to initialize your secure evaluation terminal environment:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start AI Interview</a>
          </p>
          <p style="font-size: 12px; color: #666;">This is an automated transmission from the TalentAI Recruitment Core Node.</p>
        </div>
      `
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    return NextResponse.json({ 
      status: 'success', 
      token: token,
      message: 'Invitation dispatched successfully via Brevo.' 
    });

  } catch (err: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: err?.message || 'Internal connection relay failure' 
    }, { status: 500 });
  }
}
