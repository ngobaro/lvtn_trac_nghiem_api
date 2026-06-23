import { IsArray, IsInt, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  maCauHoi: number;

  // Danh sách lựa chọn đã chọn. Rỗng = bỏ qua câu hỏi.
  // Câu 1 đáp án: tối đa 1 phần tử; câu nhiều đáp án: nhiều phần tử.
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  maLuaChons?: number[] = [];
}
