import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryResultStatsDto {
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
  maMonHoc?: number;
}
