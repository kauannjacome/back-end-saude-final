import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';

const API_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const API_KEY = process.env.EVOLUTION_API_GLOBAL_KEY;
const LOG_FILE = 'debug_log.txt';

function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function test() {
  fs.writeFileSync(LOG_FILE, ''); // Clear log
  log('--- Debug Zap ---');
  log(`URL: ${API_URL}`);
  // Mascarar chave para segurança no log
  log(`KEY: ${API_KEY ? (API_KEY.substring(0, 4) + '******') : 'MISSING'}`);

  if (!API_URL || !API_KEY) {
    log('❌ ERRO: Variáveis de ambiente faltando.');
    log('Verifique se EVOLUTION_API_URL e EVOLUTION_API_GLOBAL_KEY estão no .env');
    return;
  }

  // 1. Testar Status Global (Conexão com a API)
  try {
    log('\n1. Testando conexão com a API (fetchInstances)...');
    const res = await axios.get(`${API_URL}/instance/fetchInstances`, {
      headers: { 'apikey': API_KEY }
    });
    log('✅ Conexão OK!');
    log(`ℹ️ Instâncias encontradas: ${res.data.length}`);
  } catch (e: any) {
    log('❌ Falha na conexão com a API:');
    log(`   -> Erro: ${e.message}`);
    if (e.response) {
      log(`   -> Status: ${e.response.status}`);
      log(`   -> Data: ${JSON.stringify(e.response.data)}`);
    }
  }

  // 2. Testar Ciclo de Vida da Instância
  const testName = 'debug_test_123';

  try {
    log(`\n2. Tentando criar instância de teste: ${testName}...`);
    const createRes = await axios.post(`${API_URL}/instance/create`, {
      instanceName: testName,
      token: "randomtoken123",
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    }, { headers: { 'apikey': API_KEY } });
    log('✅ Instância CRIADA com sucesso.');
    // console.log('Response:', createRes.data);
  } catch (e: any) {
    if (e.response?.status === 403 || e.response?.status === 409) {
      log('⚠️ Instância já existe (Esperado se rodar 2x).');
    } else {
      log(`❌ Falha ao Criar: ${e.message}`);
      if (e.response) {
        log(`   -> Status: ${e.response.status}`);
        log(`   -> Data: ${JSON.stringify(e.response.data)}`);
      }
    }
  }

  try {
    log(`\n3. Tentando conectar/pegar QR Code do ${testName}...`);
    const connectRes = await axios.get(`${API_URL}/instance/connect/${testName}`, {
      headers: { 'apikey': API_KEY } // Note: Try using global key, verifying permissions
    });
    log('✅ Endpoint Connect respondeu OK.');
    log('   -> Data: ' + JSON.stringify(connectRes.data));
  } catch (e: any) {
    log(`❌ Falha ao Conectar: ${e.message}`);
    if (e.response) {
      log(`   -> Status: ${e.response.status}`);
      log(`   -> Data: ${JSON.stringify(e.response.data)}`);
    }
  }
}

test();
