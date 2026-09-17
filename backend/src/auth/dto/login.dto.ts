import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  // No MinLength: an existing account may well have a shorter password than
  // registration accepts today, and refusing to *check* it would lock its
  // owner out over a rule that came after them.
  @IsString()
  @MaxLength(128)
  password: string;
}
