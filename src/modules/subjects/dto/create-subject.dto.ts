import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Mã môn không được vượt quá 50 ký tự' })
  maMon?: string;

  @IsNotEmpty()
  @MaxLength(100, { message: 'Tên môn học không được vượt quá 100 ký tự' })
  tenMonHoc: string;

  @IsOptional()
  @IsString()
  moTa?: string;
}
