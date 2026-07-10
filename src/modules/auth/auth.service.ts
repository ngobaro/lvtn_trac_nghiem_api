import { Injectable, BadRequestException, UnauthorizedException, Inject } from '@nestjs/common';
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
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
    // // Lưu OTP tạm trong memory (production nên dùng Redis)
    // private otpStore = new Map<string, { otp: string; expires: number }>();


    constructor(
        @InjectRepository(NguoiDung) private nguoiDungRepo: Repository<NguoiDung>,
        @InjectRepository(NhaCungCapXacThuc) private xacThucRepo: Repository<NhaCungCapXacThuc>,
        private jwtService: JwtService,
        private mailService: MailService,
        @Inject(CACHE_MANAGER) private cacheManager: any,
    ) { }

    async register(dto: RegisterDto) {
        const exists = await this.nguoiDungRepo.findOne({ where: { email: dto.email } });
        if (exists) throw new BadRequestException('Email đã tồn tại');

        const nguoiDung = await this.nguoiDungRepo.save(
            this.nguoiDungRepo.create({
                tenNguoiDung: dto.tenNguoiDung,
                email: dto.email,
                vaiTro: dto.vaiTro,
            })
        );

        const hash = await bcrypt.hash(dto.matKhau, 10);
        await this.xacThucRepo.save({
            maNguoiDung: nguoiDung.maNguoiDung,
            nhaCungCap: NhaCungCap.LOCAL,
            matKhau: hash,
        });

        return this.generateTokens(nguoiDung);
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
        const nguoiDung = await this.nguoiDungRepo.findOne({
            where: { email: googleUser.email }
        });

        // User mới → trả tempToken để frontend chuyển trang chọn vai trò
        if (!nguoiDung) {
            const tempToken = this.generateTempToken(
                googleUser.email,
                googleUser.googleId,
                googleUser.tenNguoiDung,
            );
            return {
                needSelectRole: true,
                tempToken,
                user: {
                    email: googleUser.email,
                    tenNguoiDung: googleUser.tenNguoiDung,
                }
            };
        }

        // User cũ → cập nhật tên nếu thay đổi, đăng nhập bình thường
        if (googleUser.tenNguoiDung && nguoiDung.tenNguoiDung !== googleUser.tenNguoiDung) {
            nguoiDung.tenNguoiDung = googleUser.tenNguoiDung;
            await this.nguoiDungRepo.save(nguoiDung);
        }

        return {
            needSelectRole: false,
            ...this.generateTokens(nguoiDung),
            user: {
                maNguoiDung: nguoiDung.maNguoiDung,
                email: nguoiDung.email,
                tenNguoiDung: nguoiDung.tenNguoiDung,
                vaiTro: nguoiDung.vaiTro,
            }
        };
    }

    async confirmRoleGoogle(tempToken: string, vaiTro: VaiTro) {
        // Validate vai trò được phép chọn
        const allowedRoles = [VaiTro.HOC_SINH, VaiTro.GIAO_VIEN];
        if (!allowedRoles.includes(vaiTro)) {
            throw new BadRequestException('Vai trò không hợp lệ');
        }

        // Verify tempToken
        let payload: any;
        try {
            payload = this.jwtService.verify(tempToken, { secret: process.env.JWT_SECRET });
        } catch {
            throw new UnauthorizedException('Token tạm thời không hợp lệ hoặc đã hết hạn');
        }

        if (payload.purpose !== 'select_role') {
            throw new UnauthorizedException('Token không đúng mục đích');
        }

        // Kiểm tra tài khoản chưa tồn tại (tránh race condition)
        const existing = await this.nguoiDungRepo.findOne({ where: { email: payload.email } });
        if (existing) {
            throw new BadRequestException('Tài khoản đã tồn tại, vui lòng đăng nhập lại');
        }

        // Tạo user với vai trò đã chọn
        const nguoiDung = await this.nguoiDungRepo.save(
            this.nguoiDungRepo.create({
                email: payload.email,
                tenNguoiDung: payload.tenNguoiDung,
                vaiTro,
                laHoatDong: true,
            })
        );

        // Lưu xác thực Google
        await this.xacThucRepo.save({
            maNguoiDung: nguoiDung.maNguoiDung,
            nhaCungCap: NhaCungCap.GOOGLE,
            maNguoiDungNhaCungCap: payload.googleId,
        });

        return {
            ...this.generateTokens(nguoiDung),
            user: {
                maNguoiDung: nguoiDung.maNguoiDung,
                email: nguoiDung.email,
                tenNguoiDung: nguoiDung.tenNguoiDung,
                vaiTro: nguoiDung.vaiTro,
            }
        };
    }

    async refreshToken(nguoiDung: any) {
        return this.generateTokens(nguoiDung);
    }



    async forgotPassword(email: string) {
        const user = await this.nguoiDungRepo.findOne({ where: { email } });
        if (!user) throw new BadRequestException('Email không tồn tại');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        //  Lưu OTP vào Redis (không dùng namespace)
        await this.cacheManager.set(`otp:${email}`, otp, 5 * 60 * 1000);

        // Kiểm tra
        const check = await this.cacheManager.get(`otp:${email}`);
        console.log(' OTP stored in Redis:', check);
        console.log(' Check type:', typeof check);

        await this.mailService.sendOtp(email, otp);
        return { message: 'OTP đã được gửi đến email' };
    }

    // Không expose ra route riêng: resetPassword tự xác thực OTP trong cùng 1 lần gọi.
    private async verifyOtp(email: string, otp: string) {
        const key = `otp:${email}`;
        const stored = await this.cacheManager.get(key);

        if (!stored) {
            throw new BadRequestException('OTP đã hết hạn hoặc không tồn tại');
        }
        if (stored !== otp) {
            throw new BadRequestException('OTP không đúng');
        }
        return null;
    }

    async resetPassword(email: string, otp: string, matKhauMoi: string) {
        await this.verifyOtp(email, otp);

        const user = await this.nguoiDungRepo.findOne({ where: { email } });
        if (!user) throw new BadRequestException('Email không tồn tại');

        const xacThuc = await this.xacThucRepo.findOne({
            where: { maNguoiDung: user.maNguoiDung, nhaCungCap: NhaCungCap.LOCAL }
        });
        if (!xacThuc) throw new BadRequestException('Tài khoản không dùng đăng nhập local');

        xacThuc.matKhau = await bcrypt.hash(matKhauMoi, 10);
        await this.xacThucRepo.save(xacThuc);

        await this.cacheManager.del(`otp:${email}`);

        return { message: 'Đặt lại mật khẩu thành công' };
    }

    async changePassword(maNguoiDung: number, matKhauHienTai: string, matKhauMoi: string) {
        const xacThuc = await this.xacThucRepo.findOne({
            where: { maNguoiDung, nhaCungCap: NhaCungCap.LOCAL }
        });
        if (!xacThuc?.matKhau) {
            throw new BadRequestException(
                'Tài khoản đăng nhập bằng Google không thể đổi mật khẩu',
            );
        }

        const ok = await bcrypt.compare(matKhauHienTai, xacThuc.matKhau);
        if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');

        xacThuc.matKhau = await bcrypt.hash(matKhauMoi, 10);
        await this.xacThucRepo.save(xacThuc);
        return null;
    }

    async getMe(maNguoiDung: number) {
        const nguoiDung = await this.nguoiDungRepo.findOne({ where: { maNguoiDung } });
        if (!nguoiDung) return null;

        // Chỉ tài khoản có xác thực LOCAL (đã đặt mật khẩu) mới đổi được mật khẩu.
        // Tài khoản đăng nhập Google không có bản ghi LOCAL -> coMatKhau = false.
        const xacThucLocal = await this.xacThucRepo.findOne({
            where: { maNguoiDung, nhaCungCap: NhaCungCap.LOCAL },
        });

        return { ...nguoiDung, coMatKhau: !!xacThucLocal?.matKhau };
    }

    private generateTokens(user: any) {
        const payload = {
            sub: user.maNguoiDung,
            name: user.tenNguoiDung,
            email: user.email,
            vaiTro: user.vaiTro,
        };
        return {
            accessToken: this.jwtService.sign(payload, {
                secret: process.env.JWT_SECRET,
                expiresIn: process.env.JWT_EXPIRES_IN || '15m',
            } as any),
            refreshToken: this.jwtService.sign(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            } as any),
        };
    }

    private generateTempToken(email: string, googleId: string, tenNguoiDung: string): string {
        return this.jwtService.sign(
            { email, googleId, tenNguoiDung, purpose: 'select_role' },
            { secret: process.env.JWT_SECRET, expiresIn: '10m' } as any
        );
    }
}
