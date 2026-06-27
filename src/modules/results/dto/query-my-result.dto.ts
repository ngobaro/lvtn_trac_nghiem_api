import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryMyResultDto extends PaginationDto {
  // Tìm theo tên đề thi.
  @IsOptional()
  @IsString()
  search?: string;

  // Lọc theo môn học.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHoc?: number;
}
