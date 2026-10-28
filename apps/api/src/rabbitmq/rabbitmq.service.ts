import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export interface NotificationJob {
  messageId: string;
  senderId: string;
  senderName: string;
  conversationId: string;
  recipientIds: string[];
  content: string;
  createdAt: string;
}

export const QUEUES = {
  NOTIFICATIONS: 'convoflow.notifications',
  ACTIVITY_LOGS: 'convoflow.activity_logs',
};

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    const url = this.config.get<string>('rabbitmq.url', 'amqp://localhost:5672');
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      // Assert queues
      await this.channel.assertQueue(QUEUES.NOTIFICATIONS, { durable: true });
      await this.channel.assertQueue(QUEUES.ACTIVITY_LOGS, { durable: true });

      this.logger.log('✅ RabbitMQ connected & queues asserted');

      // Start background notification worker
      await this.startNotificationWorker();
    } catch (error) {
      this.logger.warn(`RabbitMQ connection failed (${error.message}) — running with fallback queue logging`);
      this.isConnected = false;
    }
  }

  private async disconnect() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignore disconnect error
    }
  }

  async sendNotificationJob(job: NotificationJob): Promise<void> {
    if (!this.isConnected || !this.channel) {
      this.logger.debug(
        `[RabbitMQ Fallback] Simulating notification for ${job.recipientIds.length} recipient(s): "${job.content.slice(0, 30)}..."`,
      );
      return;
    }

    try {
      this.channel.sendToQueue(
        QUEUES.NOTIFICATIONS,
        Buffer.from(JSON.stringify(job)),
        { persistent: true },
      );
      this.logger.debug(`Enqueued notification job for message ${job.messageId}`);
    } catch (error) {
      this.logger.warn(`Failed to enqueue notification job: ${error.message}`);
    }
  }

  private async startNotificationWorker() {
    if (!this.channel) return;

    await this.channel.consume(
      QUEUES.NOTIFICATIONS,
      (msg) => {
        if (!msg) return;
        try {
          const job: NotificationJob = JSON.parse(msg.content.toString());
          this.processNotificationJob(job);
          this.channel?.ack(msg);
        } catch (err) {
          this.logger.error(`Error processing RabbitMQ notification job: ${err.message}`);
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    this.logger.log('👷 RabbitMQ notification worker listening');
  }

  private processNotificationJob(job: NotificationJob) {
    // Simulates background email / push notification processing
    for (const recipientId of job.recipientIds) {
      this.logger.log(
        `📬 [Notification Worker] Delivered notification to User(${recipientId}): New message from ${job.senderName}: "${job.content}"`,
      );
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}
