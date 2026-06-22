import { IsInt, Min } from 'class-validator';

export class ExamQuestionOrderDto {
  @IsInt()
  maCauHoi: number;

  @IsInt()
  @Min(1)
  thuTu: number;
}
