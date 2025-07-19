import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("transitions")
@Unique(["chainId", "fromState", "toState"])
export class Transition {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("bigint")
  chainId!: number;

  @Column("text")
  fromState!: string;

  @Column("text")
  toState!: string;

  @Column()
  frequency!: number;
}
