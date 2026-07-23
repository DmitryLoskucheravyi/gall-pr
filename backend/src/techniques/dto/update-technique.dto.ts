import { PartialType } from '@nestjs/mapped-types';

import { CreateTechniqueDto } from './create-technique.dto';

export class UpdateTechniqueDto extends PartialType(CreateTechniqueDto) {}
