import { IsInt, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';

export class HarvestStockDto {
  @ApiProperty({
    description: 'ID del cultivo asociado',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  crop: DeepPartial<Crop>;

  @ApiProperty({
    description: 'Cantidad total del cultivo cosechado',
    example: 100
  })
  @IsInt()
  @IsPositive()
  total: number;
}
