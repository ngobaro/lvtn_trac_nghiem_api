import { DoKho } from '../../../common/enums/do-kho.enum';
import { LoaiCauHoi } from '../../../common/enums/loai-cau-hoi.enum';

// Lựa chọn ở dạng nháp (kết quả AI), chưa lưu DB.
export class LuaChonNhapDto {
    noiDung: string;
    laDapAnDung: boolean;
}

// Câu hỏi ở dạng nháp do AI trích xuất, CHỈ trả về FE để xem trước & chỉnh sửa.
// Không có maMonHoc (FE gắn môn học đã chọn trước khi lưu) và không ghi vào DB.
export class CauHoiNhapDto {
    noiDung: string;
    doKho: DoKho;
    loaiCauHoi: LoaiCauHoi;
    luaChons: LuaChonNhapDto[];
}
