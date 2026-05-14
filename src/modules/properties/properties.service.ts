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

  async findAll(filterDto: GetPropertiesFilterDto, currentUserId?: string, currentUserRole?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      bedrooms,
      bathrooms,
      direction,
      sortBy,
      sortOrder,
      isApproved,
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

    if (minArea) {
      query.andWhere('property.area >= :minArea', { minArea });
    }

    if (maxArea) {
      query.andWhere('property.area <= :maxArea', { maxArea });
    }

    if (bedrooms) {
      query.andWhere('property.bedrooms >= :bedrooms', { bedrooms });
    }

    if (bathrooms) {
      query.andWhere('property.bathrooms >= :bathrooms', { bathrooms });
    }

    if (direction) {
      query.andWhere('property.direction = :direction', { direction });
    }

    if (user_id) {
      query.andWhere('property.user_id = :user_id', { user_id });
    }

    // Authorization & Visibility logic for isApproved
    if (currentUserRole === 'System Admin') {
      // Admins can filter by isApproved explicitly
      if (isApproved !== undefined) {
        // Parse boolean if it comes as a string 'true'/'false'
        const approvedBool = String(isApproved) === 'true';
        query.andWhere('property.isApproved = :isApproved', { isApproved: approvedBool });
      }
    } else {
      // Normal users or guests can only see approved properties, OR their own pending properties
      if (currentUserId) {
        query.andWhere('(property.isApproved = true OR property.user_id = :currentUserId)', { currentUserId });
      } else {
        query.andWhere('property.isApproved = true');
      }
    }

    // Sorting
    const allowedSortFields = ['price', 'area', 'createdAt', 'id'];
    const sortField = sortBy && allowedSortFields.includes(sortBy) ? `property.${sortBy}` : 'property.id';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    
    query.orderBy(sortField, order);

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

  // ─── ADMIN MODERATION ───────────────────────────────────────────────────────

  async approveProperty(propertyId: number, isApproved: boolean) {
    const property = await this.propertyRepo.findOneBy({ id: propertyId });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    property.isApproved = isApproved;
    await this.propertyRepo.save(property);

    // Notify the user who created the property
    const statusText = isApproved ? 'approved and is now live' : 'rejected';
    await this.notificationsService.createNotification(
      property.user_id,
      `Property ${isApproved ? 'Approved' : 'Rejected'}`,
      `Your property "${property.title}" has been ${statusText}.`,
      `/properties/${property.id}`,
      'PROPERTY_APPROVAL',
    );

    return { message: `Property has been ${statusText}` };
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