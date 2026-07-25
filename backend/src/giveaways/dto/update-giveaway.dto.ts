import { PartialType } from '@nestjs/mapped-types';

import { CreateGiveawayDto } from './create-giveaway.dto';

export class UpdateGiveawayDto extends PartialType(CreateGiveawayDto) {}
