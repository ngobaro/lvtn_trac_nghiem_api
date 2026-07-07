import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuerySemesterDto extends PaginationDto {
  // Tìm theo tên học kỳ hoặc năm học.
  @IsOptional()
  @IsString()
  search?: string;
}
