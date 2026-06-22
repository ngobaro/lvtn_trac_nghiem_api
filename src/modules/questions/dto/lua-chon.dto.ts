import { IsBoolean, IsNotEmpty } from 'class-validator';

export class LuaChonDto {
  @IsNotEmpty()
  noiDung: string;

  @IsBoolean()
  laDapAnDung: boolean;
}