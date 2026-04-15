import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  conversationId: string;

  @Column()
  senderId: string;

  @Column({ length: 100 })
  senderName: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
