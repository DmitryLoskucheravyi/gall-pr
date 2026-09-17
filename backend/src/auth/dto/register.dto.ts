import {
  IsEmail,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Every field here lands in a sized column, so every field carries its own
// ceiling. Without one, a 100 kB "first name" is a 500 from the driver rather
// than the 400 it is.
export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  // Eight, not six. Six characters is inside brute-force range for an offline
  // attack on a leaked hash, and this is the one credential the customer picks
  // themselves.
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsPhoneNumber('UA')
  @MaxLength(20)
  phone: string;
}
