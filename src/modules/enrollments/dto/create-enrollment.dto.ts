import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnrollmentDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maHocSinh: number;
}
