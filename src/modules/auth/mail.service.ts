import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter;

    constructor(private configService: ConfigService) {
        // Log để kiểm tra config (bạn có thể xóa sau khi test thành công)
        console.log('📧 Mail Service Initialized with:', {
            user: this.configService.get<string>('MAIL_USER'),
            from: this.configService.get<string>('MAIL_FROM'),
            passExists: !!this.configService.get<string>('MAIL_PASS'),
        });

        this.transporter = nodemailer.createTransport({
            service: 'gmail',   // Cách đơn giản và ổn định nhất

            auth: {
                user: this.configService.get<string>('MAIL_USER'),
                pass: this.configService.get<string>('MAIL_PASS'),
            },
        });
    }

    async sendOtp(email: string, otp: string): Promise<void> {
        try {
            const info = await this.transporter.sendMail({
                from: this.configService.get<string>('MAIL_FROM'),
                to: email,
                subject: 'Mã OTP đặt lại mật khẩu - Trắc Nghiệm',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #2563eb;">Mã OTP của bạn</h2>
                        <p style="font-size: 18px;">Mã OTP: <strong>${otp}</strong></p>
                        <p>Mã này có hiệu lực trong <strong>5 phút</strong>.</p>
                        <p>Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này.</p>
                    </div>
                `,
            });

            console.log(`✅ OTP đã gửi thành công đến ${email} | MessageId: ${info.messageId}`);
        } catch (error: any) {
            console.error('❌ Gửi email thất bại:', error.message);
            throw new Error('Không thể gửi email OTP. Vui lòng thử lại sau.');
        }
    }
}