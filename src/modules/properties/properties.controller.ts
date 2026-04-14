import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query, Request, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { GetPropertiesFilterDto } from './dto/get-properties-filter.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../authentication/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

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
  findAll(@Query() filterDto: GetPropertiesFilterDto) {
    return this.propertiesService.findAll(filterDto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePropertyDto,
    @Request() req
  ) {
    return this.propertiesService.update(+id, updateDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.propertiesService.remove(+id, req.user.userId);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    return this.propertiesService.uploadImages(+id, files, req.user.userId);
  }
}