import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkTeachingAssignmentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy: number;

  // Danh sách mã giáo viên cần phân công cùng lúc.
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  maGiaoViens: number[];
}
