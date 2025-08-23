// src/message-streamer.ts (or at the top of ai-adapter.ts)
import { SayFn } from '@slack/bolt';

// Options for the streamer
interface StreamerOptions {
  prefix?: string;
  bufferTime?: number; // Time in ms to wait for more text before flushing
}

export class MessageStreamer {
  private buffer: string = '';
  private flushTimeout: NodeJS.Timeout | null = null;
  private say: SayFn;
  private threadTs: string;
  private options: StreamerOptions;

  constructor(say: SayFn, threadTs: string, options: StreamerOptions = {}) {
    this.say = say;
    this.threadTs = threadTs;
    this.options = {
      prefix: options.prefix || '',
      bufferTime: options.bufferTime || 1500, // Default to 1.5 seconds
    };
  }

  // Receives a new chunk of text from the stream
  public push(chunk: string): void {
    // Clear any pending timeout because new data has arrived
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    this.buffer += chunk;

    // Check for complete lines (ending in a newline)
    const lines = this.buffer.split('\n');
    
    // If we have at least one complete line, process it
    if (lines.length > 1) {
      // All but the last part are complete lines
      const completeLines = lines.slice(0, -1).join('\n');
      this.sendMessage(completeLines);

      // The last part is the new, potentially incomplete buffer
      this.buffer = lines[lines.length - 1];
    }

    // If there's anything left in the buffer (a partial line), set a timer to flush it
    if (this.buffer.length > 0) {
      this.flushTimeout = setTimeout(() => this.flush(), this.options.bufferTime);
    }
  }

  // Flushes any remaining content in the buffer
  public flush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.buffer.length > 0) {
      this.sendMessage(this.buffer);
      this.buffer = '';
    }
  }

  private sendMessage(text: string): void {
    if (text.trim()) {
      this.say({
        text: `${this.options.prefix}${text}`,
        thread_ts: this.threadTs,
      });
    }
  }
}