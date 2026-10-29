import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// One route for both signing in and signing up with Google.
//
// `credential` is the ID token Google Identity Services hands the page. On its
// own it is enough for anyone who already has an account. A first-time visitor
// is asked for the one thing Google doesn't give us and every order needs — a
// phone number — and the page resends the same credential with it. The names
// may be corrected on that step too; when absent, Google's are used.
export class GoogleAuthDto {
  // A JWT; Google's are around 1–1.5 kB. The ceiling is generous on purpose
  // and exists only so nobody can post a megabyte at the verifier.
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  credential: string;

  @IsOptional()
  @IsPhoneNumber('UA')
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;
}
