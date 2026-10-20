import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class GenerateTemplateDto {
    @IsString()
    @IsNotEmpty({ message: 'La descripción no puede estar vacía.' })
    @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres.' })
    @MaxLength(3000, { message: 'La descripción no puede exceder los 3000 caracteres.' })
    description: string;

    @IsString()
    name?: string;
}

export class RefineTemplateDto {
    @IsString()
    @IsNotEmpty({ message: 'El prompt no puede estar vacío.' })
    @MinLength(5, { message: 'El prompt debe tener al menos 5 caracteres.' })
    @MaxLength(1000, { message: 'El prompt no puede exceder los 1000 caracteres.' })
    prompt: string;
}
