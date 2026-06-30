import { BadRequestException, Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class DocumentParserService {
    // Đọc nội dung văn bản thuần từ file Word (.docx) hoặc PDF.
    async docFromBuffer(file: Express.Multer.File): Promise<string> {
        if (!file?.buffer)
            throw new BadRequestException('Không nhận được file tải lên');

        const ten = (file.originalname || '').toLowerCase();
        const laDocx =
            ten.endsWith('.docx') ||
            file.mimetype ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const laPdf = ten.endsWith('.pdf') || file.mimetype === 'application/pdf';

        let vanBan = '';
        try {
            if (laDocx) {
                const ketQua = await mammoth.extractRawText({ buffer: file.buffer });
                vanBan = ketQua.value;
            } else if (laPdf) {
                const parser = new PDFParse({ data: file.buffer });
                try {
                    const ketQua = await parser.getText();
                    vanBan = ketQua.text;
                } finally {
                    await parser.destroy();
                }
            } else {
                throw new BadRequestException(
                    'Chỉ hỗ trợ file Word (.docx) hoặc PDF',
                );
            }
        } catch (e) {
            if (e instanceof BadRequestException) throw e;
            throw new BadRequestException(
                `Không đọc được nội dung file: ${(e as Error).message}`,
            );
        }

        vanBan = vanBan.trim();
        if (!vanBan)
            throw new BadRequestException('Không đọc được nội dung văn bản từ file');

        return vanBan;
    }
}
