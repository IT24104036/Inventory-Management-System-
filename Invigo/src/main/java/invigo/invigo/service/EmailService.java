package invigo.invigo.service;

import invigo.invigo.entity.Sale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.util.List;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.mail.from-address:no-reply@invigo.local}")
    private String fromAddress;

    @Value("${app.mail.from-name:Invigo FreshGuard}")
    private String fromName;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Async
    public void sendAccountCreationEmail(String toEmail, String name, String username, String roleName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your Invigo Account Has Been Created");

            String forgotPasswordUrl = frontendBaseUrl.replaceAll("/+$", "") + "/forgot-password";

            String html = """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8"/>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                </head>
                <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.1);">
                          <!-- Header -->
                          <tr>
                            <td style="background:linear-gradient(135deg,#007A5E 0%%,#0F172A 100%%);padding:40px;text-align:center;">
                              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:12px 20px;margin-bottom:16px;">
                                <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:2px;">INVIGO</span>
                              </div>
                              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Welcome to Invigo FreshGuard</h1>
                              <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:15px;">Your account has been created</p>
                            </td>
                          </tr>
                          <!-- Body -->
                          <tr>
                            <td style="padding:48px 40px;">
                              <p style="color:#0F172A;font-size:16px;margin:0 0 24px;line-height:1.6;">
                                Hello <strong>%s</strong>,
                              </p>
                              <p style="color:#475569;font-size:15px;margin:0 0 32px;line-height:1.6;">
                                An account has been created for you on the Invigo FreshGuard system. For security, your password is not sent by email.
                              </p>
                              <!-- Credentials Box -->
                              <table width="100%%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:2px solid #007A5E;border-radius:16px;margin-bottom:32px;">
                                <tr>
                                  <td style="padding:28px 32px;">
                                    <p style="margin:0 0 16px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Your Login Credentials</p>
                                    <table width="100%%" cellpadding="0" cellspacing="0">
                                      <tr>
                                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                                          <span style="color:#64748b;font-size:13px;font-weight:600;">Role</span>
                                          <span style="float:right;color:#0F172A;font-size:14px;font-weight:700;">%s</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                                          <span style="color:#64748b;font-size:13px;font-weight:600;">Username</span>
                                          <span style="float:right;color:#007A5E;font-size:14px;font-weight:700;font-family:monospace;">%s</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td style="padding:10px 0;">
                                          <span style="color:#64748b;font-size:13px;font-weight:600;">Password Setup</span>
                                          <span style="float:right;color:#0F172A;font-size:14px;font-weight:700;">Use Forgot Password</span>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                              <div style="text-align:center;margin-bottom:28px;">
                                <a href="%s" style="display:inline-block;background:#007A5E;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:14px;font-weight:700;">
                                  Set Your Password
                                </a>
                              </div>
                              <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
                                Open the Forgot Password page, request an OTP with your work email, and create your own password. If you did not expect this account, please contact your system administrator.
                              </p>
                            </td>
                          </tr>
                          <!-- Footer -->
                          <tr>
                            <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                              <p style="margin:0;color:#94a3b8;font-size:12px;">
                                &copy; 2025 Invigo FreshGuard &bull; Powered by Gen3 Analytics
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(name, roleName, username, forgotPasswordUrl);

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send account creation email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        try {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromAddress, fromName);
        helper.setTo(toEmail);
        helper.setSubject("Invigo Password Reset OTP");

        String html = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            </head>
            <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
                <tr>
                  <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.1);">
                      <!-- Header -->
                      <tr>
                        <td style="background:linear-gradient(135deg,#007A5E 0%%,#0F172A 100%%);padding:40px;text-align:center;">
                          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:16px;padding:12px 20px;margin-bottom:16px;">
                            <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:2px;">INVIGO</span>
                          </div>
                          <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Password Reset</h1>
                          <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:15px;">Your one-time verification code</p>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding:48px 40px;text-align:center;">
                          <p style="color:#0F172A;font-size:16px;margin:0 0 32px;line-height:1.6;">
                            We received a request to reset your Invigo account password.<br/>
                            Use the code below — it expires in <strong>10 minutes</strong>.
                          </p>
                          <!-- OTP Box -->
                          <div style="display:inline-block;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:2px solid #007A5E;border-radius:20px;padding:24px 48px;margin-bottom:32px;">
                            <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Your OTP Code</p>
                            <p style="margin:0;color:#007A5E;font-size:48px;font-weight:900;letter-spacing:12px;font-family:monospace;">%s</p>
                          </div>
                          <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">
                            If you did not request a password reset, please ignore this email.
                          </p>
                          <p style="color:#94a3b8;font-size:13px;margin:0;">
                            Your account remains secure.
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                          <p style="margin:0;color:#94a3b8;font-size:12px;">
                            &copy; 2025 Invigo FreshGuard &bull; Powered by Gen3 Analytics
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(otp);

        helper.setText(html, true);
        mailSender.send(message);
        } catch (Exception e) {
            // Log failure — caller already responded to user, nothing to propagate
            System.err.println("Failed to send OTP email to " + toEmail + ": " + e.getMessage());
        }
    }

    @Async
    public void sendBillEmail(String toEmail, String customerName, String billId, List<Sale> lines, double grandTotal) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Your Receipt — " + billId);

            StringBuilder rows = new StringBuilder();
            for (Sale s : lines) {
                if (s.getStatus() != null && s.getStatus().name().equals("VOID")) continue;
                String discount = (s.getDiscountRate() != null && s.getDiscountRate() > 0)
                    ? String.format("<span style='color:#007A5E;font-size:11px;'>-%.0f%% OFF</span>", s.getDiscountRate())
                    : "";
                rows.append(String.format("""
                    <tr>
                      <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#0F172A;font-size:14px;font-weight:600;'>%s %s</td>
                      <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#475569;font-size:14px;'>%d</td>
                      <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569;font-size:14px;'>Rs %.2f</td>
                      <td style='padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;color:#0F172A;font-size:14px;font-weight:700;'>Rs %.2f</td>
                    </tr>
                    """,
                    s.getProduct().getName(), discount,
                    s.getQuantitySold(),
                    s.getUnitPrice(),
                    s.getLineTotal()
                ));
            }

            String html = """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"/></head>
                <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
                    <tr><td align="center">
                      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.1);">
                        <tr>
                          <td style="background:linear-gradient(135deg,#007A5E,#0F172A);padding:40px;text-align:center;">
                            <span style="color:#fff;font-size:24px;font-weight:900;letter-spacing:2px;">INVIGO</span>
                            <h1 style="color:#fff;margin:12px 0 4px;font-size:26px;">Your Receipt</h1>
                            <p style="color:rgba(255,255,255,0.7);margin:0;font-size:14px;">Bill %s</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:32px 40px;">
                            <p style="color:#0F172A;font-size:15px;margin:0 0 24px;">Hello <strong>%s</strong>, thank you for your purchase!</p>
                            <table width="100%%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                              <thead>
                                <tr style="background:#f8fafc;">
                                  <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:2px;color:#64748b;text-transform:uppercase;">Product</th>
                                  <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;letter-spacing:2px;color:#64748b;text-transform:uppercase;">Qty</th>
                                  <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;letter-spacing:2px;color:#64748b;text-transform:uppercase;">Unit Price</th>
                                  <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;letter-spacing:2px;color:#64748b;text-transform:uppercase;">Total</th>
                                </tr>
                              </thead>
                              <tbody>%s</tbody>
                            </table>
                            <table width="100%%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                              <tr>
                                <td style="font-size:18px;font-weight:900;color:#0F172A;padding:12px 0;border-top:2px solid #007A5E;">Grand Total</td>
                                <td style="font-size:18px;font-weight:900;color:#007A5E;text-align:right;padding:12px 0;border-top:2px solid #007A5E;">Rs %.2f</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                            <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 Invigo FreshGuard</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(billId, customerName, rows.toString(), grandTotal);

            helper.setText(html, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send bill email to " + toEmail + ": " + e.getMessage());
        }
    }
}
