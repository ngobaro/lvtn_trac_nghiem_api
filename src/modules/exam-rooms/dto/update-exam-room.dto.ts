import { PartialType } from '@nestjs/mapped-types';
import { CreateExamRoomDto } from './create-exam-room.dto';

// Cho sửa mọi trường của phòng (tên, đề, chế độ, thời lượng, giờ mở, sĩ số).
// maMonHocHocKy không nên đổi sau khi tạo — service sẽ bỏ qua nếu gửi kèm.
export class UpdateExamRoomDto extends PartialType(CreateExamRoomDto) {}
