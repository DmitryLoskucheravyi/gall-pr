import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

// The periods the dashboard offers. A closed set, so the page and the server
// agree on what "a quarter" means and nobody asks for a decade of daily rows.
export const OVERVIEW_PERIODS = [7, 30, 90, 365] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];

export class OverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn(OVERVIEW_PERIODS)
  days?: OverviewPeriod;
}
