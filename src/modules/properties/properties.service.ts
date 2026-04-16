import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';
import { PropertyLike } from './entities/property-like.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { GetPropertiesFilterDto } from './dto/get-properties-filter.dto';
import { CentrifugoService } from '../chat/centrifugo.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
    @InjectRepository(PropertyLike)
    private likeRepo: Repository<PropertyLike>,
    private centrifugoService: CentrifugoService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createDto: CreatePropertyDto, userId: string) {
    try {
      const property = this.propertyRepo.create({
        ...createDto,
        user_id: userId,
      });
      const saved = await this.propertyRepo.save(property);

      // Trigger global notification
      await this.notificationsService.sendGlobalNotification(
        'New Property Listed!',
        `${saved.title} was just posted in ${saved.province}. Check it out!`,
        `/properties/${saved.id}`,
        'PROPERTY_CREATED',
        userId, // Pass the creator ID
      );

      return saved;
    } catch (error: any) {
      throw new BadRequestException(error.message || 'An error occurred while creating the property');
    }
  }

  async findAll(filterDto: GetPropertiesFilterDto, currentUserId?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      minPrice,
      maxPrice,
      province,
      district,
      ward,
      user_id,
    } = filterDto;

    const query = this.propertyRepo
      .createQueryBuilder('property')
      .loadRelationCountAndMap('property.likeCount', 'property.likes');

    if (search) {
      query.andWhere(
        '(property.title LIKE :search OR property.description LIKE :search OR property.address LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      query.andWhere('property.type = :type', { type });
    }

    if (status) {
      query.andWhere('property.status = :status', { status });
    }

    if (minPrice) {
      query.andWhere('property.price >= :minPrice', { minPrice });
    }

    if (maxPrice) {
      query.andWhere('property.price <= :maxPrice', { maxPrice });
    }

    if (province) {
      query.andWhere('property.province = :province', { province });
    }

    if (district) {
      query.andWhere('property.district = :district', { district });
    }

    if (ward) {
      query.andWhere('property.ward = :ward', { ward });
    }

    if (user_id) {
      query.andWhere('property.user_id = :user_id', { user_id });
    }

    query.orderBy('property.id', 'DESC');

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Attach isLiked for current user
    let likedPropertyIds = new Set<number>();
    if (currentUserId) {
      const liked = await this.likeRepo.find({
        where: { user_id: currentUserId },
        select: ['property_id'],
      });
      likedPropertyIds = new Set(liked.map((l) => l.property_id));
    }

    const enriched = data.map((p: any) => ({
      ...p,
      isLiked: likedPropertyIds.has(p.id),
    }));

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, currentUserId?: string) {
    const property = await this.propertyRepo
      .createQueryBuilder('property')
      .loadRelationCountAndMap('property.likeCount', 'property.likes')
      .where('property.id = :id', { id })
      .getOne();

    if (!property) return null;

    let isLiked = false;
    if (currentUserId) {
      const like = await this.likeRepo.findOne({
        where: { user_id: currentUserId, property_id: id },
      });
      isLiked = !!like;
    }

    return { ...property, isLiked };
  }

  async update(id: number, updateDto: UpdatePropertyDto, userId: string) {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to edit this property');
    }
    return this.propertyRepo.update(id, updateDto);
  }

  async remove(id: number, userId: string) {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this property');
    }
    return this.propertyRepo.softDelete(id);
  }

  async uploadImages(id: number, files: Express.Multer.File[], userId: string) {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    console.log('Ownership check:', { propertyUserId: property.user_id, requestUserId: userId });
    if (property.user_id !== userId) {
      throw new ForbiddenException(
        `You do not have permission to update images. (Property: ${property.user_id}, User: ${userId})`,
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'properties');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const urls: string[] = [];
    for (const file of files) {
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, file.buffer);
      urls.push(`/static/uploads/properties/${fileName}`);
    }

    property.images = [...(property.images || []), ...urls];
    return this.propertyRepo.save(property);
  }

  // ─── LIKE / UNLIKE ──────────────────────────────────────────────────────────

  async toggleLike(propertyId: number, userId: string) {
    const property = await this.propertyRepo.findOneBy({ id: propertyId });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const existing = await this.likeRepo.findOne({
      where: { user_id: userId, property_id: propertyId },
    });

    if (existing) {
      await this.likeRepo.remove(existing);
    } else {
      const like = this.likeRepo.create({ user_id: userId, property_id: propertyId });
      await this.likeRepo.save(like);
    }

    const likeCount = await this.likeRepo.count({ where: { property_id: propertyId } });
    const isLiked = !existing;

    // Publish realtime event to all subscribers
    console.log(`[PropertiesService] Toggling like for property ${propertyId}, user ${userId}. New count: ${likeCount}`);
    await this.centrifugoService.publish(`property:${propertyId}:likes`, {
      propertyId,
      likeCount,
      userId,
    });

    return { isLiked, likeCount };
  }

  async getLikeStatus(propertyId: number, userId?: string) {
    const likeCount = await this.likeRepo.count({ where: { property_id: propertyId } });
    let isLiked = false;
    if (userId) {
      const like = await this.likeRepo.findOne({
        where: { user_id: userId, property_id: propertyId },
      });
      isLiked = !!like;
    }
    return { isLiked, likeCount };
  }

  async getLikedProperties(userId: string, page = 1, limit = 10) {
    const [likes, total] = await this.likeRepo.findAndCount({
      where: { user_id: userId },
      relations: ['property'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const data = likes
      .filter((l) => l.property && !l.property.deletedAt)
      .map((l) => ({ ...l.property, isLiked: true }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}