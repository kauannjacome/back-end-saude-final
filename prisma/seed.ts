import {
  PrismaClient,
  sex,
  role,
  status,
  priority,
  unit_measure,
  resource_origin,
  relationship,
  audit_action,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed completo...')

  const passwordHash = await bcrypt.hash('123456', 6)

  // ===========================
  // MUNICÍPIO 1
  // ===========================
  const subscriber1 = await prisma.subscriber.upsert({
    where: { cnpj: '12345678000199' },
    update: {},
    create: {
      name: 'Prefeitura de Exemplo',
      municipality_name: 'Cidade Exemplo',
      email: 'contato@exemplo.gov.br',
      telephone: '11999999999',
      cnpj: '12345678000199',
      postal_code: '01000-000',
      city: 'São Paulo',
      neighborhood: 'Centro',
      street: 'Av. Exemplo',
      number: '100',
      state_name: 'São Paulo',
      state_acronym: 'SP',
      payment: true,
    },
  })

  // ===========================
  // UNIDADES
  // ===========================
  const unit1 = await prisma.unit.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000001',
      name: 'UBS Central',
      subscriber_id: subscriber1.id,
    },
  })

  const unit2 = await prisma.unit.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000002',
      name: 'Hospital Municipal Norte',
      subscriber_id: subscriber1.id,
    },
  })

  // ===========================
  // PROFISSIONAIS
  // ===========================
  const prof1 = await prisma.professional.upsert({
    where: {
      subscriber_id_cpf: {
        subscriber_id: subscriber1.id,
        cpf: '11111111111',
      },
    },
    update: {
      password_hash: passwordHash,
    },
    create: {
      subscriber_id: subscriber1.id,
      cpf: '11111111111',
      name: 'Dr. João Silva',
      cargo: 'Médico Clínico Geral',
      sex: sex.masculino,
      email: 'joao.silva@exemplo.gov.br',
      role: role.admin_manager,
      password_hash: passwordHash,
      accepted_terms: true,
    },
  })

  const prof2 = await prisma.professional.upsert({
    where: {
      subscriber_id_cpf: {
        subscriber_id: subscriber1.id,
        cpf: '22222222222',
      },
    },
    update: {
      password_hash: passwordHash,
    },
    create: {
      subscriber_id: subscriber1.id,
      cpf: '22222222222',
      name: 'Enf. Maria Santos',
      cargo: 'Enfermeira',
      sex: sex.feminino,
      email: 'maria.santos@exemplo.gov.br',
      role: role.typist,
      password_hash: passwordHash,
      accepted_terms: true,
    },
  })

  // ===========================
  // PACIENTES
  // ===========================
  const pac1 = await prisma.patient.upsert({
    where: {
      subscriber_id_cpf: {
        subscriber_id: subscriber1.id,
        cpf: '33333333333',
      },
    },
    update: {},
    create: {
      subscriber_id: subscriber1.id,
      cpf: '33333333333',
      full_name: 'Carlos Oliveira',
      gender: 'Masculino',
      race: 'Pardo',
      birth_date: new Date('1985-03-12'),
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const pac2 = await prisma.patient.upsert({
    where: {
      subscriber_id_cpf: {
        subscriber_id: subscriber1.id,
        cpf: '44444444444',
      },
    },
    update: {},
    create: {
      subscriber_id: subscriber1.id,
      cpf: '44444444444',
      full_name: 'Ana Souza',
      gender: 'Feminino',
      race: 'Branca',
      birth_date: new Date('1992-07-21'),
      city: 'São Paulo',
      state: 'SP',
    },
  })

  // ===========================
  // GRUPOS / SUBGRUPOS
  // ===========================
  const group1 = await prisma.group.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000010',
      subscriber_id: subscriber1.id,
      name: 'Exames Laboratoriais',
      description: 'Exames de sangue e bioquímica',
    },
  })

  const subGroup1 = await prisma.folder.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000011',
      subscriber_id: subscriber1.id,
      name: 'Subgrupo Hematologia',
      description: 'Exames hematológicos',
    },
  })

  // ===========================
  // CUIDADOS
  // ===========================
  const care1 = await prisma.care.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000021',
      subscriber_id: subscriber1.id,
      name: 'Hemograma Completo',
      acronym: 'HEMOC',
      description: 'Exame de sangue completo',
      status: status.aprovado,
      resource: resource_origin.municipal,
      unit_measure: unit_measure.un,

      value: 25.5,
      amount: 1,
      group_id: group1.id,
      professional_id: prof1.id,
    },
  })

  const care2 = await prisma.care.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000022' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000022',
      subscriber_id: subscriber1.id,
      name: 'Glicemia em Jejum',
      acronym: 'GLICJ',
      description: 'Exame de glicose no sangue',
      status: status.recebido,
      resource: resource_origin.municipal,
      unit_measure: unit_measure.un,

      value: 15.0,
      amount: 1,
      group_id: group1.id,
      professional_id: prof2.id,
    },
  })

  // ===========================
  // PASTA
  // ===========================
  const folder1 = await prisma.folder.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000030',
      subscriber_id: subscriber1.id,
      name: 'Registros de Hemograma',

      description: 'Pasta para arquivamento de hemogramas',

      responsible_id: prof1.id,
    },
  })

  // ===========================
  // FORNECEDOR
  // ===========================
  const supplier1 = await prisma.supplier.upsert({
    where: {
      subscriber_id_cnpj: {
        subscriber_id: subscriber1.id,
        cnpj: '55555555000111',
      },
    },
    update: {},
    create: {
      subscriber_id: subscriber1.id,
      name: 'Laboratório Central',
      trade_name: 'LabCentral',
      cnpj: '55555555000111',
    },
  })

  // ===========================
  // REGULAÇÃO
  // ===========================
  const regulation1 = await prisma.regulation.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000050' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000050',
      subscriber_id: subscriber1.id,
      id_code: 'REG-001',
      patient_id: pac1.id,
      status: status.recebido,
      notes: 'Solicitação de hemograma de rotina',
      request_date: new Date(),
      supplier_id: supplier1.id,
      creator_id: prof1.id,
      folder_id: folder1.id,
      relationship: relationship.cuidador_a,
    },
  })

  await prisma.care_regulation.upsert({
    where: {
      care_id_regulation_id: {
        care_id: care1.id,
        regulation_id: regulation1.id,
      },
    },
    update: { quantity: 1 },
    create: {
      care_id: care1.id,
      regulation_id: regulation1.id,
      quantity: 1,
    },
  })

  await prisma.audit_log.create({
    data: {
      subscriber_id: subscriber1.id,
      actor_id: prof1.id,
      object_type: 'regulation',
      object_id: regulation1.id,
      action: audit_action.create,
      detail: { mensagem: 'Regulação criada pelo Dr. João Silva' },
    },
  })

  // ===========================
  // MUNICÍPIO 2
  // ===========================
  const subscriber2 = await prisma.subscriber.upsert({
    where: { cnpj: '98765432000100' },
    update: {},
    create: {
      name: 'Prefeitura de Modelo',
      municipality_name: 'Cidade Modelo',
      email: 'saude@modelo.gov.br',
      telephone: '21988888888',
      cnpj: '98765432000100',
      postal_code: '20000-000',
      city: 'Rio de Janeiro',
      neighborhood: 'Copacabana',
      street: 'Rua das Flores',
      number: '200',
      state_name: 'Rio de Janeiro',
      state_acronym: 'RJ',
      payment: false,
    },
  })

  const profRJ = await prisma.professional.upsert({
    where: {
      subscriber_id_cpf: {
        subscriber_id: subscriber2.id,
        cpf: '99999999999',
      },
    },
    update: {
      password_hash: passwordHash,
    },
    create: {
      subscriber_id: subscriber2.id,
      cpf: '99999999999',
      name: 'Dr. Pedro Ramos',
      cargo: 'Cardiologista',
      sex: sex.masculino,
      email: 'pedro.ramos@modelo.gov.br',
      role: role.typist,
      password_hash: passwordHash,
      accepted_terms: true,
    },
  })

  const pacRJ = await prisma.patient.upsert({
    where: {
      subscriber_id_cpf: {
        subscriber_id: subscriber2.id,
        cpf: '88888888888',
      },
    },
    update: {},
    create: {
      subscriber_id: subscriber2.id,
      cpf: '88888888888',
      full_name: 'Luciana Mendes',
      gender: 'Feminino',
      race: 'Branca',
      birth_date: new Date('1988-01-01'),
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const groupRJ = await prisma.group.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000040' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000040',
      subscriber_id: subscriber2.id,
      name: 'Exames Cardiológicos',
      description: 'Grupo de exames e procedimentos cardíacos',
    },
  })

  const careRJ = await prisma.care.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000041' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000041',
      subscriber_id: subscriber2.id,
      name: 'Eletrocardiograma',
      acronym: 'ECG',
      description: 'Exame de atividade elétrica do coração',
      status: status.aprovado,
      resource: resource_origin.estadual,
      unit_measure: unit_measure.un,

      value: 40.0,
      amount: 1,
      group_id: groupRJ.id,
      professional_id: profRJ.id,
    },
  })

  const supplierRJ = await prisma.supplier.upsert({
    where: {
      subscriber_id_cnpj: {
        subscriber_id: subscriber2.id,
        cnpj: '77777777000122',
      },
    },
    update: {},
    create: {
      subscriber_id: subscriber2.id,
      name: 'Clínica do Coração',
      trade_name: 'CardioCenter',
      cnpj: '77777777000122',
    },
  })

  const regulationRJ = await prisma.regulation.upsert({
    where: { uuid: '00000000-0000-0000-0000-000000000051' },
    update: {},
    create: {
      uuid: '00000000-0000-0000-0000-000000000051',
      subscriber_id: subscriber2.id,
      id_code: 'REG-100',
      patient_id: pacRJ.id,
      request_date: new Date(),
      status: status.em_andamento,
      notes: 'Solicitação de ECG de urgência',
      supplier_id: supplierRJ.id,
      creator_id: profRJ.id,
    },
  })

  await prisma.care_regulation.upsert({
    where: {
      care_id_regulation_id: {
        care_id: careRJ.id,
        regulation_id: regulationRJ.id,
      },
    },
    update: { quantity: 1 },
    create: {
      care_id: careRJ.id,
      regulation_id: regulationRJ.id,
      quantity: 1,
    },
  })

  await prisma.audit_log.create({
    data: {
      subscriber_id: subscriber2.id,
      actor_id: profRJ.id,
      object_type: 'regulation',
      object_id: regulationRJ.id,
      action: audit_action.create,
      detail: { mensagem: 'ECG solicitado para paciente Luciana Mendes' },
    },
  })

  console.log('✅ Seed completo criado com sucesso!')

  // VERIFICAÇÃO PÓS-SEED
  console.log('🔍 Verificando hash do usuário joao.silva@exemplo.gov.br...');
  const userCheck = await prisma.professional.findFirst({ where: { email: 'joao.silva@exemplo.gov.br' } });
  if (userCheck && userCheck.password_hash) {
    const isValid = await bcrypt.compare('123456', userCheck.password_hash);
    if (isValid) {
      console.log('✅ VERIFICADO: Senha "123456" corresponde ao hash salvo no banco.');
    } else {
      console.error('❌ ERRO: Senha "123456" NÃO corresponde ao hash salvo no banco.');
    }
  } else {
    console.error('❌ ERRO: Usuário não encontrado ou sem hash após seed.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
