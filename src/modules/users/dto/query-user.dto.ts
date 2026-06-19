import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { VaiTro } from '../../../common/enums/vai-tro.enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QueryUserDto extends PaginationDto {
  @IsOptional() @IsEnum(VaiTro) vaiTro?: VaiTro;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() laHoatDong?: boolean;
  @IsOptional() @IsString() search?: string;
}
