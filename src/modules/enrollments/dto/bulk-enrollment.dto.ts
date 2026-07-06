import { ArrayNotEmpty, IsArray, IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkEnrollmentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy: number;

  // Danh sách mã học sinh cần ghi danh cùng lúc.
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  maHocSinhs: number[];
}
