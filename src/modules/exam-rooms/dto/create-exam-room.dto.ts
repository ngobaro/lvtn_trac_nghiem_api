import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { CheDoCauHoi } from '../../../common/enums/che-do-cau-hoi.enum';

export class CreateExamRoomDto {
  @IsInt()
  maBaiThi: number;

  @IsEnum(CheDoCauHoi)
  cheDoCauHoi: CheDoCauHoi;

  // Số câu chọn ngẫu nhiên (bắt buộc khi cheDoCauHoi = ngau_nhien)
  @IsOptional()
  @IsInt()
  @Min(1)
  soCauChon?: number;

  // Giờ kết thúc do hệ thống tự tính = moLuc + thời lượng đề thi (không nhận từ client).
  @IsDateString()
  moLuc: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  soNguoiThamGia?: number;
}
