import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DoKho } from '../../../common/enums/do-kho.enum';
import { LoaiCauHoi } from '../../../common/enums/loai-cau-hoi.enum';

export class QueryQuestionDto extends PaginationDto {
  // Tìm theo nội dung câu hỏi.
  @IsOptional()
  @IsString()
  search?: string;

  // Lọc theo môn học.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHoc?: number;

  // Lọc theo độ khó.
  @IsOptional()
  @IsEnum(DoKho)
  doKho?: DoKho;

  // Lọc theo loại đáp án (một / nhiều đáp án).
  @IsOptional()
  @IsEnum(LoaiCauHoi)
  loaiCauHoi?: LoaiCauHoi;
}
