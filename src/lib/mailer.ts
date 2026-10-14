import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER || "qrinaja16@gmail.com";
const smtpPass = process.env.SMTP_PASS || "Chikaaditya_1116";
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;
const fromName = process.env.SMTP_FROM_NAME || "Smart QR Review Official";
const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;
const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || smtpUser;

// Inisialisasi nodemailer transporter
export const mailTransporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

function formatMailerError(err: any): string {
  const msg = err?.message || "";
  if (
    msg.includes("535") ||
    msg.includes("BadCredentials") ||
    msg.includes("Username and Password not accepted")
  ) {
    return "Akun Gmail pengirim membutuhkan 'Sandi Aplikasi' (App Password 16-digit). Silakan buat di https://myaccount.google.com/apppasswords dan perbarui SMTP_PASS di file .env.";
  }
  return msg || "Gagal mengirim email. Pastikan koneksi SMTP sistem aktif.";
}

/**
 * Kirim Email Kode OTP Reset Password
 */
export async function sendOtpEmail(toEmail: string, otpCode: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://google-scan-ckaz.vercel.app";

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `[Smart QR Review] Kode Verifikasi OTP Reset Password: ${otpCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kode OTP Reset Password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 15px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: linear-gradient(180deg, #131c31 0%, #0d1527 100%); border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 32px 20px 32px; text-align: center; background: linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%); border-bottom: 1px solid #1e293b;">
                      <div style="display: inline-block; padding: 12px; background: rgba(99, 102, 241, 0.15); border-radius: 14px; border: 1px solid rgba(99, 102, 241, 0.3); margin-bottom: 12px;">
                        <span style="font-size: 28px;">🔐</span>
                      </div>
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Permintaan Reset Password</h1>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Smart QR Review Management Platform</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">Halo Rekan Mitra,</p>
                      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                        Kami menerima permintaan untuk mereset kata sandi akun Anda (<strong style="color: #38bdf8;">${toEmail}</strong>). Gunakan 6-digit kode OTP di bawah ini untuk melanjutkan:
                      </p>

                      <!-- OTP Box -->
                      <div style="background: rgba(15, 23, 42, 0.8); border: 2px dashed #4f46e5; border-radius: 16px; padding: 22px; text-align: center; margin: 24px 0;">
                        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #818cf8; font-weight: 700; margin-bottom: 8px;">KODE VERIFIKASI RESMI</span>
                        <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; font-family: 'Courier New', Courier, monospace;">
                          ${otpCode}
                        </div>
                        <span style="display: block; font-size: 12px; color: #64748b; margin-top: 8px;">⏱️ Berlaku selama <strong>10 Menit</strong></span>
                      </div>

                      <div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 8px; padding: 12px 14px; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #fca5a5;">
                          <strong>Keamanan Penting:</strong> Jangan pernah memberikan kode OTP ini kepada siapa pun, termasuk pihak yang mengatasnamakan Smart QR Review.
                        </p>
                      </div>

                      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                        Jika Anda tidak pernah meminta reset kata sandi, abaikan email ini. Akun Anda tetap aman.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 32px; background-color: #0b1120; border-top: 1px solid #1e293b; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #475569;">
                        &copy; 2026 Smart QR Review Platform. Notifikasi otomatis oleh ${fromName}.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Mailer Error sendOtpEmail]:", err);
    return {
      success: false,
      error: formatMailerError(err),
    };
  }
}

/**
 * Kirim Email Sambutan & Bukti Aktivasi ke Owner Baru
 */
export async function sendActivationWelcomeEmail(
  toEmail: string,
  data: {
    cardCode: string;
    outletName: string;
    loginEmail: string;
    mapsUrl?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://google-scan-ckaz.vercel.app";
    const loginUrl = `${appUrl}/login`;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: `🎉 Selamat! Kartu Smart QR Review (${data.cardCode}) Berhasil Diaktivasi`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Aktivasi Kartu Berhasil</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f19; padding: 40px 15px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background: linear-gradient(180deg, #131c31 0%, #0d1527 100%); border-radius: 20px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 34px 32px 24px 32px; text-align: center; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(56, 189, 248, 0.1) 100%); border-bottom: 1px solid #1e293b;">
                      <div style="display: inline-block; padding: 14px; background: rgba(16, 185, 129, 0.15); border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 12px;">
                        <span style="font-size: 32px;">🚀</span>
                      </div>
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">Aktivasi Kartu Sukses!</h1>
                      <p style="margin: 6px 0 0 0; font-size: 13px; color: #34d399; font-weight: 600;">Kartu Smart QR Review Anda Sekarang Telah Aktif</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 32px;">
                      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">Halo Pemilik <strong>${data.outletName}</strong>,</p>
                      <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                        Selamat! Kartu Smart QR Review Anda dengan kode <strong style="color: #38bdf8;">${data.cardCode}</strong> telah berhasil dihubungkan ke Google Bisnis Anda dan siap digunakan untuk menjaring ratusan ulasan bintang 5!
                      </p>

                      <!-- Card Details -->
                      <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid #1e293b; border-radius: 14px; padding: 18px; margin: 20px 0;">
                        <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px;">
                          <tr>
                            <td style="color: #64748b; width: 130px;">Kode Kartu:</td>
                            <td style="color: #ffffff; font-weight: 700;">${data.cardCode}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b;">Nama Outlet:</td>
                            <td style="color: #38bdf8; font-weight: 700;">${data.outletName}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b;">Email Login:</td>
                            <td style="color: #ffffff; font-weight: 600;">${data.loginEmail}</td>
                          </tr>
                          <tr>
                            <td style="color: #64748b;">Status:</td>
                            <td><span style="display: inline-block; padding: 3px 10px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 999px; color: #34d399; font-size: 11px; font-weight: 700;">AKTIF & SIAP PAKAI</span></td>
                          </tr>
                        </table>
                      </div>

                      <!-- Action Button -->
                      <div style="text-align: center; margin: 28px 0;">
                        <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5 0%, #38bdf8 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);">
                          Masuk ke Portal Outlet &rarr;
                        </a>
                      </div>

                      <div style="background: rgba(99, 102, 241, 0.08); border-left: 3px solid #6366f1; border-radius: 8px; padding: 14px; margin-top: 24px;">
                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #c7d2fe;">
                          <strong>Langkah Berikutnya:</strong> Silakan login ke portal dan buka menu <strong>Profil Toko</strong> untuk melengkapi Nama Pemilik dan Nomor WhatsApp agar fitur <em>Smart Review Filter VIP</em> dapat melindungi reputasi bisnis Anda secara maksimal!
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 32px; background-color: #0b1120; border-top: 1px solid #1e293b; text-align: center;">
                      <p style="margin: 0; font-size: 11px; color: #475569;">
                        &copy; 2026 Smart QR Review Platform. Email resmi: ${fromEmail}.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Mailer Error sendActivationWelcomeEmail]:", err);
    return {
      success: false,
      error: formatMailerError(err),
    };
  }
}

/**
 * Kirim Tembusan / Laporan Real-Time ke Email Bisnis Admin
 */
export async function sendAdminActivationNotificationEmail(data: {
  cardCode: string;
  outletName: string;
  ownerEmail: string;
  mapsUrl?: string;
  timestamp?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const timeStr = data.timestamp || new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: adminNotificationEmail,
      subject: `🔔 [Laporan Bisnis] Aktivasi Kartu Baru: ${data.cardCode} (${data.outletName})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Laporan Aktivasi Outlet Baru</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
          <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #2563eb;">NOTIFIKASI BISNIS RESMI</span>
              <h2 style="margin: 6px 0 0 0; color: #1e293b; font-size: 20px;">Kartu Baru Berhasil Diaktivasi!</h2>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
              Terdapat aktivitas aktivasi kartu baru di sistem Smart QR Review. Berikut rincian data outlet yang terdaftar:
            </p>

            <table width="100%" cellpadding="8" cellspacing="0" style="background: #f1f5f9; border-radius: 10px; font-size: 13px; margin: 18px 0;">
              <tr>
                <td style="color: #64748b; width: 140px;">Kode Kartu:</td>
                <td style="color: #0f172a; font-weight: 700;">${data.cardCode}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Nama Outlet:</td>
                <td style="color: #2563eb; font-weight: 700;">${data.outletName}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Email Terdaftar:</td>
                <td style="color: #0f172a; font-weight: 600;">${data.ownerEmail}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Waktu Aktivasi:</td>
                <td style="color: #475569;">${timeStr} WIB</td>
              </tr>
              ${data.mapsUrl ? `
              <tr>
                <td style="color: #64748b;">Link Maps:</td>
                <td><a href="${data.mapsUrl}" target="_blank" style="color: #2563eb; word-break: break-all; font-size: 12px;">Buka Link Google Maps</a></td>
              </tr>
              ` : ""}
            </table>

            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center;">
              Pesan ini dikirimkan otomatis oleh sistem pusat ke email bisnis terdaftar (${adminNotificationEmail}).
            </p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await mailTransporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error("[Mailer Error sendAdminActivationNotificationEmail]:", err);
    return {
      success: false,
      error: formatMailerError(err),
    };
  }
}
