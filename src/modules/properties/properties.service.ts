import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { GetPropertiesFilterDto } from './dto/get-properties-filter.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
  ) {}

  async create(createDto: CreatePropertyDto, userId: string) {
    try {
      const property = this.propertyRepo.create({
        ...createDto,
        user_id: userId,
      });
      return await this.propertyRepo.save(property);
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Có lỗi xảy ra khi tạo bất động sản');
    }
  }

  async findAll(filterDto: GetPropertiesFilterDto) {
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

    const query = this.propertyRepo.createQueryBuilder('property');

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

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  findOne(id: number) {
    return this.propertyRepo.findOneBy({ id });
  }

  async update(id: number, updateDto: UpdatePropertyDto, userId: string) {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) {
      throw new NotFoundException('Bất động sản không tồn tại');
    }
    if (property.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bất động sản này');
    }
    return this.propertyRepo.update(id, updateDto);
  }

  async remove(id: number, userId: string) {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) {
      throw new NotFoundException('Bất động sản không tồn tại');
    }
    if (property.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bất động sản này');
    }
    return this.propertyRepo.softDelete(id);
  }

  async uploadImages(id: number, files: Express.Multer.File[], userId: string) {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) {
      throw new NotFoundException('Bất động sản không tồn tại');
    }
    console.log('Ownership check:', { propertyUserId: property.user_id, requestUserId: userId });
    if (property.user_id !== userId) {
      throw new ForbiddenException(`Bạn không có quyền cập nhật ảnh. (Property: ${property.user_id}, User: ${userId})`);
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
}