import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrangThaiBaiThi } from '../../../common/enums/trang-thai-bai-thi.enum';
import { ExamQuestionOrderDto } from './exam-question-order.dto';

export class CreateExamDto {
  @IsNotEmpty()
  tieuDe: string;

  // Môn-học-kỳ mà GV được phân dạy.
  @IsInt()
  maMonHocHocKy: number;

  @IsInt()
  @Min(1)
  thoiGianLamBai: number;

  @IsOptional()
  @IsEnum(TrangThaiBaiThi)
  trangThai?: TrangThaiBaiThi;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionOrderDto)
  cauHois: ExamQuestionOrderDto[];
}
