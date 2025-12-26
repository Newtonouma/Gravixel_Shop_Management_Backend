import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.schema';
import { Sale } from './sale.schema';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, user => user.products)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minStock: number;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Sale, sale => sale.product)
  sales: Sale[];
}
