import {
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI, Type } from '@google/genai';
import { DoKho } from '../../../common/enums/do-kho.enum';
import { LoaiCauHoi } from '../../../common/enums/loai-cau-hoi.enum';
import { CauHoiNhapDto } from '../dto/cau-hoi-nhap.dto';

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name);
    private readonly apiKey = process.env.GEMINI_API_KEY || '';
    private readonly model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // Schema ép Gemini trả về đúng cấu trúc câu hỏi nháp (JSON).
    private readonly schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                noiDung: { type: Type.STRING, description: 'Nội dung câu hỏi' },
                doKho: {
                    type: Type.STRING,
                    enum: Object.values(DoKho),
                    description: 'Độ khó: de | trung_binh | kho',
                },
                loaiCauHoi: {
                    type: Type.STRING,
                    enum: Object.values(LoaiCauHoi),
                    description: 'mot_dap_an nếu chỉ 1 đáp án đúng, nhieu_dap_an nếu từ 2',
                },
                luaChons: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            noiDung: { type: Type.STRING, description: 'Nội dung lựa chọn' },
                            laDapAnDung: {
                                type: Type.BOOLEAN,
                                description: 'true nếu là đáp án đúng',
                            },
                        },
                        propertyOrdering: ['noiDung', 'laDapAnDung'],
                        required: ['noiDung', 'laDapAnDung'],
                    },
                },
            },
            propertyOrdering: ['noiDung', 'doKho', 'loaiCauHoi', 'luaChons'],
            required: ['noiDung', 'doKho', 'loaiCauHoi', 'luaChons'],
        },
    };

    private readonly huongDan = [
        'Bạn là trợ lý trích xuất câu hỏi trắc nghiệm từ văn bản.',
        'Chỉ TRÍCH XUẤT các câu hỏi trắc nghiệm ĐÃ CÓ SẴN trong văn bản, TUYỆT ĐỐI không tự bịa thêm câu hỏi hay lựa chọn mới.',
        'Mỗi câu hỏi gồm nội dung và danh sách các lựa chọn.',
        'Xác định đáp án đúng nếu văn bản có đánh dấu (in đậm, dấu *, gạch chân, hoặc dòng "Đáp án: A/B/C/D"). Đặt laDapAnDung=true cho lựa chọn tương ứng.',
        'Nếu không xác định được đáp án đúng cho một câu thì để tất cả lựa chọn của câu đó laDapAnDung=false.',
        'loaiCauHoi = mot_dap_an nếu có đúng 1 đáp án đúng; nhieu_dap_an nếu có từ 2 đáp án đúng trở lên.',
        'doKho mặc định trung_binh nếu văn bản không nói rõ.',
        'Không thêm tiền tố "A.", "B.", "Câu 1:" vào nội dung; chỉ giữ nội dung thuần.',
        'Nếu văn bản không chứa câu hỏi trắc nghiệm nào, trả về mảng rỗng [].',
    ].join('\n');

    async trichXuatCauHoi(vanBan: string): Promise<CauHoiNhapDto[]> {
        if (!this.apiKey)
            throw new ServiceUnavailableException(
                'Chưa cấu hình GEMINI_API_KEY trên máy chủ',
            );

        const ai = new GoogleGenAI({ apiKey: this.apiKey });

        let raw: string | undefined;
        try {
            const response = await ai.models.generateContent({
                model: this.model,
                contents: `Trích xuất câu hỏi trắc nghiệm từ văn bản sau:\n\n${vanBan}`,
                config: {
                    systemInstruction: this.huongDan,
                    responseMimeType: 'application/json',
                    responseSchema: this.schema,
                    temperature: 0,
                },
            });
            raw = response.text;
        } catch (e) {
            this.logger.error(`Lỗi gọi Gemini: ${(e as Error).message}`);
            throw new ServiceUnavailableException(
                'Không kết nối được dịch vụ AI, vui lòng thử lại sau',
            );
        }

        if (!raw)
            throw new ServiceUnavailableException('AI không trả về dữ liệu');

        let duLieu: CauHoiNhapDto[];
        try {
            duLieu = JSON.parse(raw);
        } catch {
            this.logger.error(`Không parse được JSON từ Gemini: ${raw.slice(0, 300)}`);
            throw new ServiceUnavailableException(
                'AI trả về dữ liệu không hợp lệ, vui lòng thử lại',
            );
        }

        // Chuẩn hóa & suy lại loaiCauHoi theo số đáp án đúng để nhất quán.
        return (Array.isArray(duLieu) ? duLieu : []).map((ch) => {
            const luaChons = (ch.luaChons || []).map((lc) => ({
                noiDung: lc.noiDung ?? '',
                laDapAnDung: !!lc.laDapAnDung,
            }));
            const soDung = luaChons.filter((lc) => lc.laDapAnDung).length;
            return {
                noiDung: ch.noiDung ?? '',
                doKho: Object.values(DoKho).includes(ch.doKho)
                    ? ch.doKho
                    : DoKho.TRUNG_BINH,
                loaiCauHoi:
                    soDung >= 2 ? LoaiCauHoi.NHIEU_DAP_AN : LoaiCauHoi.MOT_DAP_AN,
                luaChons,
            };
        });
    }
}
