import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("users")
@Unique(["userId", "chainId"])
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("bigint")
  userId!: number;

  @Column("bigint")
  chainId!: number;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  username?: string;
}
