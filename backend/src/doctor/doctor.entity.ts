import { Exclude } from 'class-transformer';
import { Comunication } from 'src/comunication/comunication.entity';
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
    eager: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Exclude()
  @OneToMany(() => EHR, (ehr) => ehr.createdBy, {
    nullable: true,
  })
  ehr: EHR[];

  @Exclude()
  @OneToMany(() => Comunication, (comunication) => comunication.doctor, {
    nullable: true,
  })
  comunication: Comunication[];
}
