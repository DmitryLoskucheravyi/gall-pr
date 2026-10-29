import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// One route for both signing in and signing up with Google.
//
// Either `credential` — the ID token Google's own rendered button hands the
// page — or `accessToken`, from the token client behind the site's own
// button. One of the two is required; on its own it is enough for anyone who
// already has an account. A first-time visitor
// is asked for the one thing Google doesn't give us and every order needs — a
// phone number — and the page resends the same credential with it. The names
// may be corrected on that step too; when absent, Google's are used.
export class GoogleAuthDto {
  // A JWT; Google's are around 1–1.5 kB. The ceiling is generous on purpose
  // and exists only so nobody can post a megabyte at the verifier.
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  credential?: string;

  // Google's access tokens are ~200 characters; the same generous ceiling.
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  accessToken?: string;

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
