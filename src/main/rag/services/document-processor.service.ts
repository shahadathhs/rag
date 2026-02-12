import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import {
  Document,
  DocumentDocument,
} from '@/lib/database/schemas/document.schema';
import {
  DocumentChunk,
  DocumentChunkDocument,
} from '@/lib/database/schemas/document-chunk.schema';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private readonly chunkSize = 500; // characters
  private readonly chunkOverlap = 100; // characters

  constructor(
    @InjectModel(Document.name)
    private readonly documentModel: Model<DocumentDocument>,
    @InjectModel(DocumentChunk.name)
    private readonly chunkModel: Model<DocumentChunkDocument>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async processDocument(
    file: Express.Multer.File,
    userId: string,
  ): Promise<DocumentDocument> {
    const document = await this.documentModel.create({
      userId,
      filename: file.filename,
      originalName: file.originalname,
      fileType: this.getFileType(file.originalname),
      fileSize: file.size,
      filePath: file.path,
      status: 'processing',
      totalChunks: 0,
    });

    try {
      // Extract text from file
      const text = await this.extractText(file.path, document.fileType);

      // Split into chunks
      const chunks = this.chunkText(text);

      // Generate embeddings and save chunks
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.embeddingService.generateEmbedding(
          chunks[i],
        );

        await this.chunkModel.create({
          documentId: document._id,
          userId,
          content: chunks[i],
          embedding,
          chunkIndex: i,
          tokenCount: chunks[i].length,
        });
      }

      // Update document status
      document.status = 'completed';
      document.totalChunks = chunks.length;
      await document.save();

      this.logger.log(
        `Processed document ${document.filename} with ${chunks.length} chunks`,
      );

      return document;
    } catch (error) {
      this.logger.error('Failed to process document', error);
      document.status = 'failed';
      document.errorMessage = (error as Error).message;
      await document.save();
      throw error;
    }
  }

  private async extractText(
    filePath: string,
    fileType: string,
  ): Promise<string> {
    const buffer = await fs.readFile(filePath);

    switch (fileType) {
      case 'pdf': {
        const pdfData = await (pdfParse as any)(buffer);
        return pdfData.text;
      }

      case 'docx': {
        const docxResult = await mammoth.extractRawText({ buffer });
        return docxResult.value;
      }

      case 'txt':
      case 'md':
        return buffer.toString('utf-8');

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk.trim());
      start += this.chunkSize - this.chunkOverlap;
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  private getFileType(filename: string): string {
    const ext = path.extname(filename).toLowerCase().slice(1);
    if (['pdf', 'txt', 'docx', 'md'].includes(ext)) {
      return ext;
    }
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    const document = await this.documentModel.findOne({
      _id: documentId,
      userId,
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file
    try {
      await fs.unlink(document.filePath);
    } catch {
      this.logger.warn(`Failed to delete file: ${document.filePath}`);
    }

    // Delete chunks
    await this.chunkModel.deleteMany({ documentId });

    // Delete document
    await this.documentModel.deleteOne({ _id: documentId });

    this.logger.log(`Deleted document ${documentId}`);
  }
}
