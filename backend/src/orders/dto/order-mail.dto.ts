import { IsOptional, IsString, MaxLength } from 'class-validator';

// The admin's edits from the letter preview. Both optional: an untouched
// preview sends the template's own wording, exactly as before.
//
// The HTML is the admin's, sent to a customer from the shop's address — admin
// only, and never rendered with scripts anywhere in the app (the outbox shows
// letters in a sandboxed iframe). The ceiling sits under the JSON body limit;
// the shop's letters are 5–10 kB.
export class OrderMailDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80_000)
  html?: string;
}
