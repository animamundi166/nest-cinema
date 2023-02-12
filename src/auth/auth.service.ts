import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/user/user.schema';
import { AuthDto } from './dto/auth.dto';
import { genSalt, hash, compare } from 'bcrypt';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: AuthDto) {
    const user = await this.validateUser(dto);
    const tokens = await this.issueTokenPair(String(user._id));

    return {
      user: this.returnUserFields(user),
      ...tokens,
    };
  }

  async getNewTokens({ refreshToken }: RefreshTokenDto) {
    if (!refreshToken) {
      throw new UnauthorizedException('Please sign in!');
    }

    const result = await this.jwtService.verifyAsync(refreshToken);
    if (!result) {
      throw new UnauthorizedException('Invalid token or expired');
    }
    const user = await this.userModel.findById(result._id);
    const tokens = await this.issueTokenPair(String(user._id));

    return {
      user: this.returnUserFields(user),
      ...tokens,
    };
  }

  async register(dto: AuthDto) {
    const oldUser = await this.userModel.findOne({ email: dto.email });
    if (oldUser) {
      throw new BadRequestException('User is exists');
    }

    const salt = await genSalt(10);
    const newUser = await this.userModel.create({
      email: dto.email,
      password: await hash(dto.password, salt),
    });

    const tokens = await this.issueTokenPair(String(newUser._id));

    return {
      user: this.returnUserFields(newUser),
      ...tokens,
    };
  }

  async validateUser(dto: AuthDto): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: dto.email });
    const isValidPassword = await compare(dto.password, user.password);

    if (user && isValidPassword) {
      return user;
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async issueTokenPair(userId: string) {
    const data = { _id: userId };

    const accessToken = await this.jwtService.signAsync(data, {
      expiresIn: '6h',
    });

    const refreshToken = await this.jwtService.signAsync(data, {
      expiresIn: '15d',
    });

    return { refreshToken, accessToken };
  }

  returnUserFields(user: UserDocument) {
    return {
      _id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
    };
  }
}
