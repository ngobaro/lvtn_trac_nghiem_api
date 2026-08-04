import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class JoinRoomDto {
  // Vào phòng theo mã phòng (số). Quyền vào dựa trên PHONG_THI_HOC_SINH — do
  // Admin gán hoặc do HS đã nhập mã tham gia ở POST /exam-rooms/join-by-code.
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maPhongThi: number;
}
