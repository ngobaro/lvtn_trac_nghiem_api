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

  @IsDateString()
  moLuc: string;

  @IsDateString()
  dongLuc: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  soNguoiThamGia?: number;
}
