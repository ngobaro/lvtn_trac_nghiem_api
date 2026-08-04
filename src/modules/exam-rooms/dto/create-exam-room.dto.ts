import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { CheDoCauHoi } from '../../../common/enums/che-do-cau-hoi.enum';
import { HinhThucThamGia } from '../../../common/enums/hinh-thuc-tham-gia.enum';

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

  // Hình thức tham gia: Admin gán tay danh sách, hoặc sinh mã cho HS tự nhập.
  @IsEnum(HinhThucThamGia)
  hinhThucThamGia: HinhThucThamGia;

  // Danh sách học sinh được gán vào phòng — chỉ dùng khi hinhThucThamGia =
  // GAN_HOC_SINH (service bắt buộc không rỗng ở chế độ đó). HS chỉ thấy phòng
  // mình có mặt; mỗi HS chỉ ở 1 phòng của mỗi môn-học-kỳ.
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  maHocSinhs?: number[];

  @IsEnum(CheDoCauHoi)
  cheDoCauHoi: CheDoCauHoi;

  // Thời lượng làm bài (phút). Giờ đóng phòng = moLuc + thoiGianLamBai.
  @IsInt()
  @Min(1)
  thoiGianLamBai: number;

  @IsDateString()
  moLuc: string;
}
