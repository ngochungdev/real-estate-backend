import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Beautiful Villa', description: 'Property title' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'A beautiful villa near the lake', description: 'Property description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 2000000000, description: 'Price in VND' })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiProperty({ example: 120, description: 'Area in square meters' })
  @Type(() => Number)
  @IsNumber()
  area: number;

  @ApiProperty({ required: false, example: 3, description: 'Number of bedrooms' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bedrooms?: number;

  @ApiProperty({ required: false, example: 2, description: 'Number of bathrooms' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @ApiProperty({ required: false, example: 2, description: 'Number of floors' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  floors?: number;

  @ApiProperty({ required: false, example: 5.5, description: 'Frontage width in meters' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  frontage?: number;

  @ApiProperty({ required: false, example: 'East', description: 'Direction of the property' })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiProperty({ required: false, example: 'Sổ đỏ/Sổ hồng', description: 'Legal status' })
  @IsOptional()
  @IsString()
  legal_status?: string;

  @ApiProperty({ example: '123 Nguyen Trai Street', description: 'Full address' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Hanoi', description: 'Province' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Cau Giay', description: 'District' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Dich Vong', description: 'Ward' })
  @IsString()
  ward: string;

  @ApiProperty({ example: 'HOUSE', description: 'Property type (HOUSE, APARTMENT, LAND, etc.)' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'AVAILABLE', description: 'Property status (AVAILABLE, SOLD, RENTED)' })
  @IsString()
  status: string;

  @ApiProperty({ required: false, example: 21.0278, description: 'Latitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiProperty({ required: false, example: 105.8342, description: 'Longitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lng?: number;
}