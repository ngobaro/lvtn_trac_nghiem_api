import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// Query cho GET /exam-rooms/assigned-students: HS đã gán trong 1 môn-học-kỳ,
// loại trừ phòng đang sửa (excludePhongThi).
export class QueryAssignedStudentsDto {
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  excludePhongThi?: number;
}
