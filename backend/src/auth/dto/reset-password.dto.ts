import {
  IsHexadecimal,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  // 32 random bytes, hex-encoded — see AuthService.requestPasswordReset. Pinned
  // to the exact shape so anything else is rejected before it reaches a query.
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
