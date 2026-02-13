import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

interface OllamaStreamChunk {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>(
      ENVEnum.OLLAMA_BASE_URL,
    );
    this.model = this.configService.getOrThrow<string>(ENVEnum.OLLAMA_MODEL);
  }

  async generateResponse(prompt: string, model?: string): Promise<string> {
    const modelToUse = model || this.model;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      const err = error as NodeJS.ErrnoException & {
        cause?: { code?: string };
      };
      const isRefused =
        err?.cause?.code === 'ECONNREFUSED' || err?.code === 'ECONNREFUSED';
      if (isRefused) {
        this.logger.error(
          `Cannot connect to Ollama at ${this.baseUrl}. ` +
            'Ensure Ollama is running and OLLAMA_BASE_URL is set correctly (e.g. http://ollama:11434 in Docker).',
        );
      } else {
        this.logger.error('Failed to generate response from Ollama', error);
      }
      throw error;
    }
  }

  /**
   * Generate using chat API (system + user). Better instruction following for RAG.
   */
  async generateChatResponse(
    messages: OllamaChatMessage[],
    model?: string,
  ): Promise<string> {
    const modelToUse = model || this.model;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: OllamaChatResponse = await response.json();
      this.logger.log('Chat response:', data);

      return data.message?.content ?? '';
    } catch (error) {
      const err = error as NodeJS.ErrnoException & {
        cause?: { code?: string };
      };
      const isRefused =
        err?.cause?.code === 'ECONNREFUSED' || err?.code === 'ECONNREFUSED';
      if (isRefused) {
        this.logger.error(
          `Cannot connect to Ollama at ${this.baseUrl}. ` +
            'Ensure Ollama is running and OLLAMA_BASE_URL is set correctly (e.g. http://ollama:11434 in Docker).',
        );
      } else {
        this.logger.error('Failed to generate response from Ollama', error);
      }
      throw error;
    }
  }

  async *streamResponse(
    prompt: string,
    model?: string,
  ): AsyncGenerator<string> {
    const modelToUse = model || this.model;

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelToUse,
          prompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const chunk: OllamaStreamChunk = JSON.parse(line);
            if (chunk.response) {
              yield chunk.response;
            }
          }
        }
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException & {
        cause?: { code?: string };
      };
      const isRefused =
        err?.cause?.code === 'ECONNREFUSED' || err?.code === 'ECONNREFUSED';
      if (isRefused) {
        this.logger.error(
          `Cannot connect to Ollama at ${this.baseUrl}. ` +
            'Ensure Ollama is running and OLLAMA_BASE_URL is set correctly (e.g. http://ollama:11434 in Docker).',
        );
      } else {
        this.logger.error('Failed to stream response from Ollama', error);
      }
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
