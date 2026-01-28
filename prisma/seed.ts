import {
  PrismaClient,
  Sex,
  Role,
  Status,
  Priority,
  UnitMeasure,
  ResourceOrigin,
  Relationship,
  AuditAction,
  Prisma,
} from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dayjs from 'dayjs'

dotenv.config()

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEFAULT_PASSWORD = '123456'

// Função auxiliar para gerar dados em massa sem apagar os existentes
async function generateMassData(params: {
  subscriberId: number,
  location_name: string,
  passwordHash: string,
  unit_id: number,
  groupId: number,
  supplierId: number,
}) {
  const { subscriberId, location_name, passwordHash, unit_id, groupId, supplierId } = params;

  console.log(`📦 Gerando dados em massa para ${location_name}...`);

  // Helper
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // 1. PROFISSIONAIS (Batch)
  console.log(`   - Profissionais...`);
  const professionalsData: Prisma.ProfessionalCreateManyInput[] = [];
  const totalProfessionals = randomInt(10, 120);
  for (let i = 1; i <= totalProfessionals; i++) {
    const cpf = `999${(subscriberId * 1000 + i).toString().padStart(8, '0')}`.substring(0, 11);
    professionalsData.push({
      subscriberId,
      cpf,
      name: `Profissional ${i} (${location_name})`,
      cargo: i % 2 === 0 ? 'Médico' : 'Enfermeiro',
      email: `prof${i}_sub${subscriberId}@sistema.gov.br`,
      role: Role.TYPIST,
      passwordHash: passwordHash,
      acceptedTerms: true,
    });
  }
  await prisma.professional.createMany({ data: professionalsData, skipDuplicates: true });


  // 2. FORNECEDORES (Batch)
  console.log(`   - Fornecedores...`);
  const suppliersData: Prisma.SupplierCreateManyInput[] = [];
  const totalSuppliers = randomInt(10, 100);
  for (let i = 1; i <= totalSuppliers; i++) {
    const cnpj = `888${(subscriberId * 1000 + i).toString().padStart(11, '0')}`.substring(0, 14);
    suppliersData.push({
      subscriberId,
      name: `Fornecedor ${i} (${location_name})`,
      tradeName: `Trade ${i} ${location_name}`,
      cnpj,
      city: location_name,
      state: 'BR',
    });
  }
  await prisma.supplier.createMany({ data: suppliersData, skipDuplicates: true });

  // 3. PASTAS (Batch)
  console.log(`   - Pastas...`);
  const foldersData: Prisma.FolderCreateManyInput[] = [];
  const totalFolders = randomInt(20, 40);
  for (let i = 1; i <= totalFolders; i++) {
    const uuid = `55555555-0000-0000-${subscriberId.toString().padStart(4, '0')}-${i.toString().padStart(12, '0')}`;
    foldersData.push({
      uuid,
      subscriberId,
      name: `Pasta Extra ${i} (${location_name})`,
      description: `Pasta gerada automaticamente para testes de carga em ${location_name}`,
    });
  }
  await prisma.folder.createMany({ data: foldersData, skipDuplicates: true });

  // 4. CUIDADOS (Batch)
  console.log(`   - Cuidados...`);
  const caresData: Prisma.CareCreateManyInput[] = [];
  const totalCares = randomInt(300, 400);
  for (let i = 1; i <= totalCares; i++) {
    const uuid = `44444444-0000-0000-${subscriberId.toString().padStart(4, '0')}-${i.toString().padStart(12, '0')}`;
    caresData.push({
      uuid,
      subscriberId,
      name: `Procedimento ${i} (${location_name})`,
      acronym: `P${i}`,
      unitMeasure: UnitMeasure.UN,
      groupId,
    });
  }
  await prisma.care.createMany({ data: caresData, skipDuplicates: true });

  // 5. PACIENTES (Batch)
  console.log(`   - Pacientes...`);
  const patientsData: Prisma.PatientCreateManyInput[] = [];
  const totalPatients = randomInt(400, 500);
  for (let i = 1; i <= totalPatients; i++) {
    const cpf = `777${(subscriberId * 10000 + i).toString().padStart(8, '0')}`.substring(0, 11);
    patientsData.push({
      subscriberId,
      cpf,
      name: `Paciente ${i} (${location_name})`,
      birthDate: new Date('1990-01-01'),
      city: location_name,
      cns: `7${(subscriberId * 10000 + i).toString().padStart(14, '0')}`.substring(0, 15),
    });
  }
  await prisma.patient.createMany({ data: patientsData, skipDuplicates: true });

  // 6. REGULAÇÕES (Limited Batch - complex relationships)
  // For regulations we need IDs, so we can't easily do createMany if we need to link to other IDs we just created without fetching them.
  // However, we can fetch the patients/cares we just created to link them.
  console.log(`   - Regulações...`);

  // Fetch sample IDs to link
  const samplePatient = await prisma.patient.findFirst({ where: { subscriberId, cpf: { startsWith: '777' } } });
  const sampleCare = await prisma.care.findFirst({ where: { subscriberId } });

  if (samplePatient && sampleCare) {
    const regulationsData: Prisma.RegulationCreateManyInput[] = [];
    // We create regulations first
    const totalRegulations = randomInt(20, 40);
    for (let i = 1; i <= totalRegulations; i++) {
      const uuid = `99999999-1111-2222-${subscriberId.toString().padStart(4, '0')}-${i.toString().padStart(12, '0')}`;
      regulationsData.push({
        uuid,
        subscriberId,
        idCode: `REG-EXTRA-${subscriberId}-${i}`,
        patientId: samplePatient.id,
        status: Status.IN_PROGRESS,
        supplierId,
        priority: Priority.ELECTIVE,
      });
    }
    await prisma.regulation.createMany({ data: regulationsData, skipDuplicates: true });

    // Now we need to link creating care_regulation.
    // Fetch the inserted regulations to get their IDs
    const insertedRegs = await prisma.regulation.findMany({
      where: { subscriberId, idCode: { startsWith: 'REG-EXTRA-' } },
      select: { id: true }
    });

    const careRegulationsData = insertedRegs.map(reg => ({
      careId: sampleCare.id,
      regulationId: reg.id,
      subscriberId,
      quantity: 1,
    }));

    if (careRegulationsData.length > 0) {
      await prisma.careRegulation.createMany({ data: careRegulationsData, skipDuplicates: true });
    }
  }
}

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
      municipalityName: 'Sistema',
      email: 'admin@sistema.gov.br',
      telephone: '00000000000',
      cnpj: '00000000000000',
      postalCode: '00000-000',
      city: 'Sistema',
      neighborhood: 'Central',
      street: 'Sistema',
      number: '0',
      stateName: 'Sistema',
      stateAcronym: 'SG',
      payment: true,
    },
  })

  const adminManager = await prisma.professional.upsert({
    where: {
      subscriberId_cpf: {
        subscriberId: adminGlobalSubscriber.id,
        cpf: '00000000000',
      },
    },
    update: { passwordHash: passwordHash },
    create: {
      subscriberId: adminGlobalSubscriber.id,
      cpf: '00000000000',
      name: 'Admin Manager (Sistema)',
      cargo: 'Gerente do Sistema',
      sex: Sex.NOT_INFORMED,
      email: 'kauannjacome@gmail.com',
      role: Role.ADMIN_MANAGER,
      passwordHash: passwordHash,
      acceptedTerms: true,
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
      municipalityName: 'São Paulo',
      email: 'contato@saopaulo.sp.gov.br',
      telephone: '1133334444',
      cnpj: '11111111000199',
      postalCode: '01000-000',
      city: 'São Paulo',
      neighborhood: 'Centro',
      street: 'Av. Paulista',
      number: '1000',
      stateName: 'São Paulo',
      stateAcronym: 'SP',
      payment: true,
    },
  })

  // PROFISSIONAIS SP
  const adminSP = await prisma.professional.upsert({
    where: { subscriberId_cpf: { subscriberId: sub1.id, cpf: '11111111111' } },
    update: { passwordHash: passwordHash },
    create: {
      subscriberId: sub1.id,
      cpf: '11111111111',
      name: 'Dr. João Silva (São Paulo)',
      cargo: 'Secretário de Saúde',
      sex: Sex.MALE,
      email: 'admin_municipal@saopaulo.sp.gov.br',
      role: Role.ADMIN_MUNICIPAL,
      passwordHash: passwordHash,
      acceptedTerms: true,
      cns: '111456789012345',
    },
  })

  const typistSP = await prisma.professional.upsert({
    where: { subscriberId_cpf: { subscriberId: sub1.id, cpf: '11111111112' } },
    update: { passwordHash: passwordHash },
    create: {
      subscriberId: sub1.id,
      cpf: '11111111112',
      name: 'Maria Santos (São Paulo)',
      cargo: 'Digitadora',
      sex: Sex.FEMALE,
      email: 'typist@saopaulo.sp.gov.br',
      role: Role.TYPIST,
      passwordHash: passwordHash,
      acceptedTerms: true,
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
      subscriberId: sub1.id,
    },
  })

  const unitSP2 = await prisma.unit.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000002',
      name: 'Hospital Municipal (São Paulo)',
      subscriberId: sub1.id,
    },
  })

  const unitSP3 = await prisma.unit.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000003' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000003',
      name: 'UPA Lapa (São Paulo)',
      subscriberId: sub1.id,
    },
  })

  console.log('✅ 3 Unidades SP criadas')

  // PACIENTES SP
  const pacSP1 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub1.id, cpf: '11111110001' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      cpf: '11111110001',
      name: 'Carlos Oliveira (São Paulo)',
      gender: 'Masculino',
      race: 'Pardo',
      birthDate: new Date('1985-01-15'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000001',
    },
  })

  const pacSP2 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub1.id, cpf: '11111110002' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      cpf: '11111110002',
      name: 'Ana Costa (São Paulo)',
      gender: 'Feminino',
      race: 'Branca',
      birthDate: new Date('1990-05-20'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000002',
    },
  })

  const pacSP3 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub1.id, cpf: '11111110003' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      cpf: '11111110003',
      name: 'Pedro Souza (São Paulo)',
      gender: 'Masculino',
      race: 'Negra',
      birthDate: new Date('1978-11-10'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000003',
    },
  })

  const pacSP4 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub1.id, cpf: '11111110004' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      cpf: '11111110004',
      name: 'Juliana Lima (São Paulo)',
      gender: 'Feminino',
      race: 'Amarela',
      birthDate: new Date('2000-03-25'),
      city: 'São Paulo',
      state: 'SP',
      cns: '700000000000004',
    },
  })

  const pacSP5 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub1.id, cpf: '11111110005' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      cpf: '11111110005',
      name: 'Roberto Alves (São Paulo)',
      gender: 'Masculino',
      race: 'Branca',
      birthDate: new Date('1965-07-30'),
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
      name: 'Exames Laboratoriais (São Paulo)',
      description: 'Grupo de exames de sangue e lab',
    },
  })

  const groupSP2 = await prisma.group.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000011' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000011',
      name: 'Consultas Especializadas (São Paulo)',
      description: 'Consultas médicas especializadas',
    },
  })

  console.log('✅ 2 Grupos SP criados')

  // FORNECEDORES SP
  const suppSP1 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub1.id, cnpj: '11111111000111' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      name: 'Laboratório Central (São Paulo)',
      tradeName: 'LabCentral SP',
      cnpj: '11111111000111',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP2 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub1.id, cnpj: '11111111000122' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      name: 'Clínica Imagem (São Paulo)',
      tradeName: 'ImagemSP',
      cnpj: '11111111000122',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP3 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub1.id, cnpj: '11111111000133' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      name: 'Hospital Parceiro (São Paulo)',
      tradeName: 'HospSP',
      cnpj: '11111111000133',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP4 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub1.id, cnpj: '11111111000144' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      name: 'Farmácia Popular (São Paulo)',
      tradeName: 'FarmaSP',
      cnpj: '11111111000144',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const suppSP5 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub1.id, cnpj: '11111111000155' } },
    update: {},
    create: {
      subscriberId: sub1.id,
      name: 'Centro Especialidades (São Paulo)',
      tradeName: 'CentroEsp SP',
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
      subscriberId: sub1.id,
      name: 'Hemograma Completo (São Paulo)',
      acronym: 'HEMOC',
      description: 'Exame de sangue completo',
      resourceOrigin: ResourceOrigin.MUNICIPAL,
      unitMeasure: UnitMeasure.UN,
      value: 25.5,
      amount: 1,
      groupId: groupSP1.id,
      professionalId: adminSP.id,
    },
  })

  const careSP2 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000021' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000021',
      subscriberId: sub1.id,
      name: 'Glicemia em Jejum (São Paulo)',
      acronym: 'GLICJ',
      description: 'Exame de glicose',
      resourceOrigin: ResourceOrigin.MUNICIPAL,
      unitMeasure: UnitMeasure.UN,
      value: 15.0,
      amount: 1,
      groupId: groupSP1.id,
      professionalId: typistSP.id,
    },
  })

  const careSP3 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000022' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000022',
      subscriberId: sub1.id,
      name: 'Colesterol Total (São Paulo)',
      acronym: 'COLEST',
      description: 'Exame de colesterol',
      resourceOrigin: ResourceOrigin.MUNICIPAL,
      unitMeasure: UnitMeasure.UN,
      value: 18.0,
      amount: 1,
      groupId: groupSP1.id,
      professionalId: adminSP.id,
    },
  })

  const careSP4 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000023' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000023',
      subscriberId: sub1.id,
      name: 'Consulta Cardiologia (São Paulo)',
      acronym: 'CCARDIO',
      description: 'Consulta com cardiologista',
      resourceOrigin: ResourceOrigin.MUNICIPAL,
      unitMeasure: UnitMeasure.UN,
      value: 120.0,
      amount: 1,
      groupId: groupSP2.id,
      professionalId: adminSP.id,
    },
  })

  const careSP5 = await prisma.care.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000024' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000024',
      subscriberId: sub1.id,
      name: 'Consulta Ortopedia (São Paulo)',
      acronym: 'CORTOP',
      description: 'Consulta com ortopedista',
      resourceOrigin: ResourceOrigin.MUNICIPAL,
      unitMeasure: UnitMeasure.UN,
      value: 100.0,
      amount: 1,
      groupId: groupSP2.id,
      professionalId: typistSP.id,
    },
  })

  console.log('✅ 5 Cuidados SP criados')

  // PASTAS SP
  const folderSP1 = await prisma.folder.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000030',
      subscriberId: sub1.id,
      name: 'Pasta Urgências (São Paulo)',
      description: 'Regulações urgentes',
      responsibleId: adminSP.id,
    },
  })

  const folderSP2 = await prisma.folder.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000031' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000031',
      subscriberId: sub1.id,
      name: 'Pasta Eletivos (São Paulo)',
      description: 'Procedimentos eletivos',
      responsibleId: typistSP.id,
    },
  })

  const folderSP3 = await prisma.folder.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000032' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000032',
      subscriberId: sub1.id,
      name: 'Pasta Exames (São Paulo)',
      description: 'Solicitações de exames',
      responsibleId: adminSP.id,
    },
  })

  console.log('✅ 3 Pastas SP criadas')

  // REGULAÇÕES SP
  const regSP1 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000050' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000050',
      subscriberId: sub1.id,
      idCode: 'REG-SP-00001',
      patientId: pacSP1.id,
      status: Status.IN_PROGRESS,
      notes: 'Regulação SP 1',
      requestDate: dayjs().subtract(10, 'day').toDate(),
      supplierId: suppSP1.id,
      creatorId: adminSP.id,
      folderId: folderSP1.id,
      priority: Priority.URGENCY,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careSP1.id, regulationId: regSP1.id } },
    update: {},
    create: {
      careId: careSP1.id,
      regulationId: regSP1.id,
      subscriberId: sub1.id,
      quantity: 1,
    },
  })

  const regSP2 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000051' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000051',
      subscriberId: sub1.id,
      idCode: 'REG-SP-00002',
      patientId: pacSP2.id,
      status: Status.APPROVED,
      notes: 'Regulação SP 2',
      requestDate: dayjs().subtract(9, 'day').toDate(),
      scheduledDate: dayjs().add(2, 'day').toDate(), // Will trigger "2 days remaining" alert
      supplierId: suppSP2.id,
      creatorId: typistSP.id,
      folderId: folderSP2.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careSP2.id, regulationId: regSP2.id } },
    update: {},
    create: {
      careId: careSP2.id,
      regulationId: regSP2.id,
      subscriberId: sub1.id,
      quantity: 1,
    },
  })

  const regSP3 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000052' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000052',
      subscriberId: sub1.id,
      idCode: 'REG-SP-00003',
      patientId: pacSP3.id,
      status: Status.IN_PROGRESS,
      notes: 'Regulação SP 3',
      requestDate: dayjs().subtract(8, 'day').toDate(),
      scheduledDate: dayjs().add(5, 'day').toDate(), // Will trigger "5 days remaining" alert
      supplierId: suppSP3.id,
      creatorId: adminSP.id,
      folderId: folderSP3.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careSP3.id, regulationId: regSP3.id } },
    update: {},
    create: {
      careId: careSP3.id,
      regulationId: regSP3.id,
      subscriberId: sub1.id,
      quantity: 1,
    },
  })

  const regSP4 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000053' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000053',
      subscriberId: sub1.id,
      idCode: 'REG-SP-00004',
      patientId: pacSP4.id,
      status: Status.DENIED,
      notes: 'Regulação SP 4',
      requestDate: new Date('2025-01-13'),
      supplierId: suppSP4.id,
      creatorId: typistSP.id,
      folderId: folderSP1.id,
      priority: Priority.URGENCY,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careSP4.id, regulationId: regSP4.id } },
    update: {},
    create: {
      careId: careSP4.id,
      regulationId: regSP4.id,
      subscriberId: sub1.id,
      quantity: 1,
    },
  })

  const regSP5 = await prisma.regulation.upsert({
    where: { uuid: '11111111-0000-0000-0000-000000000054' },
    update: {},
    create: {
      uuid: '11111111-0000-0000-0000-000000000054',
      subscriberId: sub1.id,
      idCode: 'REG-SP-00005',
      patientId: pacSP5.id,
      status: Status.APPROVED,
      notes: 'Regulação SP 5',
      requestDate: new Date('2025-01-14'),
      supplierId: suppSP5.id,
      creatorId: adminSP.id,
      folderId: folderSP2.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careSP5.id, regulationId: regSP5.id } },
    update: {},
    create: {
      careId: careSP5.id,
      regulationId: regSP5.id,
      subscriberId: sub1.id,
      quantity: 1,
    },
  })

  console.log('✅ 5 Regulações SP criadas')

  await generateMassData({
    subscriberId: sub1.id,
    location_name: 'São Paulo',
    passwordHash,
    unit_id: unitSP1.id,
    groupId: groupSP1.id,
    supplierId: suppSP1.id,
  });

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
      municipalityName: 'Rio de Janeiro',
      email: 'contato@rio.rj.gov.br',
      telephone: '2133334444',
      cnpj: '22222222000199',
      postalCode: '20000-000',
      city: 'Rio de Janeiro',
      neighborhood: 'Centro',
      street: 'Av. Rio Branco',
      number: '500',
      stateName: 'Rio de Janeiro',
      stateAcronym: 'RJ',
      payment: true,
    },
  })

  // PROFISSIONAIS RJ
  const adminRJ = await prisma.professional.upsert({
    where: { subscriberId_cpf: { subscriberId: sub2.id, cpf: '22222222221' } },
    update: { passwordHash: passwordHash },
    create: {
      subscriberId: sub2.id,
      cpf: '22222222221',
      name: 'Dra. Fernanda Lima (Rio de Janeiro)',
      cargo: 'Secretária de Saúde',
      sex: Sex.FEMALE,
      email: 'admin_municipal@riodejaneiro.rj.gov.br',
      role: Role.ADMIN_MUNICIPAL,
      passwordHash: passwordHash,
      acceptedTerms: true,
      cns: '222456789012345',
    },
  })

  const typistRJ = await prisma.professional.upsert({
    where: { subscriberId_cpf: { subscriberId: sub2.id, cpf: '22222222222' } },
    update: { passwordHash: passwordHash },
    create: {
      subscriberId: sub2.id,
      cpf: '22222222222',
      name: 'Roberto Costa (Rio de Janeiro)',
      cargo: 'Digitador',
      sex: Sex.MALE,
      email: 'typist@riodejaneiro.rj.gov.br',
      role: Role.TYPIST,
      passwordHash: passwordHash,
      acceptedTerms: true,
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
      subscriberId: sub2.id,
    },
  })

  const unitRJ2 = await prisma.unit.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000002',
      name: 'Hospital Municipal (Rio de Janeiro)',
      subscriberId: sub2.id,
    },
  })

  const unitRJ3 = await prisma.unit.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000003' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000003',
      name: 'UPA Tijuca (Rio de Janeiro)',
      subscriberId: sub2.id,
    },
  })

  console.log('✅ 3 Unidades RJ criadas')

  // PACIENTES RJ
  const pacRJ1 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub2.id, cpf: '22222220001' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      cpf: '22222220001',
      name: 'Luciana Mendes (Rio de Janeiro)',
      gender: 'Feminino',
      race: 'Branca',
      birthDate: new Date('1988-02-10'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000001',
    },
  })

  const pacRJ2 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub2.id, cpf: '22222220002' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      cpf: '22222220002',
      name: 'Gabriel Santos (Rio de Janeiro)',
      gender: 'Masculino',
      race: 'Pardo',
      birthDate: new Date('1992-06-15'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000002',
    },
  })

  const pacRJ3 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub2.id, cpf: '22222220003' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      cpf: '22222220003',
      name: 'Beatriz Silva (Rio de Janeiro)',
      gender: 'Feminino',
      race: 'Negra',
      birthDate: new Date('1975-09-20'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000003',
    },
  })

  const pacRJ4 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub2.id, cpf: '22222220004' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      cpf: '22222220004',
      name: 'Thiago Pereira (Rio de Janeiro)',
      gender: 'Masculino',
      race: 'Branca',
      birthDate: new Date('1998-12-05'),
      city: 'Rio de Janeiro',
      state: 'RJ',
      cns: '800000000000004',
    },
  })

  const pacRJ5 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub2.id, cpf: '22222220005' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      cpf: '22222220005',
      name: 'Camila Rodrigues (Rio de Janeiro)',
      gender: 'Feminino',
      race: 'Parda',
      birthDate: new Date('1982-04-18'),
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
      name: 'Exames Cardiológicos (Rio de Janeiro)',
      description: 'Exames do coração',
    },
  })

  const groupRJ2 = await prisma.group.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000011' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000011',
      name: 'Pediatria (Rio de Janeiro)',
      description: 'Atendimentos pediátricos',
    },
  })

  console.log('✅ 2 Grupos RJ criados')

  // FORNECEDORES RJ
  const suppRJ1 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub2.id, cnpj: '22222222000111' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      name: 'Laboratório Carioca (Rio de Janeiro)',
      tradeName: 'LabCarioca',
      cnpj: '22222222000111',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ2 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub2.id, cnpj: '22222222000122' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      name: 'Clínica Coração (Rio de Janeiro)',
      tradeName: 'CardioRJ',
      cnpj: '22222222000122',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ3 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub2.id, cnpj: '22222222000133' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      name: 'Hospital Infantil (Rio de Janeiro)',
      tradeName: 'HospInfantil RJ',
      cnpj: '22222222000133',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ4 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub2.id, cnpj: '22222222000144' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      name: 'Farmácia Central (Rio de Janeiro)',
      tradeName: 'FarmaRJ',
      cnpj: '22222222000144',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  const suppRJ5 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub2.id, cnpj: '22222222000155' } },
    update: {},
    create: {
      subscriberId: sub2.id,
      name: 'Centro Diagnóstico (Rio de Janeiro)',
      tradeName: 'DiagRJ',
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
      subscriberId: sub2.id,
      name: 'Eletrocardiograma (Rio de Janeiro)',
      acronym: 'ECG',
      description: 'Exame ECG',
      resourceOrigin: ResourceOrigin.STATE,
      unitMeasure: UnitMeasure.UN,
      value: 40.0,
      amount: 1,
      groupId: groupRJ1.id,
      professionalId: adminRJ.id,
    },
  })

  const careRJ2 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000021' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000021',
      subscriberId: sub2.id,
      name: 'Ecocardiograma (Rio de Janeiro)',
      acronym: 'ECO',
      description: 'Exame de eco',
      resourceOrigin: ResourceOrigin.STATE,
      unitMeasure: UnitMeasure.UN,
      value: 150.0,
      amount: 1,
      groupId: groupRJ1.id,
      professionalId: typistRJ.id,
    },
  })

  const careRJ3 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000022' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000022',
      subscriberId: sub2.id,
      name: 'Teste Ergométrico (Rio de Janeiro)',
      acronym: 'TERGO',
      description: 'Teste de esforço',
      resourceOrigin: ResourceOrigin.STATE,
      unitMeasure: UnitMeasure.UN,
      value: 120.0,
      amount: 1,
      groupId: groupRJ1.id,
      professionalId: adminRJ.id,
    },
  })

  const careRJ4 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000023' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000023',
      subscriberId: sub2.id,
      name: 'Consulta Pediatria (Rio de Janeiro)',
      acronym: 'CPED',
      description: 'Consulta pediátrica',
      resourceOrigin: ResourceOrigin.STATE,
      unitMeasure: UnitMeasure.UN,
      value: 80.0,
      amount: 1,
      groupId: groupRJ2.id,
      professionalId: adminRJ.id,
    },
  })

  const careRJ5 = await prisma.care.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000024' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000024',
      subscriberId: sub2.id,
      name: 'Vacinas Infantis (Rio de Janeiro)',
      acronym: 'VACINF',
      description: 'Vacinação infantil',
      resourceOrigin: ResourceOrigin.STATE,
      unitMeasure: UnitMeasure.UN,
      value: 0.0,
      amount: 1,
      groupId: groupRJ2.id,
      professionalId: typistRJ.id,
    },
  })

  console.log('✅ 5 Cuidados RJ criados')

  // PASTAS RJ
  const folderRJ1 = await prisma.folder.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000030',
      subscriberId: sub2.id,
      name: 'Pasta Cardiologia (Rio de Janeiro)',
      description: 'Regulações cardio',
      responsibleId: adminRJ.id,
    },
  })

  const folderRJ2 = await prisma.folder.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000031' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000031',
      subscriberId: sub2.id,
      name: 'Pasta Pediatria (Rio de Janeiro)',
      description: 'Atendimentos infantis',
      responsibleId: typistRJ.id,
    },
  })

  const folderRJ3 = await prisma.folder.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000032' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000032',
      subscriberId: sub2.id,
      name: 'Pasta Urgências (Rio de Janeiro)',
      description: 'Casos urgentes',
      responsibleId: adminRJ.id,
    },
  })

  console.log('✅ 3 Pastas RJ criadas')

  // REGULAÇÕES RJ
  const regRJ1 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000050' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000050',
      subscriberId: sub2.id,
      idCode: 'REG-RJ-00001',
      patientId: pacRJ1.id,
      status: Status.IN_PROGRESS,
      notes: 'Regulação RJ 1',
      requestDate: new Date('2025-01-10'),
      supplierId: suppRJ1.id,
      creatorId: adminRJ.id,
      folderId: folderRJ1.id,
      priority: Priority.URGENCY,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careRJ1.id, regulationId: regRJ1.id } },
    update: {},
    create: {
      careId: careRJ1.id,
      regulationId: regRJ1.id,
      subscriberId: sub2.id,
      quantity: 1,
    },
  })

  const regRJ2 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000051' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000051',
      subscriberId: sub2.id,
      idCode: 'REG-RJ-00002',
      patientId: pacRJ2.id,
      status: Status.APPROVED,
      notes: 'Regulação RJ 2',
      requestDate: new Date('2025-01-11'),
      supplierId: suppRJ2.id,
      creatorId: typistRJ.id,
      folderId: folderRJ2.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careRJ2.id, regulationId: regRJ2.id } },
    update: {},
    create: {
      careId: careRJ2.id,
      regulationId: regRJ2.id,
      subscriberId: sub2.id,
      quantity: 1,
    },
  })

  const regRJ3 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000052' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000052',
      subscriberId: sub2.id,
      idCode: 'REG-RJ-00003',
      patientId: pacRJ3.id,
      status: Status.IN_PROGRESS,
      notes: 'Regulação RJ 3',
      requestDate: new Date('2025-01-12'),
      supplierId: suppRJ3.id,
      creatorId: adminRJ.id,
      folderId: folderRJ3.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careRJ3.id, regulationId: regRJ3.id } },
    update: {},
    create: {
      careId: careRJ3.id,
      regulationId: regRJ3.id,
      subscriberId: sub2.id,
      quantity: 1,
    },
  })

  const regRJ4 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000053' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000053',
      subscriberId: sub2.id,
      idCode: 'REG-RJ-00004',
      patientId: pacRJ4.id,
      status: Status.DENIED,
      notes: 'Regulação RJ 4',
      requestDate: new Date('2025-01-13'),
      supplierId: suppRJ4.id,
      creatorId: typistRJ.id,
      folderId: folderRJ1.id,
      priority: Priority.URGENCY,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careRJ4.id, regulationId: regRJ4.id } },
    update: {},
    create: {
      careId: careRJ4.id,
      regulationId: regRJ4.id,
      subscriberId: sub2.id,
      quantity: 1,
    },
  })

  const regRJ5 = await prisma.regulation.upsert({
    where: { uuid: '22222222-0000-0000-0000-000000000054' },
    update: {},
    create: {
      uuid: '22222222-0000-0000-0000-000000000054',
      subscriberId: sub2.id,
      idCode: 'REG-RJ-00005',
      patientId: pacRJ5.id,
      status: Status.APPROVED,
      notes: 'Regulação RJ 5',
      requestDate: new Date('2025-01-14'),
      supplierId: suppRJ5.id,
      creatorId: adminRJ.id,
      folderId: folderRJ2.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careRJ5.id, regulationId: regRJ5.id } },
    update: {},
    create: {
      careId: careRJ5.id,
      regulationId: regRJ5.id,
      subscriberId: sub2.id,
      quantity: 1,
    },
  })

  console.log('✅ 5 Regulações RJ criadas')

  await generateMassData({
    subscriberId: sub2.id,
    location_name: 'Rio de Janeiro',
    passwordHash,
    unit_id: unitRJ1.id,
    groupId: groupRJ1.id,
    supplierId: suppRJ1.id,
  });

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
      municipalityName: 'Belo Horizonte',
      email: 'contato@belohorizonte.mg.gov.br',
      telephone: '3133334444',
      cnpj: '33333333000199',
      postalCode: '30000-000',
      city: 'Belo Horizonte',
      neighborhood: 'Centro',
      street: 'Av. Afonso Pena',
      number: '1500',
      stateName: 'Minas Gerais',
      stateAcronym: 'MG',
      payment: false,
    },
  })

  // PROFISSIONAIS MG
  const adminMG = await prisma.professional.upsert({
    where: { subscriberId_cpf: { subscriberId: sub3.id, cpf: '33333333331' } },
    update: { passwordHash: passwordHash },
    create: {
      subscriberId: sub3.id,
      cpf: '33333333331',
      name: 'Dr. Roberto Andrade (Belo Horizonte)',
      cargo: 'Diretor de Saúde',
      sex: Sex.MALE,
      email: 'admin_municipal@belohorizonte.mg.gov.br',
      role: Role.ADMIN_MUNICIPAL,
      passwordHash: passwordHash,
      acceptedTerms: true,
      cns: '333456789012345',
    },
  })

  const typistMG = await prisma.professional.upsert({
    where: { subscriberId_cpf: { subscriberId: sub3.id, cpf: '33333333332' } },
    update: { passwordHash: passwordHash },
    create: {
      subscriberId: sub3.id,
      cpf: '33333333332',
      name: 'Mariana Silva (Belo Horizonte)',
      cargo: 'Digitadora',
      sex: Sex.FEMALE,
      email: 'typist@belohorizonte.mg.gov.br',
      role: Role.TYPIST,
      passwordHash: passwordHash,
      acceptedTerms: true,
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
      subscriberId: sub3.id,
    },
  })

  const unitMG2 = await prisma.unit.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000002' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000002',
      name: 'Hospital Municipal (Belo Horizonte)',
      subscriberId: sub3.id,
    },
  })

  const unitMG3 = await prisma.unit.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000003' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000003',
      name: 'UPA Venda Nova (Belo Horizonte)',
      subscriberId: sub3.id,
    },
  })

  console.log('✅ 3 Unidades MG criadas')

  // PACIENTES MG
  const pacMG1 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub3.id, cpf: '33333330001' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      cpf: '33333330001',
      name: 'Augusto Ferreira (Belo Horizonte)',
      gender: 'Masculino',
      race: 'Pardo',
      birthDate: new Date('1980-03-12'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000001',
    },
  })

  const pacMG2 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub3.id, cpf: '33333330002' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      cpf: '33333330002',
      name: 'Helena Martins (Belo Horizonte)',
      gender: 'Feminino',
      race: 'Branca',
      birthDate: new Date('1995-07-22'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000002',
    },
  })

  const pacMG3 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub3.id, cpf: '33333330003' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      cpf: '33333330003',
      name: 'Diego Souza (Belo Horizonte)',
      gender: 'Masculino',
      race: 'Negra',
      birthDate: new Date('1972-11-30'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000003',
    },
  })

  const pacMG4 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub3.id, cpf: '33333330004' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      cpf: '33333330004',
      name: 'Larissa Oliveira (Belo Horizonte)',
      gender: 'Feminino',
      race: 'Amarela',
      birthDate: new Date('2002-05-08'),
      city: 'Belo Horizonte',
      state: 'MG',
      cns: '900000000000004',
    },
  })

  const pacMG5 = await prisma.patient.upsert({
    where: { subscriberId_cpf: { subscriberId: sub3.id, cpf: '33333330005' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      cpf: '33333330005',
      name: 'Fernando Alves (Belo Horizonte)',
      gender: 'Masculino',
      race: 'Branca',
      birthDate: new Date('1968-09-14'),
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
      name: 'Ortopedia (Belo Horizonte)',
      description: 'Procedimentos ortopédicos',
    },
  })

  const groupMG2 = await prisma.group.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000011' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000011',
      name: 'Ginecologia (Belo Horizonte)',
      description: 'Atendimentos ginecológicos',
    },
  })

  console.log('✅ 2 Grupos MG criados')

  // FORNECEDORES MG
  const suppMG1 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub3.id, cnpj: '33333333000111' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      name: 'Laboratório Mineiro (Belo Horizonte)',
      tradeName: 'LabMG',
      cnpj: '33333333000111',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG2 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub3.id, cnpj: '33333333000122' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      name: 'Clínica Ortopédica (Belo Horizonte)',
      tradeName: 'OrtoMG',
      cnpj: '33333333000122',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG3 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub3.id, cnpj: '33333333000133' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      name: 'Hospital da Mulher (Belo Horizonte)',
      tradeName: 'MulherMG',
      cnpj: '33333333000133',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG4 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub3.id, cnpj: '33333333000144' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      name: 'Farmácia Saúde (Belo Horizonte)',
      tradeName: 'FarmaMG',
      cnpj: '33333333000144',
      city: 'Belo Horizonte',
      state: 'MG',
    },
  })

  const suppMG5 = await prisma.supplier.upsert({
    where: { subscriberId_cnpj: { subscriberId: sub3.id, cnpj: '33333333000155' } },
    update: {},
    create: {
      subscriberId: sub3.id,
      name: 'Centro Cirúrgico (Belo Horizonte)',
      tradeName: 'CirurgiaMG',
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
      subscriberId: sub3.id,
      name: 'Raio-X Coluna (Belo Horizonte)',
      acronym: 'RXCOL',
      description: 'Exame de raio-x',
      resourceOrigin: ResourceOrigin.FEDERAL,
      unitMeasure: UnitMeasure.UN,
      value: 50.0,
      amount: 1,
      groupId: groupMG1.id,
      professionalId: adminMG.id,
    },
  })

  const careMG2 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000021' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000021',
      subscriberId: sub3.id,
      name: 'Ressonância Joelho (Belo Horizonte)',
      acronym: 'RMJOE',
      description: 'Exame de ressonância',
      resourceOrigin: ResourceOrigin.FEDERAL,
      unitMeasure: UnitMeasure.UN,
      value: 500.0,
      amount: 1,
      groupId: groupMG1.id,
      professionalId: typistMG.id,
    },
  })

  const careMG3 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000022' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000022',
      subscriberId: sub3.id,
      name: 'Fisioterapia Ortopédica (Belo Horizonte)',
      acronym: 'FISORT',
      description: 'Sessão de fisioterapia',
      resourceOrigin: ResourceOrigin.FEDERAL,
      unitMeasure: UnitMeasure.SESSION,
      value: 60.0,
      amount: 10,
      groupId: groupMG1.id,
      professionalId: adminMG.id,
    },
  })

  const careMG4 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000023' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000023',
      subscriberId: sub3.id,
      name: 'Consulta Ginecologia (Belo Horizonte)',
      acronym: 'CGIN',
      description: 'Consulta ginecológica',
      resourceOrigin: ResourceOrigin.FEDERAL,
      unitMeasure: UnitMeasure.UN,
      value: 90.0,
      amount: 1,
      groupId: groupMG2.id,
      professionalId: adminMG.id,
    },
  })

  const careMG5 = await prisma.care.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000024' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000024',
      subscriberId: sub3.id,
      name: 'Ultrassom Obstétrico (Belo Horizonte)',
      acronym: 'USOBS',
      description: 'Ultrassom gestacional',
      resourceOrigin: ResourceOrigin.FEDERAL,
      unitMeasure: UnitMeasure.UN,
      value: 100.0,
      amount: 1,
      groupId: groupMG2.id,
      professionalId: typistMG.id,
    },
  })

  console.log('✅ 5 Cuidados MG criados')

  // PASTAS MG
  const folderMG1 = await prisma.folder.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000030' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000030',
      subscriberId: sub3.id,
      name: 'Pasta Ortopedia (Belo Horizonte)',
      description: 'Regulações ortopédicas',
      responsibleId: adminMG.id,
    },
  })

  const folderMG2 = await prisma.folder.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000031' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000031',
      subscriberId: sub3.id,
      name: 'Pasta Ginecologia (Belo Horizonte)',
      description: 'Atendimentos ginecológicos',
      responsibleId: typistMG.id,
    },
  })

  const folderMG3 = await prisma.folder.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000032' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000032',
      subscriberId: sub3.id,
      name: 'Pasta Cirurgias (Belo Horizonte)',
      description: 'Procedimentos cirúrgicos',
      responsibleId: adminMG.id,
    },
  })

  console.log('✅ 3 Pastas MG criadas')

  // REGULAÇÕES MG
  const regMG1 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000050' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000050',
      subscriberId: sub3.id,
      idCode: 'REG-MG-00001',
      patientId: pacMG1.id,
      status: Status.IN_PROGRESS,
      notes: 'Regulação MG 1',
      requestDate: new Date('2025-01-10'),
      supplierId: suppMG1.id,
      creatorId: adminMG.id,
      folderId: folderMG1.id,
      priority: Priority.URGENCY,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careMG1.id, regulationId: regMG1.id } },
    update: {},
    create: {
      careId: careMG1.id,
      regulationId: regMG1.id,
      subscriberId: sub3.id,
      quantity: 1,
    },
  })

  const regMG2 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000051' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000051',
      subscriberId: sub3.id,
      idCode: 'REG-MG-00002',
      patientId: pacMG2.id,
      status: Status.APPROVED,
      notes: 'Regulação MG 2',
      requestDate: new Date('2025-01-11'),
      supplierId: suppMG2.id,
      creatorId: typistMG.id,
      folderId: folderMG2.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careMG2.id, regulationId: regMG2.id } },
    update: {},
    create: {
      careId: careMG2.id,
      regulationId: regMG2.id,
      subscriberId: sub3.id,
      quantity: 1,
    },
  })

  const regMG3 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000052' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000052',
      subscriberId: sub3.id,
      idCode: 'REG-MG-00003',
      patientId: pacMG3.id,
      status: Status.IN_PROGRESS,
      notes: 'Regulação MG 3',
      requestDate: new Date('2025-01-12'),
      supplierId: suppMG3.id,
      creatorId: adminMG.id,
      folderId: folderMG3.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careMG3.id, regulationId: regMG3.id } },
    update: {},
    create: {
      careId: careMG3.id,
      regulationId: regMG3.id,
      subscriberId: sub3.id,
      quantity: 1,
    },
  })

  const regMG4 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000053' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000053',
      subscriberId: sub3.id,
      idCode: 'REG-MG-00004',
      patientId: pacMG4.id,
      status: Status.DENIED,
      notes: 'Regulação MG 4',
      requestDate: new Date('2025-01-13'),
      supplierId: suppMG4.id,
      creatorId: typistMG.id,
      folderId: folderMG1.id,
      priority: Priority.URGENCY,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careMG4.id, regulationId: regMG4.id } },
    update: {},
    create: {
      careId: careMG4.id,
      regulationId: regMG4.id,
      subscriberId: sub3.id,
      quantity: 1,
    },
  })

  const regMG5 = await prisma.regulation.upsert({
    where: { uuid: '33333333-0000-0000-0000-000000000054' },
    update: {},
    create: {
      uuid: '33333333-0000-0000-0000-000000000054',
      subscriberId: sub3.id,
      idCode: 'REG-MG-00005',
      patientId: pacMG5.id,
      status: Status.APPROVED,
      notes: 'Regulação MG 5',
      requestDate: new Date('2025-01-14'),
      supplierId: suppMG5.id,
      creatorId: adminMG.id,
      folderId: folderMG2.id,
      priority: Priority.ELECTIVE,
    },
  })

  await prisma.careRegulation.upsert({
    where: { careId_regulationId: { careId: careMG5.id, regulationId: regMG5.id } },
    update: {},
    create: {
      careId: careMG5.id,
      regulationId: regMG5.id,
      subscriberId: sub3.id,
      quantity: 1,
    },
  })

  console.log('✅ 5 Regulações MG criadas')

  await generateMassData({
    subscriberId: sub3.id,
    location_name: 'Belo Horizonte',
    passwordHash,
    unit_id: unitMG1.id,
    groupId: groupMG1.id,
    supplierId: suppMG1.id,
  });

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
  if (userCheck1?.passwordHash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck1.passwordHash))) {
    console.log(`✅ ${users[0]}`)
  }

  const userCheck2 = await prisma.professional.findFirst({ where: { email: users[1] } })
  if (userCheck2?.passwordHash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck2.passwordHash))) {
    console.log(`✅ ${users[1]}`)
  }

  const userCheck3 = await prisma.professional.findFirst({ where: { email: users[2] } })
  if (userCheck3?.passwordHash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck3.passwordHash))) {
    console.log(`✅ ${users[2]}`)
  }

  const userCheck4 = await prisma.professional.findFirst({ where: { email: users[3] } })
  if (userCheck4?.passwordHash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck4.passwordHash))) {
    console.log(`✅ ${users[3]}`)
  }

  const userCheck5 = await prisma.professional.findFirst({ where: { email: users[4] } })
  if (userCheck5?.passwordHash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck5.passwordHash))) {
    console.log(`✅ ${users[4]}`)
  }

  const userCheck6 = await prisma.professional.findFirst({ where: { email: users[5] } })
  if (userCheck6?.passwordHash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck6.passwordHash))) {
    console.log(`✅ ${users[5]}`)
  }

  const userCheck7 = await prisma.professional.findFirst({ where: { email: users[6] } })
  if (userCheck7?.passwordHash && (await bcrypt.compare(DEFAULT_PASSWORD, userCheck7.passwordHash))) {
    console.log(`✅ ${users[6]}`)
  }

  console.log('\n📊 ========== RESUMO ==========')
  console.log('✅ 1 Admin Manager (kauannjacome@gmail.com)')
  console.log('✅ 3 Municípios: São Paulo, Rio de Janeiro, Belo Horizonte')
  console.log('✅ Cada município tem (dados base + randomicos):')
  console.log('   - 10~120 profissionais (+2 fixos)')
  console.log('   - 3 unidades de saúde (fixas)')
  console.log('   - 400~500 pacientes (+5 fixos)')
  console.log('   - 2 grupos (fixos)')
  console.log('   - 10~100 fornecedores (+5 fixos)')
  console.log('   - 300~400 cuidados/procedimentos (+5 fixos)')
  console.log('   - 20~40 pastas (+3 fixas)')
  console.log('   - 20~40 regulações (+5 fixas)')
  console.log(`\n🔐 Senha padrão: ${DEFAULT_PASSWORD}`)
  console.log('\n✅ Seed executado com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
