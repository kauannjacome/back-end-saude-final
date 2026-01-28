import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException
} from '@nestjs/common';
import { TermsService } from './terms.service';
import { AuthTokenGuard } from '../auth/guard/auth-token-guard';
import { TokenPayloadParam } from '../auth/param/token-payload.param';

@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) { }

  // Criar novo termo (apenas admin_manager)
  @UseGuards(AuthTokenGuard)
  @Post()
  create(
    @Body() body: { version: string; title: string; content: string },
    @TokenPayloadParam() payload: any
  ) {
    if (payload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode criar termos de uso.');
    }
    return this.termsService.create(body);
  }

  // Listar todos os termos (apenas admins)
  @UseGuards(AuthTokenGuard)
  @Get()
  findAll(@TokenPayloadParam() payload: any) {
    if (payload.role !== 'ADMIN_MANAGER' && payload.role !== 'ADMIN_MUNICIPAL') {
      throw new ForbiddenException('Apenas administradores podem listar todos os termos.');
    }
    return this.termsService.findAll();
  }

  // Buscar termo ativo (público para usuários logados)
  @UseGuards(AuthTokenGuard)
  @Get('active')
  findActive() {
    return this.termsService.findActive();
  }

  // Verificar se usuário precisa aceitar termos
  @UseGuards(AuthTokenGuard)
  @Get('check-status')
  checkStatus(@TokenPayloadParam() payload: any) {
    return this.termsService.checkUserTermsStatus(payload.user_id);
  }

  // Buscar termo por ID (apenas admins)
  @UseGuards(AuthTokenGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @TokenPayloadParam() payload: any) {
    if (payload.role !== 'ADMIN_MANAGER' && payload.role !== 'ADMIN_MUNICIPAL') {
      throw new ForbiddenException('Apenas administradores podem visualizar termos por ID.');
    }
    return this.termsService.findOne(+id);
  }

  // Atualizar termo (apenas admin_manager)
  @UseGuards(AuthTokenGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string },
    @TokenPayloadParam() payload: any
  ) {
    if (payload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode editar termos de uso.');
    }
    return this.termsService.update(+id, body);
  }

  // Ativar termo (apenas admin_manager)
  @UseGuards(AuthTokenGuard)
  @Patch(':id/activate')
  activate(@Param('id') id: string, @TokenPayloadParam() payload: any) {
    if (payload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode ativar termos de uso.');
    }
    return this.termsService.activate(+id);
  }

  // Remover termo (apenas admin_manager)
  @UseGuards(AuthTokenGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @TokenPayloadParam() payload: any) {
    if (payload.role !== 'ADMIN_MANAGER') {
      throw new ForbiddenException('Apenas ADMIN_MANAGER pode remover termos de uso.');
    }
    return this.termsService.remove(+id);
  }
}
