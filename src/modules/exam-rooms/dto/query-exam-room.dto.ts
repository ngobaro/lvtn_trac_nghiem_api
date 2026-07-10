import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
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

  // Lọc theo trạng thái xóa mềm. Vắng = chỉ phòng đang hoạt động (mặc định);
  // false = phòng đã xóa mềm (phục vụ trang thùng rác của Admin).
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  laHoatDong?: boolean;
}
