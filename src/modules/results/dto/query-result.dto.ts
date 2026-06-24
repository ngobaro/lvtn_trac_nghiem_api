import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryResultDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maBaiThi?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maPhongThi?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maNguoiDung?: number;
}
