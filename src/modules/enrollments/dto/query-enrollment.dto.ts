import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEnrollmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maHocSinh?: number;
}
