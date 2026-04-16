import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('property_likes')
@Unique(['user_id', 'property_id'])
export class PropertyLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: string;

  @Column()
  property_id: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Property, (property) => property.likes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'property_id' })
  property: Property;
}
