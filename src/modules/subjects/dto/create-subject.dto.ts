import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty()
  @MaxLength(100, { message: 'Tên môn học không được vượt quá 100 ký tự' })
  tenMonHoc: string;

  @IsOptional()
  @IsString()
  moTa?: string;
}