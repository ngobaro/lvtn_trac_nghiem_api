import { IsEnum } from 'class-validator';
import { TrangThaiPhongThi } from '../../../common/enums/trang-thai-phong-thi.enum';

export class UpdateExamRoomStatusDto {
  @IsEnum(TrangThaiPhongThi)
  trangThai: TrangThaiPhongThi;
}
