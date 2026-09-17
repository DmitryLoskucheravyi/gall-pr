import {
  IsBooleanString,
  IsIn,
  IsNumberString,
  IsOptional,
} from 'class-validator';

import { PAINTING_SORTS, type PaintingSort } from '../paintings.service';

// Query strings only ever carry text, so these validate the shape and the
// controller clamps the values — see the note there about why a stale ?page=
// must not be an error page.
export class GetPaintingsDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsNumberString()
  techniqueId?: string;

  @IsOptional()
  @IsNumberString()
  materialId?: string;

  @IsOptional()
  @IsNumberString()
  seriesId?: string;

  @IsOptional()
  @IsBooleanString()
  isAvailable?: string;

  @IsOptional()
  @IsNumberString()
  minPrice?: string;

  @IsOptional()
  @IsNumberString()
  maxPrice?: string;

  // Rejected rather than clamped: an unknown sort is a bug in the caller, and
  // silently sorting by something else hides it.
  @IsOptional()
  @IsIn(PAINTING_SORTS as readonly string[])
  sort?: PaintingSort;
}
