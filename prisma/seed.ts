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
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

dotenv.config()

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_PASSWORD = '123456'

async function main() {
  console.log('🌱 Iniciando seed - 3 Municípios (SEM LAÇOS)\n')

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)
  console.log('🔐 Senha padrão:', DEFAULT_PASSWORD, '\n')

  // ==========================================
  // ADMIN GLOBAL
  // ==========================================
  const adminGlobalSubscriber = await prisma.subscriber.upsert({
    where: { cnpj: '00000000000000' },
    update: {},
    create: {
      name: 'Sistema Global',
      municipality_name: 'Sistema',
      email: 'admin@sistema.gov.br',
      telephone: '00000000000',
      cnpj: '00000000000000',
      postal_code: '00000-000',
      city: 'Sistema',
      neighborhood: 'Central',
      street: 'Sistema',
      number: '0',
      state_name: 'Sistema',
      state_acronym: 'SG',
      payment: true,
    },
  })

  const adminManager = await prisma.professional.upsert({
    where: {
      subscriber_id_cpf: {
        subscriber_id: adminGlobalSubscriber.id,
        cpf: '00000000000',
      },
    },
    update: { password_hash: passwordHash },
    create: {
      subscriber_id: adminGlobalSubscriber.id,
      cpf: '00000000000',
      name: 'Admin Manager (Sistema)',
      cargo: 'Gerente do Sistema',
      sex: sex.nao_informado,
      email: 'kauannjacome@gmail.com',
      role: role.admin_manager,
      password_hash: passwordHash,
      accepted_terms: true,
    },
  })

  console.log('✅ Admin Global criado: kauannjacome@gmail.com\n')

  // ==========================================
  // ASSINANTE 1 - SÃO PAULO
  // ==========================================
  console.log('📍 ========== SÃO PAULO ==========')

  const sub1 = await prisma.subscriber.upsert({
    where: { cnpj: '11111111000199' },
    update: {},
    create: {
      name: 'Prefeitura de São Paulo',
      municipality_name: 'São Paulo',
      email: 'contato@saopaulo.sp.gov.br',
      telephone: '1133334444',
      cnpj: '11111111000199',
      postal_code: '01000-000',
      city: 'São Paulo',
      neighborhood: 'Centro',
      street: 'Av. Paulista',
      number: '1000',
      state_name: 'São Paulo',
      state_acronym: 'SP',
      payment: true,
    },
  })

  // PROFISSIONAIS SP
  const adminSP = await prisma.professional.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub1.id, cpf: '11111111111' } },
    update: { password_hash: passwordHash },
    create: {
      subscriber_id: sub1.id,
      cpf: '11111111111',
      name: 'Dr. João Silva (São Paulo)',
      cargo: 'Secretário de Saúde',
      sex: sex.masculino,
      email: 'admin_municipal@saopaulo.sp.gov.br',
      role: role.admin_municipal,
      password_hash: passwordHash,
      accepted_terms: true,
      cns: '111456789012345',
    },
  })

  const typistSP = await prisma.professional.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub1.id, cpf: '11111111112' } },
    update: { password_hash: passwordHash },
    create: {
      subscriber_id: sub1.id,
      cpf: '11111111112',
      name: 'Maria Santos (São Paulo)',
      cargo: 'Digitadora',
      sex: sex.feminino,
      email: 'typist@saopaulo.sp.gov.br',
      role: role.typist,
      password_hash: passwordHash,
      accepted_terms: true,
    },
  })

  console.log('✅ Profissionais SP criados')

  // UNIDADES SP
  const unitSP1 = await prisma.unit.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000001' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000001',
      name: 'UBS Vila Mariana (São Paulo)',
      subscriber_id: sub1.id,
    },
  })

  const unitSP2 = await prisma.unit.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000002',
      name: 'Hospital Municipal (São Paulo)',
      subscriber_id: sub1.id,
    },
  })

  const unitSP3 = await prisma.unit.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000003' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000003',
      name: 'UPA Lapa (São Paulo)',
      subscriber_id: sub1.id,
    },
  })

  console.log('✅ 3 Unidades SP criadas')

  // PACIENTES SP
  const pacSP1 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub1.id, cpf: '11111110001' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      cpf: '11111110001',
      name: 'Carlos Oliveira (São Paulo)',
      gender: 'Masculino',
      race: 'Pardo',
      birth_date: new Date('1985-01-15'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000001',
    },
  })

  const pacSP2 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub1.id, cpf: '11111110002' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      cpf: '11111110002',
      name: 'Ana Costa (São Paulo)',
      gender: 'Feminino',
      race: 'Branca',
      birth_date: new Date('1990-05-20'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000002',
    },
  })

  const pacSP3 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub1.id, cpf: '11111110003' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      cpf: '11111110003',
      name: 'Pedro Souza (São Paulo)',
      gender: 'Masculino',
      race: 'Negra',
      birth_date: new Date('1978-11-10'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000003',
    },
  })

  const pacSP4 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub1.id, cpf: '11111110004' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      cpf: '11111110004',
      name: 'Juliana Lima (São Paulo)',
      gender: 'Feminino',
      race: 'Amarela',
      birth_date: new Date('2000-03-25'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000004',
    },
  })

  const pacSP5 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub1.id, cpf: '11111110005' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      cpf: '11111110005',
      name: 'Roberto Alves (São Paulo)',
      gender: 'Masculino',
      race: 'Branca',
      birth_date: new Date('1965-07-30'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000005',
    },
  })

  console.log('✅ 5 Pacientes SP criados')

  // GRUPOS SP
  const groupSP1 = await prisma.group.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000010' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000010',
      subscriber_id: sub1.id,
      name: 'Exames Laboratoriais (São Paulo)',
      description: 'Grupo de exames de sangue e lab',
    },
  })

  const groupSP2 = await prisma.group.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000011' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000011',
      subscriber_id: sub1.id,
      name: 'Consultas Especializadas (São Paulo)',
      description: 'Consultas médicas especializadas',
    },
  })

  console.log('✅ 2 Grupos SP criados')

  // FORNECEDORES SP
  const suppSP1 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub1.id, cnpj: '11111111000111' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      name: 'Laboratório Central (São Paulo)',
      trade_name: 'LabCentral SP',
      cnpj: '11111111000111',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP2 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub1.id, cnpj: '11111111000122' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      name: 'Clínica Imagem (São Paulo)',
      trade_name: 'ImagemSP',
      cnpj: '11111111000122',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP3 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub1.id, cnpj: '11111111000133' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      name: 'Hospital Parceiro (São Paulo)',
      trade_name: 'HospSP',
      cnpj: '11111111000133',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP4 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub1.id, cnpj: '11111111000144' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      name: 'Farmácia Popular (São Paulo)',
      trade_name: 'FarmaSP',
      cnpj: '11111111000144',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP5 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub1.id, cnpj: '11111111000155' } },
    update: {},
    create: {
      subscriber_id: sub1.id,
      name: 'Centro Especialidades (São Paulo)',
      trade_name: 'CentroEsp SP',
      cnpj: '11111111000155',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  console.log('✅ 5 Fornecedores SP criados')

  // CUIDADOS SP
  const careSP1 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000020' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000020',
      subscriber_id: sub1.id,
      name: 'Hemograma Completo (São Paulo)',
      acronym: 'HEMOC',
      description: 'Exame de sangue completo',
      resource_origin: resource_origin.municipal,
      unit_measure: unit_measure.un,
      value: 25.5,
      amount: 1,
      group_id: groupSP1.id,
      professional_id: adminSP.id,
    },
  })

  const careSP2 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000021' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000021',
      subscriber_id: sub1.id,
      name: 'Glicemia em Jejum (São Paulo)',
      acronym: 'GLICJ',
      description: 'Exame de glicose',
      resource_origin: resource_origin.municipal,
      unit_measure: unit_measure.un,
      value: 15.0,
      amount: 1,
      group_id: groupSP1.id,
      professional_id: typistSP.id,
    },
  })

  const careSP3 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000022' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000022',
      subscriber_id: sub1.id,
      name: 'Colesterol Total (São Paulo)',
      acronym: 'COLEST',
      description: 'Exame de colesterol',
      resource_origin: resource_origin.municipal,
      unit_measure: unit_measure.un,
      value: 18.0,
      amount: 1,
      group_id: groupSP1.id,
      professional_id: adminSP.id,
    },
  })

  const careSP4 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000023' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000023',
      subscriber_id: sub1.id,
      name: 'Consulta Cardiologia (São Paulo)',
      acronym: 'CCARDIO',
      description: 'Consulta com cardiologista',
      resource_origin: resource_origin.municipal,
      unit_measure: unit_measure.un,
      value: 120.0,
      amount: 1,
      group_id: groupSP2.id,
      professional_id: adminSP.id,
    },
  })

  const careSP5 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000024' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000024',
      subscriber_id: sub1.id,
      name: 'Consulta Ortopedia (São Paulo)',
      acronym: 'CORTOP',
      description: 'Consulta com ortopedista',
      resource_origin: resource_origin.municipal,
      unit_measure: unit_measure.un,
      value: 100.0,
      amount: 1,
      group_id: groupSP2.id,
      professional_id: typistSP.id,
    },
  })

  console.log('✅ 5 Cuidados SP criados')

  // PASTAS SP
  const folderSP1 = await prisma.folder.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000030',
      subscriber_id: sub1.id,
      name: 'Pasta Urgências (São Paulo)',
      description: 'Regulações urgentes',
      responsible_id: adminSP.id,
    },
  })

  const folderSP2 = await prisma.folder.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000031' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000031',
      subscriber_id: sub1.id,
      name: 'Pasta Eletivos (São Paulo)',
      description: 'Procedimentos eletivos',
      responsible_id: typistSP.id,
    },
  })

  const folderSP3 = await prisma.folder.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000032' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000032',
      subscriber_id: sub1.id,
      name: 'Pasta Exames (São Paulo)',
      description: 'Solicitações de exames',
      responsible_id: adminSP.id,
    },
  })

  console.log('✅ 3 Pastas SP criadas')

  // REGULAÇÕES SP
  const regSP1 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000050' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000050',
      subscriber_id: sub1.id,
      id_code: 'REG-SP-00001',
      patient_id: pacSP1.id,
      status: status.in_progress,
      notes: 'Regulação SP 1',
      request_date: new Date('2025-01-10'),
      supplier_id: suppSP1.id,
      creator_id: adminSP.id,
      folder_id: folderSP1.id,
      priority: priority.urgencia,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careSP1.id, regulation_id: regSP1.id } },
    update: {},
    create: {
      care_id: careSP1.id,
      regulation_id: regSP1.id,
      subscriber_id: sub1.id,
      quantity: 1,
    },
  })

  const regSP2 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000051' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000051',
      subscriber_id: sub1.id,
      id_code: 'REG-SP-00002',
      patient_id: pacSP2.id,
      status: status.approved,
      notes: 'Regulação SP 2',
      request_date: new Date('2025-01-11'),
      supplier_id: suppSP2.id,
      creator_id: typistSP.id,
      folder_id: folderSP2.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careSP2.id, regulation_id: regSP2.id } },
    update: {},
    create: {
      care_id: careSP2.id,
      regulation_id: regSP2.id,
      subscriber_id: sub1.id,
      quantity: 1,
    },
  })

  const regSP3 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000052' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000052',
      subscriber_id: sub1.id,
      id_code: 'REG-SP-00003',
      patient_id: pacSP3.id,
      status: status.in_progress,
      notes: 'Regulação SP 3',
      request_date: new Date('2025-01-12'),
      supplier_id: suppSP3.id,
      creator_id: adminSP.id,
      folder_id: folderSP3.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careSP3.id, regulation_id: regSP3.id } },
    update: {},
    create: {
      care_id: careSP3.id,
      regulation_id: regSP3.id,
      subscriber_id: sub1.id,
      quantity: 1,
    },
  })

  const regSP4 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000053' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000053',
      subscriber_id: sub1.id,
      id_code: 'REG-SP-00004',
      patient_id: pacSP4.id,
      status: status.denied,
      notes: 'Regulação SP 4',
      request_date: new Date('2025-01-13'),
      supplier_id: suppSP4.id,
      creator_id: typistSP.id,
      folder_id: folderSP1.id,
      priority: priority.urgencia,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careSP4.id, regulation_id: regSP4.id } },
    update: {},
    create: {
      care_id: careSP4.id,
      regulation_id: regSP4.id,
      subscriber_id: sub1.id,
      quantity: 1,
    },
  })

  const regSP5 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000054' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000054',
      subscriber_id: sub1.id,
      id_code: 'REG-SP-00005',
      patient_id: pacSP5.id,
      status: status.approved,
      notes: 'Regulação SP 5',
      request_date: new Date('2025-01-14'),
      supplier_id: suppSP5.id,
      creator_id: adminSP.id,
      folder_id: folderSP2.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careSP5.id, regulation_id: regSP5.id } },
    update: {},
    create: {
      care_id: careSP5.id,
      regulation_id: regSP5.id,
      subscriber_id: sub1.id,
      quantity: 1,
    },
  })

  console.log('✅ 5 Regulações SP criadas')
  console.log('✅ SÃO PAULO COMPLETO!\n')

  // ==========================================
  // ASSINANTE 2 - RIO DE JANEIRO
  // ==========================================
  console.log('📍 ========== RIO DE JANEIRO ==========')

  const sub2 = await prisma.subscriber.upsert({
    where: { cnpj: '22222222000199' },
    update: {},
    create: {
      name: 'Prefeitura do Rio de Janeiro',
      municipality_name: 'Rio de Janeiro',
      email: 'contato@rio.rj.gov.br',
      telephone: '2133334444',
      cnpj: '22222222000199',
      postal_code: '20000-000',
      city: 'Rio de Janeiro',
      neighborhood: 'Centro',
      street: 'Av. Rio Branco',
      number: '500',
      state_name: 'Rio de Janeiro',
      state_acronym: 'RJ',
      payment: true,
    },
  })

  // PROFISSIONAIS RJ
  const adminRJ = await prisma.professional.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub2.id, cpf: '22222222221' } },
    update: { password_hash: passwordHash },
    create: {
      subscriber_id: sub2.id,
      cpf: '22222222221',
      name: 'Dra. Fernanda Lima (Rio de Janeiro)',
      cargo: 'Secretária de Saúde',
      sex: sex.feminino,
      email: 'admin_municipal@riodejaneiro.rj.gov.br',
      role: role.admin_municipal,
      password_hash: passwordHash,
      accepted_terms: true,
      cns: '222456789012345',
    },
  })

  const typistRJ = await prisma.professional.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub2.id, cpf: '22222222222' } },
    update: { password_hash: passwordHash },
    create: {
      subscriber_id: sub2.id,
      cpf: '22222222222',
      name: 'Roberto Costa (Rio de Janeiro)',
      cargo: 'Digitador',
      sex: sex.masculino,
      email: 'typist@riodejaneiro.rj.gov.br',
      role: role.typist,
      password_hash: passwordHash,
      accepted_terms: true,
    },
  })

  console.log('✅ Profissionais RJ criados')

  // UNIDADES RJ
  const unitRJ1 = await prisma.unit.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000001' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000001',
      name: 'UBS Copacabana (Rio de Janeiro)',
      subscriber_id: sub2.id,
    },
  })

  const unitRJ2 = await prisma.unit.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000002',
      name: 'Hospital Municipal (Rio de Janeiro)',
      subscriber_id: sub2.id,
    },
  })

  const unitRJ3 = await prisma.unit.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000003' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000003',
      name: 'UPA Tijuca (Rio de Janeiro)',
      subscriber_id: sub2.id,
    },
  })

  console.log('✅ 3 Unidades RJ criadas')

  // PACIENTES RJ
  const pacRJ1 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub2.id, cpf: '22222220001' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      cpf: '22222220001',
      name: 'Luciana Mendes (Rio de Janeiro)',
      gender: 'Feminino',
      race: 'Branca',
      birth_date: new Date('1988-02-10'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000001',
    },
  })

  const pacRJ2 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub2.id, cpf: '22222220002' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      cpf: '22222220002',
      name: 'Gabriel Santos (Rio de Janeiro)',
      gender: 'Masculino',
      race: 'Pardo',
      birth_date: new Date('1992-06-15'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000002',
    },
  })

  const pacRJ3 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub2.id, cpf: '22222220003' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      cpf: '22222220003',
      name: 'Beatriz Silva (Rio de Janeiro)',
      gender: 'Feminino',
      race: 'Negra',
      birth_date: new Date('1975-09-20'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000003',
    },
  })

  const pacRJ4 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub2.id, cpf: '22222220004' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      cpf: '22222220004',
      name: 'Thiago Pereira (Rio de Janeiro)',
      gender: 'Masculino',
      race: 'Branca',
      birth_date: new Date('1998-12-05'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000004',
    },
  })

  const pacRJ5 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub2.id, cpf: '22222220005' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      cpf: '22222220005',
      name: 'Camila Rodrigues (Rio de Janeiro)',
      gender: 'Feminino',
      race: 'Parda',
      birth_date: new Date('1982-04-18'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000005',
    },
  })

  console.log('✅ 5 Pacientes RJ criados')

  // GRUPOS RJ
  const groupRJ1 = await prisma.group.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000010' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000010',
      subscriber_id: sub2.id,
      name: 'Exames Cardiológicos (Rio de Janeiro)',
      description: 'Exames do coração',
    },
  })

  const groupRJ2 = await prisma.group.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000011' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000011',
      subscriber_id: sub2.id,
      name: 'Pediatria (Rio de Janeiro)',
      description: 'Atendimentos pediátricos',
    },
  })

  console.log('✅ 2 Grupos RJ criados')

  // FORNECEDORES RJ
  const suppRJ1 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub2.id, cnpj: '22222222000111' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      name: 'Laboratório Carioca (Rio de Janeiro)',
      trade_name: 'LabCarioca',
      cnpj: '22222222000111',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ2 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub2.id, cnpj: '22222222000122' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      name: 'Clínica Coração (Rio de Janeiro)',
      trade_name: 'CardioRJ',
      cnpj: '22222222000122',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ3 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub2.id, cnpj: '22222222000133' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      name: 'Hospital Infantil (Rio de Janeiro)',
      trade_name: 'HospInfantil RJ',
      cnpj: '22222222000133',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ4 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub2.id, cnpj: '22222222000144' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      name: 'Farmácia Central (Rio de Janeiro)',
      trade_name: 'FarmaRJ',
      cnpj: '22222222000144',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ5 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub2.id, cnpj: '22222222000155' } },
    update: {},
    create: {
      subscriber_id: sub2.id,
      name: 'Centro Diagnóstico (Rio de Janeiro)',
      trade_name: 'DiagRJ',
      cnpj: '22222222000155',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  console.log('✅ 5 Fornecedores RJ criados')

  // CUIDADOS RJ
  const careRJ1 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000020' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000020',
      subscriber_id: sub2.id,
      name: 'Eletrocardiograma (Rio de Janeiro)',
      acronym: 'ECG',
      description: 'Exame ECG',
      resource_origin: resource_origin.estadual,
      unit_measure: unit_measure.un,
      value: 40.0,
      amount: 1,
      group_id: groupRJ1.id,
      professional_id: adminRJ.id,
    },
  })

  const careRJ2 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000021' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000021',
      subscriber_id: sub2.id,
      name: 'Ecocardiograma (Rio de Janeiro)',
      acronym: 'ECO',
      description: 'Exame de eco',
      resource_origin: resource_origin.estadual,
      unit_measure: unit_measure.un,
      value: 150.0,
      amount: 1,
      group_id: groupRJ1.id,
      professional_id: typistRJ.id,
    },
  })

  const careRJ3 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000022' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000022',
      subscriber_id: sub2.id,
      name: 'Teste Ergométrico (Rio de Janeiro)',
      acronym: 'TERGO',
      description: 'Teste de esforço',
      resource_origin: resource_origin.estadual,
      unit_measure: unit_measure.un,
      value: 120.0,
      amount: 1,
      group_id: groupRJ1.id,
      professional_id: adminRJ.id,
    },
  })

  const careRJ4 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000023' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000023',
      subscriber_id: sub2.id,
      name: 'Consulta Pediatria (Rio de Janeiro)',
      acronym: 'CPED',
      description: 'Consulta pediátrica',
      resource_origin: resource_origin.estadual,
      unit_measure: unit_measure.un,
      value: 80.0,
      amount: 1,
      group_id: groupRJ2.id,
      professional_id: adminRJ.id,
    },
  })

  const careRJ5 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000024' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000024',
      subscriber_id: sub2.id,
      name: 'Vacinas Infantis (Rio de Janeiro)',
      acronym: 'VACINF',
      description: 'Vacinação infantil',
      resource_origin: resource_origin.estadual,
      unit_measure: unit_measure.un,
      value: 0.0,
      amount: 1,
      group_id: groupRJ2.id,
      professional_id: typistRJ.id,
    },
  })

  console.log('✅ 5 Cuidados RJ criados')

  // PASTAS RJ
  const folderRJ1 = await prisma.folder.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000030',
      subscriber_id: sub2.id,
      name: 'Pasta Cardiologia (Rio de Janeiro)',
      description: 'Regulações cardio',
      responsible_id: adminRJ.id,
    },
  })

  const folderRJ2 = await prisma.folder.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000031' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000031',
      subscriber_id: sub2.id,
      name: 'Pasta Pediatria (Rio de Janeiro)',
      description: 'Atendimentos infantis',
      responsible_id: typistRJ.id,
    },
  })

  const folderRJ3 = await prisma.folder.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000032' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000032',
      subscriber_id: sub2.id,
      name: 'Pasta Urgências (Rio de Janeiro)',
      description: 'Casos urgentes',
      responsible_id: adminRJ.id,
    },
  })

  console.log('✅ 3 Pastas RJ criadas')

  // REGULAÇÕES RJ
  const regRJ1 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000050' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000050',
      subscriber_id: sub2.id,
      id_code: 'REG-RJ-00001',
      patient_id: pacRJ1.id,
      status: status.in_progress,
      notes: 'Regulação RJ 1',
      request_date: new Date('2025-01-10'),
      supplier_id: suppRJ1.id,
      creator_id: adminRJ.id,
      folder_id: folderRJ1.id,
      priority: priority.urgencia,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careRJ1.id, regulation_id: regRJ1.id } },
    update: {},
    create: {
      care_id: careRJ1.id,
      regulation_id: regRJ1.id,
      subscriber_id: sub2.id,
      quantity: 1,
    },
  })

  const regRJ2 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000051' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000051',
      subscriber_id: sub2.id,
      id_code: 'REG-RJ-00002',
      patient_id: pacRJ2.id,
      status: status.approved,
      notes: 'Regulação RJ 2',
      request_date: new Date('2025-01-11'),
      supplier_id: suppRJ2.id,
      creator_id: typistRJ.id,
      folder_id: folderRJ2.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careRJ2.id, regulation_id: regRJ2.id } },
    update: {},
    create: {
      care_id: careRJ2.id,
      regulation_id: regRJ2.id,
      subscriber_id: sub2.id,
      quantity: 1,
    },
  })

  const regRJ3 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000052' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000052',
      subscriber_id: sub2.id,
      id_code: 'REG-RJ-00003',
      patient_id: pacRJ3.id,
      status: status.in_progress,
      notes: 'Regulação RJ 3',
      request_date: new Date('2025-01-12'),
      supplier_id: suppRJ3.id,
      creator_id: adminRJ.id,
      folder_id: folderRJ3.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careRJ3.id, regulation_id: regRJ3.id } },
    update: {},
    create: {
      care_id: careRJ3.id,
      regulation_id: regRJ3.id,
      subscriber_id: sub2.id,
      quantity: 1,
    },
  })

  const regRJ4 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000053' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000053',
      subscriber_id: sub2.id,
      id_code: 'REG-RJ-00004',
      patient_id: pacRJ4.id,
      status: status.denied,
      notes: 'Regulação RJ 4',
      request_date: new Date('2025-01-13'),
      supplier_id: suppRJ4.id,
      creator_id: typistRJ.id,
      folder_id: folderRJ1.id,
      priority: priority.urgencia,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careRJ4.id, regulation_id: regRJ4.id } },
    update: {},
    create: {
      care_id: careRJ4.id,
      regulation_id: regRJ4.id,
      subscriber_id: sub2.id,
      quantity: 1,
    },
  })

  const regRJ5 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000054' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000054',
      subscriber_id: sub2.id,
      id_code: 'REG-RJ-00005',
      patient_id: pacRJ5.id,
      status: status.approved,
      notes: 'Regulação RJ 5',
      request_date: new Date('2025-01-14'),
      supplier_id: suppRJ5.id,
      creator_id: adminRJ.id,
      folder_id: folderRJ2.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careRJ5.id, regulation_id: regRJ5.id } },
    update: {},
    create: {
      care_id: careRJ5.id,
      regulation_id: regRJ5.id,
      subscriber_id: sub2.id,
      quantity: 1,
    },
  })

  console.log('✅ 5 Regulações RJ criadas')
  console.log('✅ RIO DE JANEIRO COMPLETO!\n')

  // ==========================================
  // ASSINANTE 3 - BELO HORIZONTE
  // ==========================================
  console.log('📍 ========== BELO HORIZONTE ==========')

  const sub3 = await prisma.subscriber.upsert({
    where: { cnpj: '33333333000199' },
    update: {},
    create: {
      name: 'Prefeitura de Belo Horizonte',
      municipality_name: 'Belo Horizonte',
      email: 'contato@belohorizonte.mg.gov.br',
      telephone: '3133334444',
      cnpj: '33333333000199',
      postal_code: '30000-000',
      city: 'Belo Horizonte',
      neighborhood: 'Centro',
      street: 'Av. Afonso Pena',
      number: '1500',
      state_name: 'Minas Gerais',
      state_acronym: 'MG',
      payment: false,
    },
  })

  // PROFISSIONAIS MG
  const adminMG = await prisma.professional.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub3.id, cpf: '33333333331' } },
    update: { password_hash: passwordHash },
    create: {
      subscriber_id: sub3.id,
      cpf: '33333333331',
      name: 'Dr. Roberto Andrade (Belo Horizonte)',
      cargo: 'Diretor de Saúde',
      sex: sex.masculino,
      email: 'admin_municipal@belohorizonte.mg.gov.br',
      role: role.admin_municipal,
      password_hash: passwordHash,
      accepted_terms: true,
      cns: '333456789012345',
    },
  })

  const typistMG = await prisma.professional.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub3.id, cpf: '33333333332' } },
    update: { password_hash: passwordHash },
    create: {
      subscriber_id: sub3.id,
      cpf: '33333333332',
      name: 'Mariana Silva (Belo Horizonte)',
      cargo: 'Digitadora',
      sex: sex.feminino,
      email: 'typist@belohorizonte.mg.gov.br',
      role: role.typist,
      password_hash: passwordHash,
      accepted_terms: true,
    },
  })

  console.log('✅ Profissionais MG criados')

  // UNIDADES MG
  const unitMG1 = await prisma.unit.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000001' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000001',
      name: 'UBS Pampulha (Belo Horizonte)',
      subscriber_id: sub3.id,
    },
  })

  const unitMG2 = await prisma.unit.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000002',
      name: 'Hospital Municipal (Belo Horizonte)',
      subscriber_id: sub3.id,
    },
  })

  const unitMG3 = await prisma.unit.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000003' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000003',
      name: 'UPA Venda Nova (Belo Horizonte)',
      subscriber_id: sub3.id,
    },
  })

  console.log('✅ 3 Unidades MG criadas')

  // PACIENTES MG
  const pacMG1 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub3.id, cpf: '33333330001' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      cpf: '33333330001',
      name: 'Augusto Ferreira (Belo Horizonte)',
      gender: 'Masculino',
      race: 'Pardo',
      birth_date: new Date('1980-03-12'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000001',
    },
  })

  const pacMG2 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub3.id, cpf: '33333330002' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      cpf: '33333330002',
      name: 'Helena Martins (Belo Horizonte)',
      gender: 'Feminino',
      race: 'Branca',
      birth_date: new Date('1995-07-22'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000002',
    },
  })

  const pacMG3 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub3.id, cpf: '33333330003' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      cpf: '33333330003',
      name: 'Diego Souza (Belo Horizonte)',
      gender: 'Masculino',
      race: 'Negra',
      birth_date: new Date('1972-11-30'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000003',
    },
  })

  const pacMG4 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub3.id, cpf: '33333330004' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      cpf: '33333330004',
      name: 'Larissa Oliveira (Belo Horizonte)',
      gender: 'Feminino',
      race: 'Amarela',
      birth_date: new Date('2002-05-08'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000004',
    },
  })

  const pacMG5 = await prisma.patient.upsert({
    where: { subscriber_id_cpf: { subscriber_id: sub3.id, cpf: '33333330005' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      cpf: '33333330005',
      name: 'Fernando Alves (Belo Horizonte)',
      gender: 'Masculino',
      race: 'Branca',
      birth_date: new Date('1968-09-14'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000005',
    },
  })

  console.log('✅ 5 Pacientes MG criados')

  // GRUPOS MG
  const groupMG1 = await prisma.group.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000010' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000010',
      subscriber_id: sub3.id,
      name: 'Ortopedia (Belo Horizonte)',
      description: 'Procedimentos ortopédicos',
    },
  })

  const groupMG2 = await prisma.group.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000011' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000011',
      subscriber_id: sub3.id,
      name: 'Ginecologia (Belo Horizonte)',
      description: 'Atendimentos ginecológicos',
    },
  })

  console.log('✅ 2 Grupos MG criados')

  // FORNECEDORES MG
  const suppMG1 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub3.id, cnpj: '33333333000111' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      name: 'Laboratório Mineiro (Belo Horizonte)',
      trade_name: 'LabMG',
      cnpj: '33333333000111',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG2 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub3.id, cnpj: '33333333000122' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      name: 'Clínica Ortopédica (Belo Horizonte)',
      trade_name: 'OrtoMG',
      cnpj: '33333333000122',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG3 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub3.id, cnpj: '33333333000133' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      name: 'Hospital da Mulher (Belo Horizonte)',
      trade_name: 'MulherMG',
      cnpj: '33333333000133',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG4 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub3.id, cnpj: '33333333000144' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      name: 'Farmácia Saúde (Belo Horizonte)',
      trade_name: 'FarmaMG',
      cnpj: '33333333000144',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG5 = await prisma.supplier.upsert({
    where: { subscriber_id_cnpj: { subscriber_id: sub3.id, cnpj: '33333333000155' } },
    update: {},
    create: {
      subscriber_id: sub3.id,
      name: 'Centro Cirúrgico (Belo Horizonte)',
      trade_name: 'CirurgiaMG',
      cnpj: '33333333000155',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  console.log('✅ 5 Fornecedores MG criados')

  // CUIDADOS MG
  const careMG1 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000020' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000020',
      subscriber_id: sub3.id,
      name: 'Raio-X Coluna (Belo Horizonte)',
      acronym: 'RXCOL',
      description: 'Exame de raio-x',
      resource_origin: resource_origin.federal,
      unit_measure: unit_measure.un,
      value: 50.0,
      amount: 1,
      group_id: groupMG1.id,
      professional_id: adminMG.id,
    },
  })

  const careMG2 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000021' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000021',
      subscriber_id: sub3.id,
      name: 'Ressonância Joelho (Belo Horizonte)',
      acronym: 'RMJOE',
      description: 'Exame de ressonância',
      resource_origin: resource_origin.federal,
      unit_measure: unit_measure.un,
      value: 500.0,
      amount: 1,
      group_id: groupMG1.id,
      professional_id: typistMG.id,
    },
  })

  const careMG3 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000022' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000022',
      subscriber_id: sub3.id,
      name: 'Fisioterapia Ortopédica (Belo Horizonte)',
      acronym: 'FISORT',
      description: 'Sessão de fisioterapia',
      resource_origin: resource_origin.federal,
      unit_measure: unit_measure.sessao,
      value: 60.0,
      amount: 10,
      group_id: groupMG1.id,
      professional_id: adminMG.id,
    },
  })

  const careMG4 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000023' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000023',
      subscriber_id: sub3.id,
      name: 'Consulta Ginecologia (Belo Horizonte)',
      acronym: 'CGIN',
      description: 'Consulta ginecológica',
      resource_origin: resource_origin.federal,
      unit_measure: unit_measure.un,
      value: 90.0,
      amount: 1,
      group_id: groupMG2.id,
      professional_id: adminMG.id,
    },
  })

  const careMG5 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000024' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000024',
      subscriber_id: sub3.id,
      name: 'Ultrassom Obstétrico (Belo Horizonte)',
      acronym: 'USOBS',
      description: 'Ultrassom gestacional',
      resource_origin: resource_origin.federal,
      unit_measure: unit_measure.un,
      value: 100.0,
      amount: 1,
      group_id: groupMG2.id,
      professional_id: typistMG.id,
    },
  })

  console.log('✅ 5 Cuidados MG criados')

  // PASTAS MG
  const folderMG1 = await prisma.folder.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000030',
      subscriber_id: sub3.id,
      name: 'Pasta Ortopedia (Belo Horizonte)',
      description: 'Regulações ortopédicas',
      responsible_id: adminMG.id,
    },
  })

  const folderMG2 = await prisma.folder.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000031' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000031',
      subscriber_id: sub3.id,
      name: 'Pasta Ginecologia (Belo Horizonte)',
      description: 'Atendimentos ginecológicos',
      responsible_id: typistMG.id,
    },
  })

  const folderMG3 = await prisma.folder.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000032' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000032',
      subscriber_id: sub3.id,
      name: 'Pasta Cirurgias (Belo Horizonte)',
      description: 'Procedimentos cirúrgicos',
      responsible_id: adminMG.id,
    },
  })

  console.log('✅ 3 Pastas MG criadas')

  // REGULAÇÕES MG
  const regMG1 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000050' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000050',
      subscriber_id: sub3.id,
      id_code: 'REG-MG-00001',
      patient_id: pacMG1.id,
      status: status.in_progress,
      notes: 'Regulação MG 1',
      request_date: new Date('2025-01-10'),
      supplier_id: suppMG1.id,
      creator_id: adminMG.id,
      folder_id: folderMG1.id,
      priority: priority.urgencia,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careMG1.id, regulation_id: regMG1.id } },
    update: {},
    create: {
      care_id: careMG1.id,
      regulation_id: regMG1.id,
      subscriber_id: sub3.id,
      quantity: 1,
    },
  })

  const regMG2 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000051' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000051',
      subscriber_id: sub3.id,
      id_code: 'REG-MG-00002',
      patient_id: pacMG2.id,
      status: status.approved,
      notes: 'Regulação MG 2',
      request_date: new Date('2025-01-11'),
      supplier_id: suppMG2.id,
      creator_id: typistMG.id,
      folder_id: folderMG2.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careMG2.id, regulation_id: regMG2.id } },
    update: {},
    create: {
      care_id: careMG2.id,
      regulation_id: regMG2.id,
      subscriber_id: sub3.id,
      quantity: 1,
    },
  })

  const regMG3 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000052' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000052',
      subscriber_id: sub3.id,
      id_code: 'REG-MG-00003',
      patient_id: pacMG3.id,
      status: status.in_progress,
      notes: 'Regulação MG 3',
      request_date: new Date('2025-01-12'),
      supplier_id: suppMG3.id,
      creator_id: adminMG.id,
      folder_id: folderMG3.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careMG3.id, regulation_id: regMG3.id } },
    update: {},
    create: {
      care_id: careMG3.id,
      regulation_id: regMG3.id,
      subscriber_id: sub3.id,
      quantity: 1,
    },
  })

  const regMG4 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000053' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000053',
      subscriber_id: sub3.id,
      id_code: 'REG-MG-00004',
      patient_id: pacMG4.id,
      status: status.denied,
      notes: 'Regulação MG 4',
      request_date: new Date('2025-01-13'),
      supplier_id: suppMG4.id,
      creator_id: typistMG.id,
      folder_id: folderMG1.id,
      priority: priority.urgencia,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careMG4.id, regulation_id: regMG4.id } },
    update: {},
    create: {
      care_id: careMG4.id,
      regulation_id: regMG4.id,
      subscriber_id: sub3.id,
      quantity: 1,
    },
  })

  const regMG5 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000054' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000054',
      subscriber_id: sub3.id,
      id_code: 'REG-MG-00005',
      patient_id: pacMG5.id,
      status: status.approved,
      notes: 'Regulação MG 5',
      request_date: new Date('2025-01-14'),
      supplier_id: suppMG5.id,
      creator_id: adminMG.id,
      folder_id: folderMG2.id,
      priority: priority.eletivo,
    },
  })

  await prisma.care_regulation.upsert({
    where: { care_id_regulation_id: { care_id: careMG5.id, regulation_id: regMG5.id } },
    update: {},
    create: {
      care_id: careMG5.id,
      regulation_id: regMG5.id,
      subscriber_id: sub3.id,
      quantity: 1,
    },
  })

  console.log('✅ 5 Regulações MG criadas')
  console.log('✅ BELO HORIZONTE COMPLETO!\n')

  // ==========================================
  // VERIFICAÇÃO
  // ==========================================
  console.log('\n🔍 ========== VERIFICAÇÃO DE HASH ==========')

  const users = [
    'kauannjacome@gmail.com',
    'admin_municipal@saopaulo.sp.gov.br',
    'typist@saopaulo.sp.gov.br',
    'admin_municipal@riodejaneiro.rj.gov.br',
    'typist@riodejaneiro.rj.gov.br',
    'admin_municipal@belohorizonte.mg.gov.br',
    'typist@belohorizonte.mg.gov.br',
  ]

  const userCheck1 = await prisma.professional.findFirst({ where: { email: users[0] } })
  if (userCheck1?.password_hash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck1.password_hash))) {
    console.log(`✅ ${users[0]}`)
  }

  const userCheck2 = await prisma.professional.findFirst({ where: { email: users[1] } })
  if (userCheck2?.password_hash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck2.password_hash))) {
    console.log(`✅ ${users[1]}`)
  }

  const userCheck3 = await prisma.professional.findFirst({ where: { email: users[2] } })
  if (userCheck3?.password_hash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck3.password_hash))) {
    console.log(`✅ ${users[2]}`)
  }

  const userCheck4 = await prisma.professional.findFirst({ where: { email: users[3] } })
  if (userCheck4?.password_hash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck4.password_hash))) {
    console.log(`✅ ${users[3]}`)
  }

  const userCheck5 = await prisma.professional.findFirst({ where: { email: users[4] } })
  if (userCheck5?.password_hash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck5.password_hash))) {
    console.log(`✅ ${users[4]}`)
  }

  const userCheck6 = await prisma.professional.findFirst({ where: { email: users[5] } })
  if (userCheck6?.password_hash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck6.password_hash))) {
    console.log(`✅ ${users[5]}`)
  }

  const userCheck7 = await prisma.professional.findFirst({ where: { email: users[6] } })
  if (userCheck7?.password_hash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck7.password_hash))) {
    console.log(`✅ ${users[6]}`)
  }

  console.log('\n📊 ========== RESUMO ==========')
  console.log('✅ 1 Admin Manager (kauannjacome@gmail.com)')
  console.log('✅ 3 Municípios: São Paulo, Rio de Janeiro, Belo Horizonte')
  console.log('✅ Cada município tem:')
  console.log('   - 2 profissionais (admin_municipal + typist)')
  console.log('   - 3 unidades de saúde')
  console.log('   - 5 pacientes')
  console.log('   - 2 grupos')
  console.log('   - 5 fornecedores')
  console.log('   - 5 cuidados/procedimentos')
  console.log('   - 3 pastas')
  console.log('   - 5 regulações')
  console.log(`\n🔐 Senha padrão: ${DEFAULT_PASSWORD}`)
  console.log('\n✅ Seed executado com sucesso - SEM LAÇOS DE REPETIÇÃO!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
