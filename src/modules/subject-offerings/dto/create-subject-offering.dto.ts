import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubjectOfferingDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maMonHoc: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  maHocKy: number;
}
