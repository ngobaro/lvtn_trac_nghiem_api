import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class JoinRoomDto {
  // Vào phòng theo mã phòng (không còn nhập mã tham gia); quyền vào dựa trên ghi danh.
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maPhongThi: number;
}
