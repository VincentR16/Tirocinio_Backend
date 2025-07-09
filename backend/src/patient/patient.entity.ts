import { User } from 'src/user/user.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class Patient {
  @PrimaryColumn()
  userId: string;
  @Column()
  ssn: string;

  @OneToOne(() => User, (user) => user.patient, {
    nullable: false,
    cascade: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
