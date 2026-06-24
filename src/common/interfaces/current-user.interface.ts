import { VaiTro } from '../enums/vai-tro.enum';

// Payload user gắn vào request từ JWT
export interface CurrentUserPayload {
  maNguoiDung: number;
  email: string;
  vaiTro: VaiTro;
}
