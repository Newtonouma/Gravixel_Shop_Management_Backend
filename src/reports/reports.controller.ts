import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('analytics')
  getSalesAnalytics(
    @Request() req,
    @Query('period') period: string = 'daily',
  ) {
    return this.reportsService.getSalesAnalytics(req.user.userId, period);
  }

  @Get('top-products')
  getTopProducts(
    @Request() req,
    @Query('period') period: string = 'monthly',
    @Query('limit') limit: number = 10,
  ) {
    return this.reportsService.getTopProducts(req.user.userId, period, limit);
  }

  @Get('categories')
  getCategoryAnalytics(
    @Request() req,
    @Query('period') period: string = 'monthly',
  ) {
    return this.reportsService.getCategoryAnalytics(req.user.userId, period);
  }

  @Get('trends')
  getSalesTrend(
    @Request() req,
    @Query('period') period: string = 'monthly',
    @Query('days') days: number = 30,
  ) {
    return this.reportsService.getSalesTrend(req.user.userId, period, days);
  }

  @Get('inventory')
  getInventoryStatus(@Request() req) {
    return this.reportsService.getInventoryStatus(req.user.userId);
  }

  @Get('dashboard')
  getDashboardStats(@Request() req) {
    return this.reportsService.getDashboardStats(req.user.userId);
  }
}
