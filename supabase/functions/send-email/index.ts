// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as nodemailer from 'npm:nodemailer@6.9.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  to: string;
  template_key: string;
  variables: Record<string, string>;
  subject_override?: string;
}

interface SMTPSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
}

interface EmailTemplate {
  subject: string;
  html_body: string;
  text_body: string | null;
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailRequest: EmailRequest = await req.json();
    const { to, template_key, variables, subject_override } = emailRequest;

    if (!to || !template_key) {
      throw new Error('Missing required fields: to, template_key');
    }

    // Get active SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (smtpError || !smtpSettings) {
      throw new Error('SMTP settings not configured');
    }

    const smtp = smtpSettings as SMTPSettings;

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_body, text_body')
      .eq('template_key', template_key)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError || !template) {
      throw new Error(`Email template '${template_key}' not found`);
    }

    const emailTemplate = template as EmailTemplate;

    // Get company name from site settings
    const { data: companyNameSetting } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'company_name')
      .maybeSingle();

    const companyName = companyNameSetting?.setting_value || 'Escape Room';

    // Add default variables
    const allVariables = {
      ...variables,
      year: new Date().getFullYear().toString(),
      site_name: companyName,
    };

    // Replace variables in template
    const subject = subject_override || replaceVariables(emailTemplate.subject, allVariables);
    const htmlBody = replaceVariables(emailTemplate.html_body, allVariables);
    const textBody = emailTemplate.text_body 
      ? replaceVariables(emailTemplate.text_body, allVariables) 
      : '';

    // Configure nodemailer transport
    const transporter = nodemailer.createTransport({
      host: smtp.smtp_host,
      port: smtp.smtp_port,
      secure: smtp.smtp_port === 465,
      auth: {
        user: smtp.smtp_username,
        pass: smtp.smtp_password,
      },
      tls: smtp.use_tls ? {
        rejectUnauthorized: false,
      } : undefined,
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${smtp.from_name}" <${smtp.from_email}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });

    // Log successful send
    await supabase.from('email_logs').insert({
      to_email: to,
      from_email: smtp.from_email,
      subject,
      template_key,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try to log the failure
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const emailRequest: EmailRequest = await req.clone().json();
      
      await supabase.from('email_logs').insert({
        to_email: emailRequest.to || 'unknown',
        from_email: 'system',
        subject: 'Email Failed',
        template_key: emailRequest.template_key || 'unknown',
        status: 'failed',
        error_message: errorMessage,
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});