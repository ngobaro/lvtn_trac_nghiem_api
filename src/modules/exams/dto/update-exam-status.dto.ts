import { IsEnum } from 'class-validator';
import { TrangThaiBaiThi } from '../../../common/enums/trang-thai-bai-thi.enum';

export class UpdateExamStatusDto {
  @IsEnum(TrangThaiBaiThi)
  trangThai: TrangThaiBaiThi;
}
