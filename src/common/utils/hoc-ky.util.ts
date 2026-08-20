// Tiện ích ngày tháng của học kỳ. `daKetThuc` là giá trị TÍNH ĐỘNG (today >=
// ngayKetThuc), không phải cột trong DB — mọi module dùng chung một cách tính
// ở đây để tránh lệch nhau.

// Cột `date` của TypeORM trả về chuỗi 'YYYY-MM-DD' lúc chạy, nhưng vẫn phòng
// trường hợp nhận Date (khi vừa create/save trong bộ nhớ).
export function chuanHoaNgay(ngay: Date | string): string {
  return typeof ngay === 'string'
    ? ngay.slice(0, 10)
    : ngay.toISOString().slice(0, 10);
}

// Hôm nay theo UTC, khớp với timezone 'Z' của DataSource.
export function homNay(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daKetThuc(hocKy: { ngayKetThuc: Date | string }): boolean {
  return homNay() >= chuanHoaNgay(hocKy.ngayKetThuc);
}

// Mệnh đề lọc "học kỳ chưa kết thúc" cho QueryBuilder (alias bảng phải là
// `hocKy`). Không dùng CURDATE() của MySQL vì nó theo timezone của server DB,
// còn ở đây mọi so sánh đều theo chuỗi ngày UTC — truyền homNay() làm tham số.
export const DK_HOC_KY_CHUA_KET_THUC = 'hocKy.ngayKetThuc > :homNay';
