import { IsString, IsNotEmpty, IsIn, MaxLength, MinLength } from 'class-validator';

export class GenerateScriptDto {
    @IsString()
    @IsNotEmpty({ message: 'El prompt no puede estar vacío.' })
    @MinLength(10, { message: 'El prompt debe tener al menos 10 caracteres.' })
    @MaxLength(2000, { message: 'El prompt no puede exceder los 2000 caracteres.' })
    prompt: string;

    @IsString()
    @IsNotEmpty({ message: 'El lenguaje es requerido.' })
    @IsIn(['powershell', 'bash'], { message: 'El lenguaje debe ser "powershell" o "bash".' })
    language: string;
}
