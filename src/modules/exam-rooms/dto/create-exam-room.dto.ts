import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { CheDoCauHoi } from '../../../common/enums/che-do-cau-hoi.enum';

export class CreateExamRoomDto {
  // Môn-học-kỳ mà phòng phục vụ.
  @IsInt()
  maMonHocHocKy: number;

  @IsNotEmpty()
  @MaxLength(150, { message: 'Tên phòng thi không được vượt quá 150 ký tự' })
  tenPhongThi: string;

  // Danh sách đề thi đưa vào phòng (bốc ngẫu nhiên 1 đề cho mỗi học sinh).
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  maBaiThis: number[];

  // Danh sách học sinh được gán vào phòng (bắt buộc). HS chỉ thấy phòng mình
  // được gán; mỗi HS chỉ được gán 1 phòng của mỗi môn-học-kỳ.
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  maHocSinhs: number[];

  @IsEnum(CheDoCauHoi)
  cheDoCauHoi: CheDoCauHoi;

  // Thời lượng làm bài (phút). Giờ đóng phòng = moLuc + thoiGianLamBai.
  @IsInt()
  @Min(1)
  thoiGianLamBai: number;

  @IsDateString()
  moLuc: string;
}
