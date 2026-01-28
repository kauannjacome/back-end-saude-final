import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TermsService {
  constructor(private prisma: PrismaService) { }

  // Criar novo termo de uso (apenas admin_manager)
  async create(data: { version: string; title: string; content: string }) {
    // Verificar se versão já existe
    const existingVersion = await this.prisma.termsOfUse.findUnique({
      where: { version: data.version }
    });

    if (existingVersion) {
      throw new HttpException(
        `Já existe um termo com a versão ${data.version}`,
        HttpStatus.BAD_REQUEST
      );
    }

    return this.prisma.termsOfUse.create({
      data: {
        version: data.version,
        title: data.title,
        content: data.content,
        isActive: false
      }
    });
  }

  // Listar todos os termos
  async findAll() {
    return this.prisma.termsOfUse.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uuid: true,
        version: true,
        title: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  // Buscar termo por ID
  async findOne(id: number) {
    const term = await this.prisma.termsOfUse.findFirst({
      where: { id, deletedAt: null }
    });

    if (!term) {
      throw new NotFoundException(`Termo de uso #${id} não encontrado`);
    }

    return term;
  }

  // Buscar termo ativo (versão atual)
  async findActive() {
    const term = await this.prisma.termsOfUse.findFirst({
      where: { isActive: true, deletedAt: null }
    });

    if (!term) {
      throw new NotFoundException('Nenhum termo de uso ativo encontrado');
    }

    return term;
  }

  // Atualizar termo
  async update(id: number, data: { title?: string; content?: string }) {
    const term = await this.prisma.termsOfUse.findFirst({
      where: { id, deletedAt: null }
    });

    if (!term) {
      throw new NotFoundException(`Termo de uso #${id} não encontrado`);
    }

    if (term.isActive) {
      throw new HttpException(
        'Não é possível editar um termo ativo. Desative-o primeiro ou crie uma nova versão.',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.prisma.termsOfUse.update({
      where: { id },
      data: {
        title: data.title ?? term.title,
        content: data.content ?? term.content
      }
    });
  }

  // Ativar termo (desativa todos os outros)
  async activate(id: number) {
    const term = await this.prisma.termsOfUse.findFirst({
      where: { id, deletedAt: null }
    });

    if (!term) {
      throw new NotFoundException(`Termo de uso #${id} não encontrado`);
    }

    // Desativar todos os termos
    await this.prisma.termsOfUse.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Ativar o termo selecionado
    await this.prisma.termsOfUse.update({
      where: { id },
      data: { isActive: true }
    });

    return {
      message: `Termo versão ${term.version} ativado com sucesso`,
      version: term.version
    };
  }

  // Soft delete
  async remove(id: number) {
    const term = await this.prisma.termsOfUse.findFirst({
      where: { id, deletedAt: null }
    });

    if (!term) {
      throw new NotFoundException(`Termo de uso #${id} não encontrado`);
    }

    if (term.isActive) {
      throw new HttpException(
        'Não é possível remover um termo ativo. Desative-o primeiro.',
        HttpStatus.BAD_REQUEST
      );
    }

    return this.prisma.termsOfUse.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  // Verificar se usuário precisa aceitar novos termos
  async checkUserTermsStatus(userId: number) {
    const professional = await this.prisma.professional.findUnique({
      where: { id: userId },
      select: {
        acceptedTerms: true,
        acceptedTermsVersion: true
      }
    });

    if (!professional) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const activeTerm = await this.prisma.termsOfUse.findFirst({
      where: { isActive: true, deletedAt: null }
    });

    if (!activeTerm) {
      return {
        needs_acceptance: false,
        message: 'Nenhum termo de uso ativo'
      };
    }

    const needsAcceptance =
      !professional.acceptedTerms ||
      professional.acceptedTermsVersion !== activeTerm.version;

    return {
      needs_acceptance: needsAcceptance,
      current_version: activeTerm.version,
      user_accepted_version: professional.acceptedTermsVersion,
      term: needsAcceptance ? {
        id: activeTerm.id,
        version: activeTerm.version,
        title: activeTerm.title,
        content: activeTerm.content
      } : null
    };
  }
}
