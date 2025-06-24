import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRoles } from 'src/common/types/user_roles';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  surname: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  gender: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRoles })
  role: UserRoles;

  @Column()
  @Exclude()
  password: string;
}
