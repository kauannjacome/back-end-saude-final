
import { ZapService } from '../../zap/service';
import { status, Prisma } from '@prisma/client';

export type RegulationWithPatientAndCares = Prisma.regulationGetPayload<{
  include: {
    patient: true;
    cares: {
      include: {
        care: true;
      };
    };
  };
}>;

export async function sendRegulationStatusMessage(
  updated: RegulationWithPatientAndCares,
  status: status,
  subscriber_id: number,
  zapService: ZapService
) {
  try {
    const patientName = updated.patient?.name?.split(' ')[0] || 'Paciente';
    const isPlural = updated.cares.length > 1;

    let text = '';

    switch (status) {
      case 'in_progress':
        text = `Olá *${patientName}*, sua solicitação está *Em Análise* por nossa equipe técnica. Em breve você receberá novas atualizações.`;
        break;
      case 'approved':
        text = `Olá *${patientName}*, temos ótimas notícias! Sua solicitação foi *Aprovada*. Aguarde, em breve entraremos em contato com detalhes sobre o agendamento.`;
        break;
      case 'denied':
        text = `Olá *${patientName}*, atualizamos o status da sua solicitação para *denied* após análise técnica. Para compreender o motivo ou regularizar pendências, procure sua Unidade de Saúde.`;
        break;
      case 'returned':
        text = `Olá *${patientName}*, informamos que sua solicitação foi cancelada/removida do sistema. Caso tenha dúvidas, entre em contato com sua Unidade de Saúde.`;
        break;
      default:
        // Se for outro status que não queremos notificar, retornamos
        return;
    }

    const message = `${text}\n\n_Mensagem automática._`;

    if (updated.patient?.phone) {
      let phone = updated.patient.phone.replace(/\D/g, '');

      // Tratamento simples para números do Brasil
      // Se tiver 10 ou 11 dígitos, provavelmente falta o 55
      if (phone.length >= 10 && phone.length <= 11) {
        phone = '55' + phone;
      }

      // Tratamento para remover o 9º dígito se causar problemas (formato 55 + DDD + 9 + 8 números = 13 dígitos)
      // Pesquisa indica que muitas APIs de WhatsApp (como Baileys/Evolution) possuem inconsistências com o 9º dígito (JID antigo vs novo).
      // Para garantir o envio, removemos o 9º dígito se o número tiver 13 dígitos no total (55 + DDD + 9 + 8).
      if (phone.length === 13 && phone.startsWith('55')) {
        // Verifica se o terceiro dígito após o 55 (índice 4, pois 0,1 são 55 e 2,3 são DDD) é 9
        // Ex: 55 11 9 8888 7777 -> 55 11 8888 7777
        phone = phone.replace(/^55(\d{2})9(\d{8})$/, "55$1$2");
      }

      await zapService.sendMessage(subscriber_id, phone, message);
    }
  } catch (e) {
    console.error('Erro ao enviar notificação Zap:', e);
    // Não bloqueia o retorno se falhar o zap
  }
}
