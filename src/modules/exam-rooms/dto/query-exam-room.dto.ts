import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TrangThaiPhongThi } from '../../../common/enums/trang-thai-phong-thi.enum';

export class QueryExamRoomDto extends PaginationDto {
  // Tìm theo tên đề thi của phòng.
  @IsOptional()
  @IsString()
  search?: string;

  // Lọc theo môn học (của đề thi).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHoc?: number;

  // Lọc theo trạng thái phòng thi.
  @IsOptional()
  @IsEnum(TrangThaiPhongThi)
  trangThai?: TrangThaiPhongThi;
}
