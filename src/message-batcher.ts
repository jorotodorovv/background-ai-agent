import { SayFn } from '@slack/bolt';

interface PendingMessage {
  text: string;
  timestamp: number;
}

export class MessageBatcher {
  private pendingMessages: PendingMessage[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly batchTimeMs: number;
  private readonly maxBatchSize: number;

  constructor(
    private readonly say: SayFn,
    private readonly threadTs: string,
    options?: {
      batchTimeMs?: number; // Time interval to check for messages (default: 2000ms)
      maxBatchSize?: number; // Maximum messages per batch (default: 10)
    }
  ) {
    this.batchTimeMs = options?.batchTimeMs ?? 2000;
    this.maxBatchSize = options?.maxBatchSize ?? 10;
    this.startBatching();
  }

  // Add a new message to the batch
  public addMessage(text: string): void {
    this.pendingMessages.push({
      text,
      timestamp: Date.now()
    });
  }

  // Process and send messages in batches
  private processBatch(): void {
    if (this.pendingMessages.length === 0) {
      return;
    }

    // Get messages for this batch (up to maxBatchSize)
    const messagesToSend = this.pendingMessages.splice(0, this.maxBatchSize);
    
    // Format them into a single message
    const formattedMessage = this.formatBatchMessage(messagesToSend);
    
    // Send the batched message
    this.say({
      text: formattedMessage,
      thread_ts: this.threadTs
    });
  }

  // Format multiple messages into a single well-structured message
  private formatBatchMessage(messages: PendingMessage[]): string {
    if (messages.length === 1) {
      return messages[0].text;
    }

    // Create a summarized message for multiple items
    const messageCount = messages.length;
    const items = messages.map((msg, index) => `${index + 1}. ${msg.text}`).join('\n');
    
    return `🔄 AI Agent Update (${messageCount} items):\n${items}`;
  }

  // Start the batching interval
  private startBatching(): void {
    this.batchInterval = setInterval(() => {
      this.processBatch();
    }, this.batchTimeMs);
  }

  // Stop batching and clear any pending messages
  public destroy(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = null;
    }
    // Send any remaining messages
    while (this.pendingMessages.length > 0) {
      this.processBatch();
    }
  }
}