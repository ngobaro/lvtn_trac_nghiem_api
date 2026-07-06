import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTeachingAssignmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maGiaoVien?: number;
}
