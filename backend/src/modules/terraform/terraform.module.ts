import { Module } from '@nestjs/common';
import { TerraformService } from './terraform.service';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [TemplatesModule],
  providers: [TerraformService],
  exports: [TerraformService],
})
export class TerraformModule {}
