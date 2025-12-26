import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Product } from './product.schema';
import { Sale } from './sale.schema';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  shopName: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: 'owner' })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Product, product => product.user)
  products: Product[];

  @OneToMany(() => Sale, sale => sale.user)
  sales: Sale[];
}
