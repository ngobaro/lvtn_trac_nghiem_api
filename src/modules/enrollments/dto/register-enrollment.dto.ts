import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

// Học sinh tự đăng ký: chỉ cần môn-học-kỳ, mã học sinh lấy từ token.
export class RegisterEnrollmentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy: number;
}
