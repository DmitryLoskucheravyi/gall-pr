import { ArrayMaxSize, IsArray, IsInt, Min } from 'class-validator';

// "These and only these works belong to the series" — sent from the series'
// own screen so an admin doesn't have to open every painting in turn.
export class SetSeriesPaintingsDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  // A series is a body of work, not the whole catalogue; a list longer than
  // this is a mistake or a paste.
  @ArrayMaxSize(500)
  paintingIds: number[];
}
