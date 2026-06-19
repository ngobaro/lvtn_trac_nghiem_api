import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NguoiDung } from '../auth/entities/nguoi-dung.entity';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(NguoiDung) private repo: Repository<NguoiDung>) {}

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 20, vaiTro, laHoatDong, search } = query;
    const qb = this.repo.createQueryBuilder('u');
    if (vaiTro) qb.andWhere('u.vaiTro = :vaiTro', { vaiTro });
    if (laHoatDong !== undefined) qb.andWhere('u.laHoatDong = :laHoatDong', { laHoatDong });
    if (search) qb.andWhere('(u.tenNguoiDung LIKE :s OR u.email LIKE :s)', { s: `%${search}%` });
    const [items, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const user = await this.repo.findOne({ where: { maNguoiDung: id } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async updateStatus(id: number, laHoatDong: boolean) {
    const user = await this.findOne(id);
    user.laHoatDong = laHoatDong;
    return this.repo.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    // TODO: kiểm tra ràng buộc BAI_LAM đang diễn ra
    await this.repo.remove(user);
    return null;
  }
}
