import {
  IsNotEmpty,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateSemesterDto {
  @IsNotEmpty()
  @MaxLength(100, { message: 'Tên học kỳ không được vượt quá 100 ký tự' })
  tenHocKy: string;

  @IsNotEmpty()
  @MaxLength(20, { message: 'Năm học không được vượt quá 20 ký tự' })
  namHoc: string;

  @IsOptional()
  @IsDateString()
  ngayBatDau?: string;

  @IsOptional()
  @IsDateString()
  ngayKetThuc?: string;
}
