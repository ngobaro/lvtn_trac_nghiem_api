import { IsNotEmpty, IsString, Length } from 'class-validator';

export class JoinByCodeDto {
  // Mã tham gia phòng thi (6 ký tự), học sinh tự nhập ở trang danh sách phòng.
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mã tham gia' })
  @Length(4, 8, { message: 'Mã tham gia không hợp lệ' })
  maThamGia: string;
}
