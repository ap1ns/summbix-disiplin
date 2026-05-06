import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    requireTLS: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
  // Selalu cetak ke terminal sebagai fallback
  console.log(`
  ╔══════════════════════════════════════════╗
  ║  🔐 OTP VERIFICATION CODE               ║
  ║  To: ${to.padEnd(35)} ║
  ║  Code: ${otp}                            ║
  ║  Expires in: 15 minutes                  ║
  ╚══════════════════════════════════════════╝
  `);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP not configured. Code printed above.');
    return false;
  }

  const transporter = createTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Arial', sans-serif; background: #FFF5F7; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(255,142,158,0.15); }
        .header { background: linear-gradient(135deg, #FF8E9E, #FFD384); padding: 40px 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
        .body { padding: 40px 32px; }
        .otp-box { background: #FFF5F7; border: 2px solid #FF8E9E; border-radius: 16px; text-align: center; padding: 28px; margin: 24px 0; }
        .otp-code { font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #FF8E9E; font-family: monospace; }
        .otp-label { font-size: 11px; color: #A38B93; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; }
        .desc { color: #5A4048; font-size: 15px; line-height: 1.6; }
        .warning { color: #A38B93; font-size: 13px; margin-top: 20px; }
        .footer { background: #FFF5F7; padding: 20px 32px; text-align: center; color: #A38B93; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚡ AURA DISCIPLINE</h1>
          <p>Identity Verification Required</p>
        </div>
        <div class="body">
          <p class="desc">Hello, Agent.</p>
          <p class="desc">Enter the code below to verify your identity and activate your node:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">Verification Code</div>
          </div>
          <p class="warning">⏱ This code expires in <strong>15 minutes</strong>. Do not share it with anyone.</p>
        </div>
        <div class="footer">
          Aura Discipline &copy; 2026 &bull; Stay Focused. Stay Disciplined.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Aura Discipline ⚡" <${process.env.SMTP_USER}>`,
      to,
      subject: '⚡ Your Aura Verification Code',
      html,
      text: `Your Aura Discipline verification code is: ${otp}. It expires in 15 minutes.`,
    });
    console.log(`✅ Email sent to ${to} | Message ID: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`❌ Email failed: ${err.message}`);
    console.log('👆 Use the code printed above instead.');
    return false;
  }
}
