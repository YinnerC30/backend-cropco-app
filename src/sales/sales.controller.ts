import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { QueryParams } from 'src/common/dto/QueryParams';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new sale' })
  @ApiResponse({
    status: 201,
    description: 'The sale has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sales' })
  @ApiResponse({ status: 200, description: 'Return all sales.' })
  @ApiQuery({ type: QueryParams })
  findAll(@Query() queryParams: QueryParams) {
    return this.salesService.findAll(queryParams);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a sale by id' })
  @ApiResponse({ status: 200, description: 'Return the sale.' })
  @ApiResponse({ status: 404, description: 'Sale not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Sale id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sale' })
  @ApiResponse({
    status: 200,
    description: 'The sale has been successfully updated.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Sale not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Sale id' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sale' })
  @ApiResponse({
    status: 200,
    description: 'The sale has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Sale not found.' })
  @ApiParam({ name: 'id', type: 'string', description: 'Sale id' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.remove(id);
  }
}
