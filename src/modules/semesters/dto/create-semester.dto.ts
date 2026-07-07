import { IsNotEmpty, IsDateString, MaxLength } from 'class-validator';

export class CreateSemesterDto {
  @IsNotEmpty({ message: 'Tên học kỳ là bắt buộc' })
  @MaxLength(100, { message: 'Tên học kỳ không được vượt quá 100 ký tự' })
  tenHocKy: string;

  @IsNotEmpty({ message: 'Năm học là bắt buộc' })
  @MaxLength(20, { message: 'Năm học không được vượt quá 20 ký tự' })
  namHoc: string;

  @IsNotEmpty({ message: 'Ngày bắt đầu là bắt buộc' })
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  ngayBatDau: string;

  @IsNotEmpty({ message: 'Ngày kết thúc là bắt buộc' })
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  ngayKetThuc: string;
}
