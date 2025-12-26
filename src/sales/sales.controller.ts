import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto, CreateMultipleSalesDto } from './dto/sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Request() req, @Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(req.user.userId, createSaleDto);
  }

  @Post('multiple')
  createMultiple(@Request() req, @Body() createMultipleSalesDto: CreateMultipleSalesDto) {
    return this.salesService.createMultiple(req.user.userId, createMultipleSalesDto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.salesService.findAll(req.user.userId, start, end);
  }

  @Get('today')
  getTodaysSales(@Request() req) {
    return this.salesService.getTodaysSales(req.user.userId);
  }

  @Get('today/total')
  getTodaysTotal(@Request() req) {
    return this.salesService.getTodaysTotal(req.user.userId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.salesService.findOne(req.user.userId, id);
  }
}
