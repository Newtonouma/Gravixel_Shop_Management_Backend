import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../schemas/sale.schema';
import { Product } from '../schemas/product.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale) private saleRepository: Repository<Sale>,
    @InjectRepository(Product) private productRepository: Repository<Product>,
  ) {}

  private getDateRange(period: string) {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'quarterly':
        startDate.setMonth(now.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'semi-annual':
        startDate.setMonth(now.getMonth() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'annual':
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate: now };
  }

  async getSalesAnalytics(userId: string, period: string = 'daily') {
    const { startDate, endDate } = this.getDateRange(period);

    const sales = await this.saleRepository.find({
      where: {
        userId,
      },
    });

    const filteredSales = sales.filter(
      (sale) => sale.saleDate >= startDate && sale.saleDate <= endDate
    );

    // Group sales by date based on period
    const groupedData: any = {};
    
    filteredSales.forEach((sale) => {
      let key: string;
      const saleDate = new Date(sale.saleDate);
      
      switch (period) {
        case 'daily':
          // Group by date
          key = saleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'weekly':
          // Group by week
          const weekStart = new Date(saleDate);
          weekStart.setDate(saleDate.getDate() - saleDate.getDay());
          key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        case 'monthly':
          // Group by month
          key = saleDate.toLocaleDateString('en-US', { month: 'long' });
          break;
        case 'quarterly':
          // Group by quarter
          const quarter = Math.floor(saleDate.getMonth() / 3) + 1;
          key = `Q${quarter} ${saleDate.getFullYear()}`;
          break;
        case 'semi-annual':
          // Group by half year
          const half = saleDate.getMonth() < 6 ? 'H1' : 'H2';
          key = `${half} ${saleDate.getFullYear()}`;
          break;
        case 'annual':
          // Group by year
          key = saleDate.getFullYear().toString();
          break;
        default:
          key = saleDate.toLocaleDateString();
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          date: key,
          totalSales: 0,
          totalQuantity: 0,
          salesCount: 0,
          customers: new Set(),
        };
      }

      groupedData[key].totalSales += Number(sale.total);
      groupedData[key].totalQuantity += Number(sale.quantity);
      groupedData[key].salesCount += 1;
      // Count each sale as a customer transaction
      // If customer name is provided, track unique customers; otherwise count transactions
      if (sale.customer) {
        groupedData[key].customers.add(sale.customer);
      } else {
        // For anonymous sales, add a unique identifier (sale ID) to count as separate customer
        groupedData[key].customers.add(`anonymous_${sale.id}`);
      }
    });

    // Convert to array and calculate averages
    const result = Object.values(groupedData).map((item: any) => ({
      date: item.date,
      totalSales: item.totalSales,
      totalQuantity: item.totalQuantity,
      salesCount: item.salesCount,
      avgOrderValue: item.salesCount > 0 ? item.totalSales / item.salesCount : 0,
      uniqueCustomers: item.customers.size,
    }));

    return result;
  }

  async getTopProducts(userId: string, period: string = 'monthly', limit: number = 10) {
    const { startDate, endDate } = this.getDateRange(period);

    const topProducts = await this.saleRepository
      .createQueryBuilder('sale')
      .leftJoin('sale.product', 'product')
      .select('sale.productId', 'productId')
      .addSelect('sale.productName', 'productName')
      .addSelect('product.sku', 'sku')
      .addSelect('product.category', 'category')
      .addSelect('product.cost', 'cost')
      .addSelect('SUM(sale.quantity)', 'totalQuantity')
      .addSelect('SUM(sale.total)', 'revenue')
      .addSelect('COUNT(*)', 'salesCount')
      .where('sale.userId = :userId', { userId })
      .andWhere('sale.saleDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('sale.productId')
      .addGroupBy('sale.productName')
      .addGroupBy('product.sku')
      .addGroupBy('product.category')
      .addGroupBy('product.cost')
      .orderBy('"revenue"', 'DESC')
      .limit(limit)
      .getRawMany();

    return topProducts.map(product => {
      const revenue = Number(product.revenue);
      const cost = Number(product.cost) * Number(product.totalQuantity);
      const profit = revenue - cost;
      
      return {
        productId: product.productId,
        productName: product.productName,
        sku: product.sku,
        category: product.category,
        totalQuantity: Number(product.totalQuantity),
        revenue: revenue,
        profit: profit,
        salesCount: Number(product.salesCount),
        stockTurnover: 0, // Would need inventory tracking to calculate this properly
      };
    });
  }

  async getCategoryAnalytics(userId: string, period: string = 'monthly') {
    const { startDate, endDate } = this.getDateRange(period);

    const sales = await this.saleRepository.find({
      where: { userId },
    });

    const filteredSales = sales.filter(
      (sale) => sale.saleDate >= startDate && sale.saleDate <= endDate
    );

    const productIds = [...new Set(filteredSales.map((sale) => sale.productId))];
    
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids: productIds })
      .andWhere('product.userId = :userId', { userId })
      .getMany();

    const categoryMap = new Map();
    products.forEach((product) => {
      categoryMap.set(product.id, product.category);
    });

    const categoryStats = {};

    filteredSales.forEach((sale) => {
      const category = categoryMap.get(sale.productId) || 'Unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          category,
          totalSales: 0,
          totalQuantity: 0,
          salesCount: 0,
        };
      }
      categoryStats[category].totalSales += Number(sale.total);
      categoryStats[category].totalQuantity += Number(sale.quantity);
      categoryStats[category].salesCount += 1;
    });

    return Object.values(categoryStats);
  }

  async getSalesTrend(userId: string, period: string = 'monthly', days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const dailySales = await this.saleRepository
      .createQueryBuilder('sale')
      .select("TO_CHAR(sale.saleDate, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(sale.total)', 'totalSales')
      .addSelect('SUM(sale.quantity)', 'totalQuantity')
      .addSelect('COUNT(*)', 'salesCount')
      .where('sale.userId = :userId', { userId })
      .andWhere('sale.saleDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return dailySales.map((item) => ({
      date: item.date,
      totalSales: Number(item.totalSales),
      totalQuantity: Number(item.totalQuantity),
      salesCount: Number(item.salesCount),
    }));
  }

  async getInventoryStatus(userId: string) {
    const products = await this.productRepository.find({ 
      where: { userId, isActive: true } 
    });

    const totalProducts = products.length;
    const lowStockProducts = products.filter((p) => Number(p.stock) <= Number(p.minStock)).length;
    const outOfStockProducts = products.filter((p) => Number(p.stock) === 0).length;
    const totalInventoryValue = products.reduce((sum, p) => sum + Number(p.cost) * Number(p.stock), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + Number(p.price) * Number(p.stock), 0);

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalInventoryValue,
    };
  }

  async getDashboardStats(userId: string) {
    const today = await this.getSalesAnalytics(userId, 'daily');
    const weekly = await this.getSalesAnalytics(userId, 'weekly');
    const monthly = await this.getSalesAnalytics(userId, 'monthly');
    const inventory = await this.getInventoryStatus(userId);

    // Aggregate array data for dashboard
    const aggregateData = (data: any[]) => {
      return data.reduce((acc, item) => ({
        totalSales: acc.totalSales + item.totalSales,
        salesCount: acc.salesCount + item.salesCount,
        uniqueCustomers: acc.uniqueCustomers + item.uniqueCustomers,
      }), { totalSales: 0, salesCount: 0, uniqueCustomers: 0 });
    };

    const todayData = aggregateData(today);
    const weeklyData = aggregateData(weekly);
    const monthlyData = aggregateData(monthly);

    return {
      today: {
        sales: todayData.totalSales,
        orders: todayData.salesCount,
        customers: todayData.uniqueCustomers,
      },
      weekly: {
        sales: weeklyData.totalSales,
        orders: weeklyData.salesCount,
      },
      monthly: {
        sales: monthlyData.totalSales,
        orders: monthlyData.salesCount,
      },
      inventory: {
        totalProducts: inventory.totalProducts,
        lowStock: inventory.lowStockProducts,
        outOfStock: inventory.outOfStockProducts,
        value: inventory.totalInventoryValue,
      },
    };
  }
}
