import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { PropertyLike } from './property-like.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'double precision' })
  price: number;

  @Column({ type: 'double precision' })
  area: number;

  @Column()
  address: string;

  @Column()
  province: string;

  @Column()
  district: string;

  @Column()
  ward: string;

  @Column({ type: 'double precision', nullable: true })
  lat: number;

  @Column({ type: 'double precision', nullable: true })
  lng: number;

  @Column()
  type: string;

  @Column()
  status: string;

  @Column()
  user_id: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  images: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToMany(() => PropertyLike, (like) => like.property)
  likes: PropertyLike[];

  // Virtual fields (populated by query builder)
  likeCount?: number;
  isLiked?: boolean;
}