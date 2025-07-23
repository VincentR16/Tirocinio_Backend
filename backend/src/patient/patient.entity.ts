import { EHR } from 'src/ehr/ehr.entity';
import { User } from 'src/user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class Patient {
  @PrimaryColumn()
  userId: string;
  @Column()
  ssn: string;

  @OneToOne(() => User, (user) => user.patient, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => EHR, (ehr) => ehr.patient, {
    nullable: true,
    eager: true,
  })
  ehr: EHR[];
}
