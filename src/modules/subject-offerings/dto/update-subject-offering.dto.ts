import { PartialType } from '@nestjs/mapped-types';
import { CreateSubjectOfferingDto } from './create-subject-offering.dto';

export class UpdateSubjectOfferingDto extends PartialType(
  CreateSubjectOfferingDto,
) {}
