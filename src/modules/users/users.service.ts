import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { NhaCungCapXacThuc } from '../auth/entities/nha-cung-cap-xac-thuc.entity';
import { NhaCungCap } from '../../common/enums/nha-cung-cap.enum';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Mật khẩu mặc định khi Admin tạo tài khoản mà không nhập mật khẩu.
const MAT_KHAU_MAC_DINH = '123456';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(NguoiDung) private repo: Repository<NguoiDung>,
    @InjectRepository(NhaCungCapXacThuc)
    private xacThucRepo: Repository<NhaCungCapXacThuc>,
  ) {}

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, vaiTro, laHoatDong, search } = query;
    const qb = this.repo.createQueryBuilder('u');
    if (vaiTro) qb.andWhere('u.vaiTro = :vaiTro', { vaiTro });
    if (laHoatDong !== undefined)
      qb.andWhere('u.laHoatDong = :laHoatDong', { laHoatDong });
    if (search)
      qb.andWhere('(u.tenNguoiDung LIKE :s OR u.email LIKE :s)', {
        s: `%${search}%`,
      });
    const [items, total] = await qb
      .orderBy('u.maNguoiDung', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { maNguoiDung: id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email đã tồn tại');

    const nguoiDung = await this.repo.save(
      this.repo.create({
        tenNguoiDung: dto.tenNguoiDung,
        email: dto.email,
        vaiTro: dto.vaiTro,
      }),
    );

    // Tạo xác thực LOCAL với mật khẩu đã cho hoặc mật khẩu mặc định.
    const hash = await bcrypt.hash(dto.matKhau || MAT_KHAU_MAC_DINH, 10);
    await this.xacThucRepo.save({
      maNguoiDung: nguoiDung.maNguoiDung,
      nhaCungCap: NhaCungCap.LOCAL,
      matKhau: hash,
    });

    return nguoiDung;
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.findOne(id);
    return this.repo.save({ ...user, ...dto });
  }

  async updateStatus(id: number, laHoatDong: boolean) {
    const user = await this.findOne(id);
    user.laHoatDong = laHoatDong;
    return this.repo.save(user);
  }

  // Xóa mềm: khóa tài khoản, giữ dữ liệu tham chiếu (đề/kết quả/ghi danh).
  async remove(id: number) {
    const user = await this.findOne(id);
    user.laHoatDong = false;
    await this.repo.save(user);
    return null;
  }
}
