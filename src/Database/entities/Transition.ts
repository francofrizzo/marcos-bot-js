import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("transitions")
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
