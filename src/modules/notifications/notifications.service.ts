import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationRead } from './entities/notification-read.entity';
import { CentrifugoService } from '../chat/centrifugo.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationRead)
    private readRepo: Repository<NotificationRead>,
    private centrifugoService: CentrifugoService,
  ) {}

  async findAll(userId: string, page = 1, limit = 20) {
    const query = this.notificationRepo.createQueryBuilder('n')
      .leftJoinAndSelect('n.user', 'u')
      .leftJoin('notification_reads', 'nr', 'nr.notification_id = n.id AND nr.user_id = :userId', { userId })
      .select([
        'n.id',
        'n.title',
        'n.content',
        'n.type',
        'n.link',
        'n.userId',
        'n.createdAt',
        'nr.id',
      ])
      .where('n.userId = :userId OR n.userId IS NULL', { userId })
      .orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rawList, total] = await query.getManyAndCount();

    // Dynamically calculate isRead for each notification
    // It's read if: 
    // 1. It's a private notification meant for this user and isRead flag is true
    // 2. OR there was a record in notification_reads for this user/notification
    // We achieve this by checking if the joined NR existed (raw query would help but let's map)
    
    // To check joined record existence in getMany, we might need to select nr.id but it's not a relation on entity.
    // Let's use a simpler approach: getRawAndEntities or just query the IDs.
    
    const data = await Promise.all(rawList.map(async (n) => {
      const isReadRecord = await this.readRepo.findOne({
        where: { notificationId: n.id, userId }
      });
      return {
        ...n,
        isRead: !!isReadRecord
      };
    }));

    return { data, total, page, limit };
  }

  async markAsRead(id: number, userId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id },
    });

    if (!notification) return;

    // Create or update the read status record for this user
    let readRecord = await this.readRepo.findOne({
      where: { notificationId: id, userId }
    });

    if (!readRecord) {
      readRecord = this.readRepo.create({
        notificationId: id,
        userId
      });
      return this.readRepo.save(readRecord);
    }
    
    return readRecord;
  }

  async createNotification(userId: string, title: string, content: string, link?: string, type = 'GENERAL') {
    const notification = this.notificationRepo.create({
      userId,
      title,
      content,
      link,
      type,
    });

    const saved = await this.notificationRepo.save(notification);

    // Publish to user-specific channel
    await this.centrifugoService.publish(`notifications:user:${userId}`, {
      id: saved.id,
      title: saved.title,
      content: saved.content,
      link: saved.link,
      type: saved.type,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  async sendGlobalNotification(title: string, content: string, link?: string, type = 'GENERAL', creatorId?: string) {
    const notification = this.notificationRepo.create({
      title,
      content,
      link,
      type,
    });

    const saved = await this.notificationRepo.save(notification);

    // Publish to Centrifugo global channel
    await this.centrifugoService.publish('notifications:global', {
      id: saved.id,
      title: saved.title,
      content: saved.content,
      link: saved.link,
      type: saved.type,
      creatorId, // Add this to allow clients to filter out their own actions
      createdAt: saved.createdAt,
    });

    return saved;
  }
}
