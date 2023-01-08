import { Controller, Get } from '@nestjs/common';
import { Auth } from 'src/auth/decorator/auth.decorator';
import { User } from './decorators/user.decorator';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @Auth()
  async getProfile(@User('_id') _id: string) {
    return this.userService.byId(_id);
  }
}
