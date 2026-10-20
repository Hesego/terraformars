import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RefineScriptDto {
    @IsString()
    @IsNotEmpty({ message: 'El prompt de refinamiento no puede estar vacío.' })
    @MinLength(5, { message: 'El prompt debe tener al menos 5 caracteres.' })
    @MaxLength(1000, { message: 'El prompt no puede exceder los 1000 caracteres.' })
    prompt: string;
}
