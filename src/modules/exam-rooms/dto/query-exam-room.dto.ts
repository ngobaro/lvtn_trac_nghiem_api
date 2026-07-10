import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { TrangThaiPhongThi } from '../../../common/enums/trang-thai-phong-thi.enum';

export class QueryExamRoomDto extends PaginationDto {
  // Tìm theo tên phòng thi.
  @IsOptional()
  @IsString()
  search?: string;

  // Lọc theo môn-học-kỳ.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maMonHocHocKy?: number;

  // Lọc theo trạng thái phòng thi.
  @IsOptional()
  @IsEnum(TrangThaiPhongThi)
  trangThai?: TrangThaiPhongThi;
}
