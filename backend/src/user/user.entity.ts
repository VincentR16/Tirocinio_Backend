import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRoles } from 'src/common/types/userRoles';
import { Session } from '../auth/session.entity';
import { Patient } from 'src/patient/patient.entity';
import { Doctor } from 'src/doctor/doctor.entity';

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

  @Column({ nullable: true })
  location: string;

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

  @Column({ nullable: true })
  twoFactorAuthenticationSecret: string;

  @Exclude()
  @OneToMany(() => Session, (session) => session.user, {
    nullable: true,
    eager: true,
  })
  session: Session[];

  @OneToOne(() => Patient, (patient) => patient.user, { eager: true })
  patient?: Patient;

  @OneToOne(() => Doctor, (doctor) => doctor.user, { eager: true })
  doctor?: Doctor;
}
