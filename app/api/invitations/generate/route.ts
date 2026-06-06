import { NextResponse } from 'next/server';
import * as Brevo from '@getbrevo/brevo';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Extracted Payload Body:", body);

    // Dynamic Parameter Mapping Blueprint (Accepts any variable structure sent from the frontend modal)
    const candidateEmail = body.candidateEmail || body.email || body.candidate_email;
    const candidateName = body.candidateName || body.name || body.candidate_name || "Candidate";
    const targetRole = body.targetRole || body.jobRole || body.target_role || "Engineering Role";
    const rawTimeSlot = body.timeSlot || body.time_slot || "Scheduled Slot";

    if (!candidateEmail) {
      return NextResponse.json({ status: 'error', message: 'Missing candidate email parameter' }, { status: 400 });
    }

    // Initialize Brevo Transactional Engine Client
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || "");

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const magicLink = `https://talentai-serverless-nnxlefp12-kartiksinghdav-6251s-projects.vercel.app/interview/${token}`;

    // Build Structured Send Parameters
    const sendSmtpEmail = {
      sender: { name: "TalentAI Platforms", email: "kartik.singh.dav@gmail.com" },
      to: [{ email: candidateEmail, name: candidateName }],
      subject: `Official Selection Invitation: AI Interview for ${targetRole} - TalentAI`,
      htmlContent: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Hello ${candidateName},</h2>
          <p>You have been invited to complete a proctored technical assessment for the role of <strong>${targetRole}</strong>.</p>
          <p><strong>Scheduled Slot:</strong> ${rawTimeSlot}</p>
          <p>Please click the link below to initialize your secure interview terminal:</p>
          <p><a href="${magicLink}" style="background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Start AI Interview</a></p>
        </div>
      `
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    return NextResponse.json({ 
      status: 'success', 
      token: token,
      message: 'Invitation generated and dispatched successfully via Brevo.' 
    });

  } catch (globalError: any) {
    console.error("CRITICAL BACKEND FAILURE:", globalError);
    return NextResponse.json({ 
      status: 'error', 
      message: globalError?.message || 'Internal pipeline execution failure' 
    }, { status: 500 });
  }
}
