import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NguoiDung } from './entities/nguoi-dung.entity';
import { NhaCungCapXacThuc } from './entities/nha-cung-cap-xac-thuc.entity';
import { RegisterDto } from './dto/register.dto';
import { NhaCungCap } from '../../common/enums/nha-cung-cap.enum';
import { MailService } from './mail.service';
import { VaiTro } from 'src/common/enums/vai-tro.enum';

@Injectable()
export class AuthService {
    // Lưu OTP tạm trong memory (production nên dùng Redis)
    private otpStore = new Map<string, { otp: string; expires: number }>();


    constructor(
        @InjectRepository(NguoiDung) private nguoiDungRepo: Repository<NguoiDung>,
        @InjectRepository(NhaCungCapXacThuc) private xacThucRepo: Repository<NhaCungCapXacThuc>,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async register(dto: RegisterDto) {
        const exists = await this.nguoiDungRepo.findOne({ where: { email: dto.email } });
        if (exists) throw new BadRequestException('Email đã tồn tại');

        const nguoiDung = this.nguoiDungRepo.create({
            tenNguoiDung: dto.tenNguoiDung,
            // tenDangNhap: dto.tenDangNhap,
            email: dto.email,
            vaiTro: dto.vaiTro,
        });
        const saved = await this.nguoiDungRepo.save(nguoiDung);

        const hash = await bcrypt.hash(dto.matKhau, 10);
        await this.xacThucRepo.save({
            maNguoiDung: saved.maNguoiDung,
            nhaCungCap: NhaCungCap.LOCAL,
            matKhau: hash,
        });

        return this.generateTokens(saved);
    }

    async validateLocal(email: string, matKhau: string) {
        const nguoiDung = await this.nguoiDungRepo.findOne({ where: { email } });
        if (!nguoiDung) return null;
        const xacThuc = await this.xacThucRepo.findOne({
            where: { maNguoiDung: nguoiDung.maNguoiDung, nhaCungCap: NhaCungCap.LOCAL },
        });
        if (!xacThuc?.matKhau) return null;
        const ok = await bcrypt.compare(matKhau, xacThuc.matKhau);
        return ok ? nguoiDung : null;
    }

    async login(nguoiDung: NguoiDung) {
        if (!nguoiDung.laHoatDong) throw new UnauthorizedException('Tài khoản bị khóa');
        return this.generateTokens(nguoiDung);
    }

    async loginGoogle(googleUser: any) {
        console.log('🚀 loginGoogle started with:', googleUser);

        try {
            // Tìm theo googleId trước (ưu tiên), sau đó theo email
            let nguoiDung = await this.nguoiDungRepo.findOne({
                where: [
                    { email: googleUser.email }
                ]
            });

            if (!nguoiDung) {
                // Tạo user mới từ Google
                nguoiDung = this.nguoiDungRepo.create({
                    email: googleUser.email,
                    tenNguoiDung: googleUser.tenNguoiDung,
                    vaiTro: VaiTro.HOC_SINH,     // hoặc VaiTro.NGUOI_DUNG nếu bạn có enum
                    laHoatDong: true,
                });

                nguoiDung = await this.nguoiDungRepo.save(nguoiDung);
                console.log('🆕 Tạo user Google mới:', nguoiDung.maNguoiDung);

                // Lưu thông tin xác thực Google
                await this.xacThucRepo.save({
                    maNguoiDung: nguoiDung.maNguoiDung,
                    nhaCungCap: NhaCungCap.GOOGLE,
                    maNguoiDungNhaCungCap: googleUser.googleId,
                });
            } else {
                // Cập nhật thông tin nếu user đã tồn tại
                let shouldUpdate = false;
                if (googleUser.tenNguoiDung && nguoiDung.tenNguoiDung !== googleUser.tenNguoiDung) {
                    nguoiDung.tenNguoiDung = googleUser.tenNguoiDung;
                    shouldUpdate = true;
                }
                if (shouldUpdate) {
                    nguoiDung = await this.nguoiDungRepo.save(nguoiDung);
                }
                console.log('🔄 User Google đã tồn tại');
            }

            // Tạo token
            const tokens = this.generateTokens(nguoiDung);

            return {
                message: 'Đăng nhập Google thành công',
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                user: {
                    maNguoiDung: nguoiDung.maNguoiDung,
                    email: nguoiDung.email,
                    tenNguoiDung: nguoiDung.tenNguoiDung,
                    vaiTro: nguoiDung.vaiTro,
                }
            };

        } catch (error: any) {
            console.error('❌ loginGoogle Error:', error.message);
            console.error(error.stack);
            throw new Error('Lỗi khi xử lý đăng nhập Google');
        }
    }

    async refreshToken(nguoiDung: any) {
        return this.generateTokens(nguoiDung);
    }

    async getMe(maNguoiDung: number) {
        return this.nguoiDungRepo.findOne({ where: { maNguoiDung } });
    }

    async forgotPassword(email: string) {
        const user = await this.nguoiDungRepo.findOne({ where: { email } });
        if (!user) throw new BadRequestException('Email không tồn tại');
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
        await this.mailService.sendOtp(email, otp);
        return null;
    }

    async verifyOtp(email: string, otp: string) {
        const record = this.otpStore.get(email);
        if (!record || record.otp !== otp || Date.now() > record.expires)
            throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
        return null;
    }

    async resetPassword(email: string, otp: string, matKhauMoi: string) {
        await this.verifyOtp(email, otp);
        const user = await this.nguoiDungRepo.findOne({ where: { email } });
        if (!user) throw new BadRequestException('Email không tồn tại');
        const xacThuc = await this.xacThucRepo.findOne({ where: { maNguoiDung: user.maNguoiDung, nhaCungCap: NhaCungCap.LOCAL } });
        if (!xacThuc) throw new BadRequestException('Tài khoản không dùng đăng nhập local');
        xacThuc.matKhau = await bcrypt.hash(matKhauMoi, 10);
        await this.xacThucRepo.save(xacThuc);
        this.otpStore.delete(email);
        return null;
    }

    async changePassword(maNguoiDung: number, matKhauHienTai: string, matKhauMoi: string) {
        const xacThuc = await this.xacThucRepo.findOne({ where: { maNguoiDung, nhaCungCap: NhaCungCap.LOCAL } });
        if (!xacThuc) throw new BadRequestException('Tài khoản không dùng đăng nhập local');
        const ok = await bcrypt.compare(matKhauHienTai, xacThuc.matKhau);
        if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
        xacThuc.matKhau = await bcrypt.hash(matKhauMoi, 10);
        await this.xacThucRepo.save(xacThuc);
        return null;
    }

    private generateTokens(user: any) {
        const payload = { sub: user.maNguoiDung, name: user.tenNguoiDung, email: user.email, vaiTro: user.vaiTro };

        // 1. Ép kiểu rõ ràng cho object cấu hình của Access Token
        const accessTokenOptions: any = {
            secret: process.env.JWT_SECRET || 'secret',
            expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        };

        // 2. Ép kiểu rõ ràng cho object cấu hình của Refresh Token
        const refreshTokenOptions: any = {
            secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        };

        return {
            // Bây giờ bạn truyền cấu hình đã được định nghĩa rõ ràng vào, TypeScript sẽ nhận diện đúng Overload dạng Object
            accessToken: this.jwtService.sign(payload, accessTokenOptions),
            refreshToken: this.jwtService.sign(payload, refreshTokenOptions),
        };
    }
}
