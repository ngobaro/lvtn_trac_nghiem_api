import { SetMetadata } from '@nestjs/common';
import { VaiTro } from '../enums/vai-tro.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: VaiTro[]) => SetMetadata(ROLES_KEY, roles);
