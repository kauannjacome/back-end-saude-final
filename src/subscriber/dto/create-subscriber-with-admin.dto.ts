import { Type } from 'class-transformer';
import { ValidateNested, IsDefined } from 'class-validator';
import { CreateSubscriberDto } from './create-subscriber.dto';
import { CreateAdminUserDto } from './create-admin-user.dto';

export class CreateSubscriberWithAdminDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateSubscriberDto)
  subscriber: CreateSubscriberDto;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateAdminUserDto)
  admin: CreateAdminUserDto;
}
