import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsEnum,
  IsIn,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VaiTro } from '../../../common/enums/vai-tro.enum';

// Một dòng trong file import. Để lỏng (chỉ @IsString) — dòng sai email/thiếu tên
// KHÔNG làm 400 cả request; service tự kiểm tra, bỏ qua và báo cáo từng dòng.
export class ImportUserRowDto {
  @IsString()
  tenNguoiDung: string;

  @IsString()
  email: string;
}

export class ImportUsersDto {
  // Vai trò áp cho toàn bộ file. Chặn tạo Quản trị viên qua import.
  @IsEnum(VaiTro, { message: 'Vai trò không hợp lệ' })
  @IsIn([VaiTro.HOC_SINH, VaiTro.GIAO_VIEN], {
    message: 'Chỉ được import tài khoản Học sinh hoặc Giáo viên',
  })
  vaiTro: VaiTro;

  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách import không được rỗng' })
  @ValidateNested({ each: true })
  @Type(() => ImportUserRowDto)
  danhSach: ImportUserRowDto[];
}
