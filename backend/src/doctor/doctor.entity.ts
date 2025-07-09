import { User } from 'src/user/user.entity';
import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

@Entity()
export class Doctor {
  @Column()
  ospidal: string;

  @OneToOne(() => User, (user) => user.doctor, {
    nullable: false,
    cascade: true,
    eager: true,
  })
  @JoinColumn()
  user: User;
}
