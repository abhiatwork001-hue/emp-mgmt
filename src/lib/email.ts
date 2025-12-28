import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const DEFAULT_COMPANY_NAME = "The Chick Ecosystem";

export const sendWelcomeEmail = async (email: string, firstName: string, companyName: string = DEFAULT_COMPANY_NAME, otp: string) => {
    const fromAddress = process.env.EMAIL_FROM || `"${companyName}" <${process.env.EMAIL_USER}>`;
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const mailOptions = {
        from: fromAddress,
        to: email,
        subject: `Welcome to ${companyName} - Your Account is Ready`,
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">${companyName.toUpperCase()}</h1>
                    <div style="height: 4px; width: 40px; background: #3b82f6; margin: 12px auto; border-radius: 2px;"></div>
                </div>

                <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Hello ${firstName},</h2>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Welcome to the ecosystem. Your professional account has been provisioned and is ready for activation.</p>
                
                <div style="background-color: #f8fafc; padding: 32px; border-radius: 16px; margin: 32px 0; border: 1px solid #f1f5f9;">
                    <div style="margin-bottom: 20px;">
                        <p style="margin: 0; font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Identity</p>
                        <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #0f172a;">${email}</p>
                    </div>
                    
                    <div>
                        <p style="margin: 0; font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em;">Activation Code</p>
                        <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: 800; color: #3b82f6; letter-spacing: 0.2em;">${otp}</p>
                    </div>
                </div>
                
                <p style="color: #64748b; line-height: 1.6; font-size: 14px; font-style: italic;">For your protection, you will be required to establish a permanent password upon your first entry.</p>
                
                <div style="text-align: center; margin-top: 40px;">
                    <a href="${appUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.3s ease;">Enter Ecosystem</a>
                </div>
                
                <hr style="margin: 48px 0 32px 0; border: 0; border-top: 1px solid #f1f5f9;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">This is an automated security broadcast. Please do not resolve queries by replying to this transmission.</p>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error("Nodemailer Error:", error);
        throw error;
    }
};

export const sendPasswordResetEmail = async (email: string, firstName: string, companyName: string = DEFAULT_COMPANY_NAME, otp: string) => {
    const fromAddress = process.env.EMAIL_FROM || `"${companyName}" <${process.env.EMAIL_USER}>`;
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const mailOptions = {
        from: fromAddress,
        to: email,
        subject: `Security Alert: Password Reset - ${companyName}`,
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background: #ffffff;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #0f172a; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin: 0;">${companyName.toUpperCase()}</h1>
                    <div style="height: 4px; width: 40px; background: #ef4444; margin: 12px auto; border-radius: 2px;"></div>
                </div>

                <h2 style="color: #0f172a; font-size: 20px; margin-bottom: 16px;">Security Update for ${firstName},</h2>
                <p style="color: #475569; line-height: 1.6; font-size: 16px;">Your request for identity recovery has been authorized by HR.</p>
                
                <div style="background-color: #fef2f2; padding: 32px; border-radius: 16px; margin: 32px 0; border: 1px solid #fee2e2;">
                    <p style="margin: 0; font-size: 12px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.1em;">Temporary Recovery Code</p>
                    <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 800; color: #ef4444; letter-spacing: 0.2em;">${otp}</p>
                </div>
                
                <p style="color: #64748b; line-height: 1.6; font-size: 14px;">Once logged in, verify your security settings and update your password.</p>
                
                <div style="text-align: center; margin-top: 40px;">
                    <a href="${appUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">Secure Login</a>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Reset Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error("Nodemailer Error (Reset):", error);
        throw error;
    }
};
