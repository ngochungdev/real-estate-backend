import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property } from './entities/property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { GetPropertiesFilterDto } from './dto/get-properties-filter.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
  ) {}

  async create(createDto: CreatePropertyDto) {
    try {
      const property = this.propertyRepo.create(createDto);
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

  update(id: number, updateDto: UpdatePropertyDto) {
    return this.propertyRepo.update(id, updateDto);
  }

  async remove(id: number, userId: string) {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) {
      throw new NotFoundException('Bất động sản không tồn tại');
    }
    console.log(property.user_id, userId);
    if (property.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bất động sản này');
    }
    return this.propertyRepo.softDelete(id);
  }
}