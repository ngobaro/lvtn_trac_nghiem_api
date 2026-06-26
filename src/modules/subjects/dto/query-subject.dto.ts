import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuerySubjectDto extends PaginationDto {
  // Tìm theo tên môn hoặc mã định danh.
  @IsOptional()
  @IsString()
  search?: string;

  // Lọc theo trạng thái hoạt động (?laHoatDong=true|false).
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  laHoatDong?: boolean;
}
