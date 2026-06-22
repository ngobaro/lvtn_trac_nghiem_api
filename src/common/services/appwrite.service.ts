import { Injectable } from '@nestjs/common';
import { Client, Storage, ID,  } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

@Injectable()
export class AppwriteService {
  private storage: Storage;
  private bucketId: string;

  constructor() {
    const client = new Client()
      .setEndpoint('https://cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '')
      .setKey(process.env.APPWRITE_API_KEY || '');

    this.storage = new Storage(client);
    this.bucketId = process.env.APPWRITE_BUCKET_ID || '';
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const response = await this.storage.createFile(
      this.bucketId,
      ID.unique(),
      InputFile.fromBuffer(file.buffer, file.originalname),
    );
    return `https://cloud.appwrite.io/v1/storage/buckets/${this.bucketId}/files/${response.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.storage.deleteFile(this.bucketId, fileId);
  }
}