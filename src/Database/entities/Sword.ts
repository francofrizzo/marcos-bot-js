import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("swords")
@Unique(["chainId", "setName", "word"])
export class Sword {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("bigint")
  chainId!: number;

  @Column("text")
  setName!: string;

  @Column("text")
  word!: string;
}
