import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, Admin, logLevel } from 'kafkajs';

export const TOPICS = {
  MESSAGE_CREATED: 'message.created',
  MESSAGE_READ: 'message.read',
  USER_ONLINE: 'user.online',
  USER_OFFLINE: 'user.offline',
};

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {
    const brokers = this.config.get<string[]>('kafka.brokers', ['localhost:9092']);
    const clientId = this.config.get<string>('kafka.clientId', 'convoflow-api');
    const groupId = this.config.get<string>('kafka.groupId', 'convoflow-group');

    this.kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.ERROR,
      retry: { retries: 3 },
    });

    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      this.logger.log('✅ Kafka connected');

      // Subscribe to topics for consumption
      await this.consumer.subscribe({
        topics: [TOPICS.MESSAGE_CREATED, TOPICS.USER_ONLINE, TOPICS.USER_OFFLINE],
        fromBeginning: false,
      });

      // Start consuming
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const value = message.value?.toString();
          if (value) {
            this.handleMessage(topic, JSON.parse(value));
          }
        },
      });
    } catch (error) {
      this.logger.warn('Kafka connection failed — running without Kafka event streaming');
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }

  async publish(topic: string, payload: Record<string, any>): Promise<void> {
    if (!this.isConnected) {
      this.logger.debug(`[Kafka Fallback] Would publish to ${topic}: ${JSON.stringify(payload)}`);
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: payload.id ?? String(Date.now()),
            value: JSON.stringify(payload),
          },
        ],
      });
      this.logger.debug(`Published to Kafka topic ${topic}`);
    } catch (error) {
      this.logger.warn(`Failed to publish to Kafka topic ${topic}: ${error.message}`);
    }
  }

  private handleMessage(topic: string, payload: any) {
    this.logger.debug(`Consumed Kafka event: [${topic}] ${JSON.stringify(payload)}`);

    switch (topic) {
      case TOPICS.MESSAGE_CREATED:
        this.logger.log(
          `📨 Kafka event: new message in conversation ${payload.conversationId} from ${payload.senderId}`,
        );
        break;
      case TOPICS.USER_ONLINE:
        this.logger.log(`🟢 Kafka event: user ${payload.userId} came online`);
        break;
      case TOPICS.USER_OFFLINE:
        this.logger.log(`🔴 Kafka event: user ${payload.userId} went offline`);
        break;
    }
  }
}
