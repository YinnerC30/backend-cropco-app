import { IsInt, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';

export class HarvestStockDto {
  @ApiProperty({
    description: 'ID del cultivo asociado',
    type: () => ValidateUUID,
  })
  @IsUUID()
  crop: DeepPartial<Crop>;

  @ApiProperty({
    description: 'Cantidad total del cultivo cosechado',
    example: 100,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  total: number;
}
