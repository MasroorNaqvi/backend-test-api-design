import { Controller, Get, Param, Query } from '@nestjs/common';
import { FacebookService } from '../services/facebook.service';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Facebook Repos')
@Controller('api/facebook')
export class FacebookController {
  constructor(private readonly facebookService: FacebookService) {}

  @ApiOperation({ summary: 'Get new contributors for a given year' })
  @ApiParam({ name: 'repoName', required: true })
  @ApiParam({ name: 'year', required: true })
  @ApiQuery({ name: 'refetch', required: false })
  @Get(':repoName/:year')
  getByYear(
    @Param('repoName') repoName: string,
    @Param('year') year: string,
    @Query('refetch') refetch?: string,
  ) {
    return this.facebookService.computeNewContributors(
      repoName,
      year,
      undefined,
      refetch === 'true',
    );
  }
  @ApiOperation({ summary: 'Get new contributors for a given year and month' })
  @ApiParam({ name: 'repoName', required: true })
  @ApiParam({ name: 'year', required: true })
  @ApiParam({ name: 'month', required: true })
  @ApiQuery({ name: 'refetch', required: false })
  @Get(':repoName/:year/:month')
  getByYearAndMonth(
    @Param('repoName') repoName: string,
    @Param('year') year: string,
    @Param('month') month: string,
    @Query('refetch') refetch?: string,
  ) {
    return this.facebookService.computeNewContributors(
      repoName,
      year,
      month,
      refetch === 'true',
    );
  }
}
