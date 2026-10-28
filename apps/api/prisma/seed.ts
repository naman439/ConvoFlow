import { PrismaClient, UserStatus, ConversationType, MessageType, MessageStatus, MemberRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://convoflow:convoflow_secret@localhost:5432/convoflow?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Demo@12345', salt);

  // Upsert demo user 1
  const user1 = await prisma.user.upsert({
    where: { email: 'demo1@convoflow.dev' },
    update: {
      passwordHash,
      displayName: 'Alice Johnson',
      status: UserStatus.ONLINE,
    },
    create: {
      email: 'demo1@convoflow.dev',
      username: 'alice',
      passwordHash,
      displayName: 'Alice Johnson',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      bio: 'Product Designer @ ConvoFlow. Coffee lover ☕',
      status: UserStatus.ONLINE,
    },
  });

  // Upsert demo user 2
  const user2 = await prisma.user.upsert({
    where: { email: 'demo2@convoflow.dev' },
    update: {
      passwordHash,
      displayName: 'Bob Smith',
      status: UserStatus.ONLINE,
    },
    create: {
      email: 'demo2@convoflow.dev',
      username: 'bob',
      passwordHash,
      displayName: 'Bob Smith',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: 'Full Stack Engineer. Building real-time apps 🚀',
      status: UserStatus.ONLINE,
    },
  });

  // Upsert demo user 3
  const user3 = await prisma.user.upsert({
    where: { email: 'carol@convoflow.dev' },
    update: {
      passwordHash,
      displayName: 'Carol Danvers',
      status: UserStatus.OFFLINE,
    },
    create: {
      email: 'carol@convoflow.dev',
      username: 'carol',
      passwordHash,
      displayName: 'Carol Danvers',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      bio: 'DevOps & Cloud Architect ☁️',
      status: UserStatus.OFFLINE,
    },
  });

  console.log(`👤 Users seeded: ${user1.username}, ${user2.username}, ${user3.username}`);

  // Find or create direct conversation between Alice and Bob
  const existingConv = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.DIRECT,
      AND: [
        { members: { some: { userId: user1.id } } },
        { members: { some: { userId: user2.id } } },
      ],
    },
    include: { members: true },
  });

  let directConv = existingConv;
  if (!directConv) {
    directConv = await prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        members: {
          create: [
            { userId: user1.id, role: MemberRole.MEMBER },
            { userId: user2.id, role: MemberRole.MEMBER },
          ],
        },
      },
      include: { members: true },
    });
    console.log(`💬 Created direct conversation: ${directConv.id}`);
  }

  // Create demo messages if conversation is empty
  const messageCount = await prisma.message.count({
    where: { conversationId: directConv.id },
  });

  if (messageCount === 0) {
    const now = new Date();
    await prisma.message.createMany({
      data: [
        {
          conversationId: directConv.id,
          senderId: user1.id,
          content: 'Hey Bob! Welcome to ConvoFlow 👋',
          type: MessageType.TEXT,
          status: MessageStatus.READ,
          createdAt: new Date(now.getTime() - 1000 * 60 * 30),
        },
        {
          conversationId: directConv.id,
          senderId: user2.id,
          content: 'Hey Alice! The real-time messaging is super fast here! 🚀',
          type: MessageType.TEXT,
          status: MessageStatus.READ,
          createdAt: new Date(now.getTime() - 1000 * 60 * 20),
        },
        {
          conversationId: directConv.id,
          senderId: user1.id,
          content: 'Indeed! WebSocket + Redis presence + Kafka streaming makes it seamless.',
          type: MessageType.TEXT,
          status: MessageStatus.READ,
          createdAt: new Date(now.getTime() - 1000 * 60 * 10),
        },
        {
          conversationId: directConv.id,
          senderId: user2.id,
          content: 'Let’s test the typing indicator and real-time socket events now!',
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
          createdAt: new Date(now.getTime() - 1000 * 60 * 2),
        },
      ],
    });
    console.log('✉️ Seeded initial messages');
  }

  // Create demo group conversation
  const existingGroup = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.GROUP,
      name: 'Engineering Team',
    },
  });

  if (!existingGroup) {
    const groupConv = await prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name: 'Engineering Team',
        members: {
          create: [
            { userId: user1.id, role: MemberRole.ADMIN },
            { userId: user2.id, role: MemberRole.MEMBER },
            { userId: user3.id, role: MemberRole.MEMBER },
          ],
        },
      },
    });

    await prisma.message.create({
      data: {
        conversationId: groupConv.id,
        senderId: user1.id,
        content: 'Welcome everyone to the #engineering channel! 🎉',
        type: MessageType.TEXT,
        status: MessageStatus.READ,
      },
    });
    console.log(`👥 Created group conversation: ${groupConv.name}`);
  }

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
