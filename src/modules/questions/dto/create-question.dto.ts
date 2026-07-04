import { IsArray, IsEnum, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DoKho } from '../../../common/enums/do-kho.enum';
import { LoaiCauHoi } from '../../../common/enums/loai-cau-hoi.enum';
import { LuaChonDto } from './lua-chon.dto';

export class CreateQuestionDto {
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  noiDung: string;

  @IsNumber()
  maMonHoc: number;

  @IsEnum(DoKho)
  doKho: DoKho;

  @IsEnum(LoaiCauHoi)
  loaiCauHoi: LoaiCauHoi;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LuaChonDto)
  luaChons: LuaChonDto[];
}