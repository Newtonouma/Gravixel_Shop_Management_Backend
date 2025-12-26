import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Request() req, @Body() createProductDto: CreateProductDto) {
    return this.productsService.create(req.user.userId, createProductDto);
  }

  @Get()
  findAll(@Request() req, @Query('category') category?: string, @Query('search') search?: string) {
    return this.productsService.findAll(req.user.userId, category, search);
  }

  @Get('categories')
  getCategories(@Request() req) {
    return this.productsService.getCategories(req.user.userId);
  }

  @Get('low-stock')
  getLowStock(@Request() req) {
    return this.productsService.getLowStock(req.user.userId);
  }

  @Get('barcode/:barcode')
  findByBarcode(@Request() req, @Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(req.user.userId, barcode);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.productsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(req.user.userId, id, updateProductDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.productsService.remove(req.user.userId, id);
  }
}
