import { Exclude } from 'class-transformer';
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
export class Doctor {
  @PrimaryColumn('uuid')
  userId: string;

  @Column()
  ospidal: string;

  @OneToOne(() => User, (user) => user.doctor, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Exclude()
  @OneToMany(() => EHR, (ehr) => ehr.createdBy, {
    nullable: true,
  })
  ehr: EHR[];
}
