import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ExamSessionsService } from './exam-sessions.service';
import { TrangThaiBaiLam } from '../../common/enums/trang-thai-bai-lam.enum';

@WebSocketGateway({ namespace: 'exam-sessions', cors: { origin: '*' } })
export class ExamSessionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ExamSessionsGateway.name);

  // Mỗi bài làm chỉ chạy 1 timer dùng chung, đếm số client đang kết nối
  private timers = new Map<number, NodeJS.Timeout>();
  private refCount = new Map<number, number>();

  constructor(
    private examSessionsService: ExamSessionsService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.query?.token as string);
      const maBaiLam = Number(client.handshake.query?.maBaiLam);
      if (!token || !maBaiLam) {
        throw new Error('Thiếu token hoặc maBaiLam');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      const maNguoiDung = payload.sub;

      // Xác thực quyền truy cập bài làm
      await this.examSessionsService.xacThucPhien(maBaiLam, maNguoiDung);

      client.data.maBaiLam = maBaiLam;
      client.data.maNguoiDung = maNguoiDung;
      await client.join(this.room(maBaiLam));

      // Gửi ngay trạng thời gian hiện tại (đồng bộ lại sau khi reconnect)
      const tt = await this.examSessionsService.trangThaiThoiGian(maBaiLam);
      if (tt) client.emit('timer_tick', { conLaiGiay: tt.conLaiGiay });

      this.startTimer(maBaiLam);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const maBaiLam = client.data?.maBaiLam as number | undefined;
    if (!maBaiLam) return;

    const count = (this.refCount.get(maBaiLam) ?? 1) - 1;
    if (count <= 0) {
      this.stopTimer(maBaiLam);
    } else {
      this.refCount.set(maBaiLam, count);
    }
  }

  private room(maBaiLam: number) {
    return `bailam:${maBaiLam}`;
  }

  private startTimer(maBaiLam: number) {
    this.refCount.set(maBaiLam, (this.refCount.get(maBaiLam) ?? 0) + 1);
    if (this.timers.has(maBaiLam)) return;

    let dangXuLy = false;
    const interval = setInterval(() => {
      if (dangXuLy) return;
      dangXuLy = true;
      void this.tick(maBaiLam).finally(() => {
        dangXuLy = false;
      });
    }, 1000);
    this.timers.set(maBaiLam, interval);
  }

  private stopTimer(maBaiLam: number) {
    const interval = this.timers.get(maBaiLam);
    if (interval) clearInterval(interval);
    this.timers.delete(maBaiLam);
    this.refCount.delete(maBaiLam);
  }

  private async tick(maBaiLam: number) {
    const tt = await this.examSessionsService.trangThaiThoiGian(maBaiLam);
    if (!tt) {
      this.stopTimer(maBaiLam);
      return;
    }

    // Đã nộp (thủ công) ở nơi khác -> dừng đếm
    if (tt.trangThai !== TrangThaiBaiLam.DANG_LAM) {
      this.stopTimer(maBaiLam);
      return;
    }

    this.server.to(this.room(maBaiLam)).emit('timer_tick', {
      conLaiGiay: tt.conLaiGiay,
    });

    if (tt.conLaiGiay <= 0) {
      const ketQua = await this.examSessionsService.autoSubmit(maBaiLam);
      this.server.to(this.room(maBaiLam)).emit('time_up', { ketQua });
      this.stopTimer(maBaiLam);
      this.logger.log(`Bài làm ${maBaiLam} hết giờ, đã tự động nộp`);
    }
  }
}
