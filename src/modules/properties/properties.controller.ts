import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  Request,
  UploadedFiles,
  UseInterceptors,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { GetPropertiesFilterDto } from './dto/get-properties-filter.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  create(@Body() createDto: CreatePropertyDto, @Request() req) {
    return this.propertiesService.create(createDto, req.user.userId);
  }

  @Public()
  @Get()
  findAll(@Query() filterDto: GetPropertiesFilterDto, @Request() req) {
    const currentUserId = req.user?.userId;
    const currentUserRole = req.user?.role;
    return this.propertiesService.findAll(filterDto, currentUserId, currentUserRole);
  }

  /**
   * GET /api/v1/properties/liked/me
   * Get all properties liked by the current user. Requires authentication.
   * NOTE: Must be declared BEFORE :id route to avoid route collision.
   */
  @Get('liked/me')
  getLikedProperties(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.propertiesService.getLikedProperties(req.user.userId, page, limit);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const currentUserId = req.user?.userId;
    return this.propertiesService.findOne(+id, currentUserId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePropertyDto,
    @Request() req,
  ) {
    return this.propertiesService.update(+id, updateDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.propertiesService.remove(+id, req.user.userId);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    return this.propertiesService.uploadImages(+id, files, req.user.userId);
  }

  // ─── ADMIN MODERATION ───────────────────────────────────────────────────────

  /**
   * PATCH /api/v1/properties/:id/approve
   * Approve or reject a property. Admin only.
   */
  @UseGuards(RolesGuard)
  @Roles('System Admin')
  @Patch(':id/approve')
  approveProperty(
    @Param('id', ParseIntPipe) id: number,
    @Body('isApproved', ParseBoolPipe) isApproved: boolean,
  ) {
    return this.propertiesService.approveProperty(id, isApproved);
  }

  // ─── LIKE / UNLIKE ──────────────────────────────────────────────────────────

  /**
   * POST /api/v1/properties/:id/like
   * Toggle like/unlike for a property. Requires authentication.
   */
  @Post(':id/like')
  toggleLike(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.propertiesService.toggleLike(id, req.user.userId);
  }

  /**
   * GET /api/v1/properties/:id/like
   * Get like count + isLiked status. Public, but isLiked requires auth.
   */
  @Public()
  @Get(':id/like')
  getLikeStatus(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const currentUserId = req.user?.userId;
    return this.propertiesService.getLikeStatus(id, currentUserId);
  }
}