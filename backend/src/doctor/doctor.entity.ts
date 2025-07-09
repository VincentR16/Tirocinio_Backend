import { User } from 'src/user/user.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity()
export class Doctor {
  @PrimaryColumn()
  userId: string;

  @Column()
  ospidal: string;

  @OneToOne(() => User, (user) => user.doctor, {
    nullable: false,
    cascade: true,
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
