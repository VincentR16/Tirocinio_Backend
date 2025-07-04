import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRoles } from 'src/common/types/userRoles';
import { Session } from '../auth/session.entity';

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

  @Exclude()
  @OneToMany(() => Session, (session) => session.user, {
    nullable: true,
    eager: true,
  })
  session: Session[];
}
