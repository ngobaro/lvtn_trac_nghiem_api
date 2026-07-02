import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryResultRoomDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maBaiThi?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHoc?: number;

  // Tìm theo mã tham gia phòng hoặc tiêu đề đề thi.
  @IsOptional()
  @IsString()
  search?: string;
}
