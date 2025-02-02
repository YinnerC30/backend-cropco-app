import { Controller, Get, Query } from '@nestjs/common';
import { EmployeesService } from 'src/employees/employees.service';
import { DashboardService } from './dashboard.service';
import { QueryTopEmployeesInWorkDto } from 'src/employees/dto/query-top-employees-in-work';
import { QueryTopEmployeesInHarvestDto } from 'src/employees/dto/query-top-employees-in-harvest';
import { PathsController } from 'src/common/interfaces/PathsController';
import { ClientsService } from 'src/clients/clients.service';
import { QueryForYear } from 'src/common/dto/QueryForYear';
import { CropsService } from 'src/crops/crops.service';
import { HarvestService } from 'src/harvest/harvest.service';
import { QueryTotalHarvestsInYearDto } from 'src/harvest/dto/query-total-harvests-year';
import { WorkService } from 'src/work/work.service';
import { QueryTotalWorksInYearDto } from 'src/work/dto/query-total-works-year';
import { QueryTotalSalesInYearDto } from 'src/sales/dto/query-total-sales-year';
import { SalesService } from 'src/sales/sales.service';
import { ConsumptionsService } from 'src/consumptions/consumptions.service';
import { Auth } from 'src/auth/decorators/auth.decorator';

export const pathsDashboardController: PathsController = {
  findTopEmployeesInHarvests: {
    path: 'find/top-employees-in-harvests',
    description: 'Obtener los 10 empleados con mayor cosechas',
    name: 'find_top_employees_in_harvests',
  },
  findTopEmployeesInWorks: {
    path: 'find/top-employees-in-works',
    description:
      'Obtener los 10 empleados con mayor participación en el trabajo',
    name: 'find_top_employees_in_works',
  },
  findAllCropsStock: {
    path: 'stock/all',
    description: 'obtener el stock de todos los cultivos',
    name: 'find_all_crops_stock',
  },
  findTopClientsInSales: {
    path: 'find/top-clients-in-sales',
    description: 'Obtener los 5 clientes con mayores ventas en el año',
    name: 'find_top_clients_in_sales',
  },
  findCountHarvestsAndTotalStock: {
    path: 'find/count-harvest-and-total-stock',
    description: 'Cantidad de cosechas realizadas al cultivo y su stock total',
    name: 'find_count_harvests_and_total_stock',
  },
  findTotalHarvestInYearAndPreviusYear: {
    path: 'find/total-harvest-in-year',
    description: 'Obtener el total de las cosechas por mes durante el año',
    name: 'find_total_harvest_in_year',
  },
  findTotalWorkInYearAndPreviusYear: {
    path: 'find/total-work-in-year',
    description: 'Obtener el total de los trabajos por mes durante el año',
    name: 'find_total_work_in_year',
  },
  findTotalSalesInYearAndPreviusYear: {
    path: 'find/total-sales-in-year',
    description: 'Obtener el total de las ventas por mes durante el año',
    name: 'find_total_sales_in_year',
  },
  findTotalConsumptionsInYearAndPreviusYear: {
    path: 'find/total-consumptions-in-year',
    description: 'Obtener el total de los consumos por mes durante el año',
    name: 'find_total_consumptions_in_year',
  },
};

const {
  findTopEmployeesInHarvests,
  findTopEmployeesInWorks,
  findTopClientsInSales,
  findCountHarvestsAndTotalStock,
  findTotalHarvestInYearAndPreviusYear,
  findTotalWorkInYearAndPreviusYear,
  findTotalSalesInYearAndPreviusYear,
  findTotalConsumptionsInYearAndPreviusYear,
  findAllCropsStock,
} = pathsDashboardController;

@Auth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly clientsService: ClientsService,
    private readonly cropsService: CropsService,
    private readonly harvestService: HarvestService,
    private readonly workService: WorkService,
    private readonly salesService: SalesService,
    private readonly consumptionsService: ConsumptionsService,
  ) {}

  //* Employees

  @Get(findTopEmployeesInHarvests.path)
  async findTopEmployeesInHarvests(
    @Query() params: QueryTopEmployeesInHarvestDto,
  ) {
    return this.employeesService.findTopEmployeesInHarvests(params);
  }
  @Get(findTopEmployeesInWorks.path)
  async findTopEmployeesInWorks(@Query() params: QueryTopEmployeesInWorkDto) {
    return this.employeesService.findTopEmployeesInWorks(params);
  }

  //* Clients
  @Get(findTopClientsInSales.path)
  async findTopClientsInSales(@Query() params: QueryForYear) {
    return this.clientsService.findTopClientsInSales(params);
  }

  // * Crops
  @Get(findCountHarvestsAndTotalStock.path)
  async findCountHarvestsAndTotalStock(@Query() params: QueryForYear) {
    return this.cropsService.findCountHarvestsAndTotalStock(params);
  }

  @Get(findAllCropsStock.path)
  findAllHarvestStock() {
    return this.cropsService.findAllCropsWithStock();
  }

  // * Harvests
  @Get(findTotalHarvestInYearAndPreviusYear.path)
  async findTotalHarvestInYear(@Query() params: QueryTotalHarvestsInYearDto) {
    return this.harvestService.findTotalHarvestInYear(params);
  }

  // * Works
  @Get(findTotalWorkInYearAndPreviusYear.path)
  async findTotalWorkInYear(@Query() params: QueryTotalWorksInYearDto) {
    return this.workService.findTotalWorkInYear(params);
  }

  // * Sales
  @Get(findTotalSalesInYearAndPreviusYear.path)
  async findTotalSalesInYear(@Query() params: QueryTotalSalesInYearDto) {
    return this.salesService.findTotalSalesInYear(params);
  }

  // * Consumptions

  @Get(findTotalConsumptionsInYearAndPreviusYear.path)
  async findTotalConsumptionsInYearAndPreviusYear(@Query() params: any) {
    return this.consumptionsService.findTotalConsumptionsInYearAndPreviusYear(
      params,
    );
  }
}
