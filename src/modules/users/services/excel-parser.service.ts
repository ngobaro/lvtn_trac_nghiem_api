import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

// Regex email cơ bản, dùng để nhận diện dòng tiêu đề (header).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DongDanhSach {
  tenNguoiDung: string;
  email: string;
}

@Injectable()
export class ExcelParserService {
  // Đọc file .xlsx từ buffer -> danh sách { tenNguoiDung, email }.
  // Chỉ lấy 2 cột đầu của sheet đầu tiên; tự bỏ dòng tiêu đề và dòng rỗng.
  docDanhSach(file: Express.Multer.File): DongDanhSach[] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Không đọc được file Excel');
    }

    const tenSheet = workbook.SheetNames[0];
    if (!tenSheet) throw new BadRequestException('File Excel không có sheet nào');

    const sheet = workbook.Sheets[tenSheet];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    });

    if (rows.length === 0) {
      throw new BadRequestException('File Excel không có dữ liệu');
    }

    // Bỏ dòng tiêu đề: nếu cột thứ 2 (email) của dòng đầu không dạng email.
    let batDau = 0;
    const emailDauTien = String(rows[0]?.[1] ?? '').trim();
    if (!EMAIL_REGEX.test(emailDauTien)) batDau = 1;

    const danhSach: DongDanhSach[] = [];
    for (let i = batDau; i < rows.length; i++) {
      const row = rows[i];
      const tenNguoiDung = String(row?.[0] ?? '').trim();
      const email = String(row?.[1] ?? '')
        .trim()
        .toLowerCase();
      // Bỏ dòng rỗng hoàn toàn.
      if (!tenNguoiDung && !email) continue;
      danhSach.push({ tenNguoiDung, email });
    }

    if (danhSach.length === 0) {
      throw new BadRequestException('File Excel không có dữ liệu');
    }

    return danhSach;
  }
}
