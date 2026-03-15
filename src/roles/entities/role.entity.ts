import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

import { User } from 'src/modules/users/entities/user.entity';

@Entity('roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => User, (user: any) => user.role)
  users: User[];
}
