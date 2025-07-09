import { User } from 'src/user/user.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity()
export class Patient {
  @Column()
  ssn: string;

  @OneToOne(() => User, (user) => user.patient, {
    nullable: false,
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  user: User;
}
