import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TrangThaiBaiThi } from '../../../common/enums/trang-thai-bai-thi.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryExamDto extends PaginationDto {
  // Tìm theo tiêu đề đề thi.
  @IsOptional()
  @IsString()
  search?: string;

  // Lọc đề thi theo môn-học-kỳ.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy?: number;

  // Lọc theo trạng thái (nhap | cong_khai).
  @IsOptional()
  @IsEnum(TrangThaiBaiThi)
  trangThai?: TrangThaiBaiThi;
}
