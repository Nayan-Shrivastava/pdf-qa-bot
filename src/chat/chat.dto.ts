import { IsNotEmpty, IsString, Length } from 'class-validator';

export class QuestionDTO {
  @IsNotEmpty()
  @IsString()
  @Length(10, 250)
  question: string;
}
export class FileNameDTO {
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  fileName: string;
}
