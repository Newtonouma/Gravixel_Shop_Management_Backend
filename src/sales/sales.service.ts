import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Sale } from '../schemas/sale.schema';
import { ProductsService } from '../products/products.service';
import { CreateSaleDto, CreateMultipleSalesDto } from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale) private saleRepository: Repository<Sale>,
    private productsService: ProductsService,
  ) {}

  async create(userId: string, createSaleDto: CreateSaleDto) {
    const { productId, quantity, price, customer } = createSaleDto;

    // Get product
    const product = await this.productsService.findOne(userId, productId);

    // Check stock
    if (Number(product.stock) < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    // Update product stock
    await this.productsService.updateStock(userId, productId, quantity);

    // Create sale
    const sale = this.saleRepository.create({
      userId,
      productId,
      productName: product.name,
      quantity,
      price,
      total: quantity * price,
      customer,
      saleDate: new Date(),
    });

    return this.saleRepository.save(sale);
  }

  async createMultiple(userId: string, createMultipleSalesDto: CreateMultipleSalesDto) {
    const { items, customer } = createMultipleSalesDto;
    const sales: Sale[] = [];

    for (const item of items) {
      const product = await this.productsService.findOne(userId, item.productId);

      if (Number(product.stock) < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      await this.productsService.updateStock(userId, item.productId, item.quantity);

      const sale = this.saleRepository.create({
        userId,
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
        customer,
        saleDate: new Date(),
      });

      sales.push(await this.saleRepository.save(sale));
    }

    return sales;
  }

  async findAll(userId: string, startDate?: Date, endDate?: Date) {
    const queryBuilder = this.saleRepository
      .createQueryBuilder('sale')
      .where('sale.userId = :userId', { userId });

    if (startDate && endDate) {
      queryBuilder.andWhere('sale.saleDate BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      queryBuilder.andWhere('sale.saleDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('sale.saleDate <= :endDate', { endDate });
    }

    return queryBuilder.orderBy('sale.saleDate', 'DESC').getMany();
  }

  async findOne(userId: string, id: string) {
    return this.saleRepository.findOne({ where: { id, userId } });
  }

  async getTodaysSales(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.findAll(userId, startOfDay, endOfDay);
  }

  async getTodaysTotal(userId: string) {
    const sales = await this.getTodaysSales(userId);
    const total = sales.reduce((sum, sale) => sum + sale.total, 0);
    return { total, count: sales.length };
  }
}
