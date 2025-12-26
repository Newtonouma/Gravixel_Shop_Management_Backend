import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, LessThan } from 'typeorm';
import { Product } from '../schemas/product.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
  ) {}

  async create(userId: string, createProductDto: CreateProductDto) {
    const product = this.productRepository.create({
      ...createProductDto,
      userId,
    });
    return this.productRepository.save(product);
  }

  async findAll(userId: string, category?: string, search?: string) {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.userId = :userId', { userId })
      .andWhere('product.isActive = :isActive', { isActive: true });

    if (category && category !== 'all') {
      queryBuilder.andWhere('product.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    return queryBuilder.orderBy('product.createdAt', 'DESC').getMany();
  }

  async findOne(userId: string, id: string) {
    const product = await this.productRepository.findOne({ 
      where: { id, userId } 
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findByBarcode(userId: string, barcode: string) {
    // Search by name, barcode, or SKU
    const product = await this.productRepository
      .createQueryBuilder('product')
      .where('product.userId = :userId', { userId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere(
        '(product.barcode = :barcode OR product.sku = :barcode OR product.name ILIKE :search)',
        { barcode, search: `%${barcode}%` }
      )
      .getOne();
      
    if (!product) {
      throw new NotFoundException('Product not found. Please add it to inventory first.');
    }
    return product;
  }

  async update(userId: string, id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(userId, id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(userId: string, id: string) {
    const product = await this.findOne(userId, id);
    product.isActive = false;
    await this.productRepository.save(product);
    return { message: 'Product deleted successfully' };
  }

  async updateStock(userId: string, productId: string, quantity: number) {
    const product = await this.findOne(userId, productId);
    product.stock = Number(product.stock) - quantity;
    return this.productRepository.save(product);
  }

  async getCategories(userId: string) {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.userId = :userId', { userId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .getRawMany();
    return result.map(r => r.category);
  }

  async getLowStock(userId: string) {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.userId = :userId', { userId })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.stock < product.minStock')
      .getMany();
  }
}
