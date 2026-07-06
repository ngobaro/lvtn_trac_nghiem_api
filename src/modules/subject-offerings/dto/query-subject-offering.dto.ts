import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuerySubjectOfferingDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maHocKy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHoc?: number;

  // Tìm theo tên môn học.
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  laHoatDong?: boolean;
}
