import { SayFn } from '@slack/bolt';
import { AIProvider } from './ai-adapter.js';

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
    private readonly ai: AIProvider,
    private readonly say: SayFn,
    private readonly cwd: string,
    private readonly threadTs: string,
    options?: {
      batchTimeMs?: number; // Time interval to check for messages (default: 2000ms)
      maxBatchSize?: number; // Maximum messages per batch (default: 5)
    }
  ) {
    this.batchTimeMs = options?.batchTimeMs ?? 2000;
    this.maxBatchSize = options?.maxBatchSize ?? 5;

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
  private async processBatch(): Promise<void> {
    if (this.pendingMessages.length === 0) {
      return;
    }

    // Check if we have enough messages to process
    if (this.pendingMessages.length >= this.maxBatchSize) {
      // Get messages for this batch (up to maxBatchSize)
      const messagesToSend = this.pendingMessages.splice(0, this.maxBatchSize);

      // Use AI to summarize the messages asynchronously
      this.summarizeMessagesAndSend(messagesToSend);
    }
  }

  // Use AI to summarize messages and send them without blocking
  private async summarizeMessagesAndSend(messages: PendingMessage[]): Promise<void> {
    try {
      // Use AI to summarize the messages
      const summarizedMessage = await this.summarizeMessages(messages);

      // Send the summarized message
      await this.say({
        text: summarizedMessage,
        thread_ts: this.threadTs
      });
    } catch (error) {
      console.error('Failed to summarize and send messages:', error);
      // Fallback to simple formatting if AI summarization fails
      const formattedMessage = this.formatBatchMessage(messages);
      await this.say({
        text: formattedMessage,
        thread_ts: this.threadTs
      });
    }
  }

  // Use AI to summarize messages and extract code snippets
  private async summarizeMessages(messages: PendingMessage[]): Promise<string> {
    if (messages.length === 1) {
      return messages[0].text;
    }

    // Create a prompt for the AI to summarize the messages
    const messageTexts = messages.map(msg => msg.text).join('\n\n');
    const summaryPrompt = `Please summarize the following AI agent progress updates into a single coherent message. 
Focus on the key actions taken and results achieved.
Do not include any prefix or suffix, just return the summary message.

Messages to summarize:
${messageTexts}`;

    try {
      // Use the AI to generate a summary
      const summary = await this.ai.generatePlan(summaryPrompt, this.cwd);
      return summary.trim() || `🔄 AI Agent Update (${messages.length} items)`;
    } catch (error) {
      console.error('Failed to summarize messages with AI:', error);

      // Fallback to simple formatting if AI summarization fails
      const messageCount = messages.length;
      const items = messages.map((msg, index) => `${index + 1}. ${msg.text}`).join('\n');
      return `🔄 AI Agent Update (${messageCount} items):\n${items}`;
    }
  }

  // Format multiple messages into a single well-structured message (fallback)
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
      // Process in batches of maxBatchSize
      const messagesToSend = this.pendingMessages.splice(0, this.maxBatchSize);
      const formattedMessage = this.formatBatchMessage(messagesToSend);

      // Send the message asynchronously
      this.say({
        text: formattedMessage,
        thread_ts: this.threadTs
      }).catch(error => {
        console.error('Error sending final messages:', error);
      });
    }
  }
}