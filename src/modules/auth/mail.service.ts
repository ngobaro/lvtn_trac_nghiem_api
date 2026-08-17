// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as nodemailer from 'nodemailer';

// @Injectable()
// export class MailService {
//     private transporter;

//     constructor(private configService: ConfigService) {
//         // Log để kiểm tra config
//         console.log('Mail Service Initialized with:', {
//             user: this.configService.get<string>('MAIL_USER'),
//             from: this.configService.get<string>('MAIL_FROM'),
//             passExists: !!this.configService.get<string>('MAIL_PASS'),
//         });

//         this.transporter = nodemailer.createTransport({
//             service: 'gmail',   // Cách đơn giản và ổn định nhất

//             auth: {
//                 user: this.configService.get<string>('MAIL_USER'),
//                 pass: this.configService.get<string>('MAIL_PASS'),
//             },
//         });
//     }

//     async sendOtp(email: string, otp: string): Promise<void> {
//         try {
//             const info = await this.transporter.sendMail({
//                 from: this.configService.get<string>('MAIL_FROM'),
//                 to: email,
//                 subject: 'Mã OTP đặt lại mật khẩu - Trắc Nghiệm',
//                 html: `
//                     <div style="font-family: Arial, sans-serif; padding: 20px;">
//                         <h2 style="color: #2563eb;">Mã OTP của bạn</h2>
//                         <p style="font-size: 18px;">Mã OTP: <strong>${otp}</strong></p>
//                         <p>Mã này có hiệu lực trong <strong>5 phút</strong>.</p>
//                         <p>Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này.</p>
//                     </div>
//                 `,
//             });

//             console.log(`OTP đã gửi thành công đến ${email} | MessageId: ${info.messageId}`);
//         } catch (error: any) {
//             console.error('Gửi email thất bại:', error.message);
//             throw new Error('Không thể gửi email OTP. Vui lòng thử lại sau.');
//         }
//     }
// }

//npm install resend


import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
    private resend: Resend;

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('RESEND_API_KEY');
        
        console.log('Mail Service Initialized with Resend API Key exists:', !!apiKey);

        // Khởi tạo SDK Resend dùng HTTP API (Port 443 - Không lo bị Render chặn)
        this.resend = new Resend(apiKey);
    }

    async sendOtp(email: string, otp: string): Promise<void> {
        try {
            // Nếu chưa verify domain riêng trên Resend, dùng 'onboarding@resend.dev' làm sender mặc định
            const fromAddress = this.configService.get<string>('MAIL_FROM') || 'onboarding@resend.dev';

            const { data, error } = await this.resend.emails.send({
                from: fromAddress,
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

            if (error) {
                console.error('Gửi email thất bại từ Resend:', error.message);
                throw new Error(error.message);
            }

            console.log(`OTP đã gửi thành công đến ${email} | Email ID: ${data?.id}`);
        } catch (error: any) {
            console.error('Lỗi MailService:', error.message);
            throw new Error('Không thể gửi email OTP. Vui lòng thử lại sau.');
        }
    }
}