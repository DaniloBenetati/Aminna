/**
 * Script de Teste - Emissão de NFSe
 * Este script testa a integração com Focus NFe em ambiente sandbox
 * 
 * ANTES DE EXECUTAR:
 * 1. Execute a migration 008_fiscal_integration.sql no Supabase
 * 2. Configure os dados fiscais do salão na tabela fiscal_config
 * 3. Cadastre o CNPJ de pelo menos uma profissional em professional_fiscal_config
 */

import { supabase } from './supabase';
import { issueNFSe, queryNFSeStatus, getFiscalConfig, getProfessionalFiscalConfig } from './focusNfeService';

// Função auxiliar para exibir resultados
const log = (title: string, data: any) => {
    console.log('\n' + '='.repeat(60));
    console.log(`📋 ${title}`);
    console.log('='.repeat(60));
    console.log(JSON.stringify(data, null, 2));
};

/**
 * Teste 1: Verificar configuração fiscal
 */
const testFiscalConfig = async () => {
    console.log('\n🔍 TESTE 1: Verificando configuração fiscal...');

    const config = await getFiscalConfig();

    if (!config) {
        console.error('❌ Configuração fiscal NÃO encontrada!');
        console.log('➡️  Execute a migration e configure a tabela fiscal_config');
        return false;
    }

    log('Configuração Fiscal', {
        salonName: config.salonName,
        cnpj: config.cnpj,
        city: config.city,
        environment: config.focusNfeEnvironment,
        hasToken: !!config.focusNfeToken,
        salaoParceiroEnabled: config.salaoParceiroEnabled,
        defaultSalonPercentage: config.defaultSalonPercentage + '%'
    });

    if (!config.focusNfeToken) {
        console.error('❌ Token Focus NFe NÃO configurado!');
        return false;
    }

    console.log('✅ Configuração fiscal OK!');
    return true;
};

/**
 * Teste 2: Verificar dados fiscais das profissionais
 */
const testProfessionalConfig = async () => {
    console.log('\n🔍 TESTE 2: Verificando profissionais cadastradas...');

    const { data: providers, error } = await supabase
        .from('providers')
        .select('id, name')
        .eq('active', true)
        .limit(5);

    if (error || !providers || providers.length === 0) {
        console.error('❌ Nenhuma profissional ativa encontrada!');
        return null;
    }

    console.log(`\n📊 Profissionais ativas: ${providers.length}`);

    for (const provider of providers) {
        const fiscalConfig = await getProfessionalFiscalConfig(provider.id);

        console.log(`\n👤 ${provider.name}`);
        if (fiscalConfig) {
            console.log(`   ✅ CNPJ: ${fiscalConfig.cnpj}`);
            console.log(`   ✅ Percentual: ${fiscalConfig.servicePercentage}%`);
            console.log(`   ✅ Verificado: ${fiscalConfig.verified ? 'Sim' : 'Não'}`);

            if (fiscalConfig.verified) {
                return provider;
            }
        } else {
            console.log(`   ❌ Sem dados fiscais cadastrados`);
        }
    }

    console.error('\n❌ Nenhuma profissional com CNPJ verificado encontrada!');
    console.log('➡️  Cadastre os dados fiscais de uma profissional em professional_fiscal_config');
    return null;
};

/**
 * Teste 3: Emitir NFSe de teste
 */
const testIssueNFSe = async (providerId: string, providerName: string) => {
    console.log('\n🚀 TESTE 3: Emitindo NFSe de teste...');

    // Criar um agendamento de teste (simulado)
    const testAppointmentId = 'TEST-' + Date.now();
    const testCustomerId = 'CUSTOMER-TEST';

    const result = await issueNFSe({
        appointmentId: testAppointmentId,
        customerId: testCustomerId,
        customerName: 'Cliente Teste Sandbox',
        customerCpfCnpj: '123.456.789-00', // CPF fictício para sandbox
        customerEmail: 'teste@exemplo.com',
        providerId: providerId,
        totalValue: 100.00,
        serviceDescription: `Teste de Emissão NFSe - Sandbox\nProfissional: ${providerName}\nServiço: Manicure + Pedicure`,
    });

    if (!result.success) {
        console.error('\n❌ ERRO ao emitir NFSe:');
        console.error(result.error);
        return null;
    }

    console.log('\n✅ NFSe criada com sucesso!');
    console.log(`   ID do Registro: ${result.nfseRecordId}`);

    return result.nfseRecordId;
};

/**
 * Teste 4: Consultar status da NFSe
 */
const testQueryNFSe = async (nfseRecordId: string) => {
    console.log('\n🔍 TESTE 4: Consultando status da NFSe...');

    // Aguardar alguns segundos para processar
    console.log('⏳ Aguardando 5 segundos para processamento...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const result = await queryNFSeStatus(nfseRecordId);

    if (!result.success) {
        console.error('\n❌ ERRO ao consultar NFSe:');
        console.error(result.error);
        return;
    }

    console.log('\n✅ Status atualizado!');

    // Buscar o registro completo
    const { data: nfseRecord } = await supabase
        .from('nfse_records')
        .select('*')
        .eq('id', nfseRecordId)
        .single();

    if (nfseRecord) {
        log('Detalhes da NFSe', {
            status: nfseRecord.status,
            numero: nfseRecord.nfse_number || 'Aguardando processamento',
            codigoVerificacao: nfseRecord.verification_code,
            valorTotal: `R$ ${nfseRecord.total_value}`,
            valorSalao: `R$ ${nfseRecord.salon_value}`,
            valorProfissional: `R$ ${nfseRecord.professional_value}`,
            cnpjProfissional: nfseRecord.professional_cnpj,
            pdfUrl: nfseRecord.pdf_url || 'Ainda não disponível',
            erros: nfseRecord.error_message || 'Nenhum'
        });
    }
};

/**
 * Executar todos os testes
 */
export const runNFSeTests = async () => {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   🧪 TESTE DE INTEGRAÇÃO FOCUS NFE - SALÃO PARCEIRO     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    try {
        // Teste 1: Configuração fiscal
        const configOk = await testFiscalConfig();
        if (!configOk) {
            console.log('\n⚠️  Corrija a configuração fiscal antes de continuar');
            return;
        }

        // Teste 2: Profissionais
        const provider = await testProfessionalConfig();
        if (!provider) {
            console.log('\n⚠️  Cadastre os dados fiscais de uma profissional antes de continuar');
            return;
        }

        // Teste 3: Emitir NFSe
        const nfseRecordId = await testIssueNFSe(provider.id, provider.name);
        if (!nfseRecordId) {
            return;
        }

        // Teste 4: Consultar status
        await testQueryNFSe(nfseRecordId);

        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║               ✅ TESTES CONCLUÍDOS COM SUCESSO!          ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');
        console.log('\n');

    } catch (error) {
        console.error('\n❌ ERRO DURANTE OS TESTES:', error);
    }
};

// Se executado diretamente (via node/ts-node)
if (require.main === module) {
    runNFSeTests().then(() => {
        console.log('\n✅ Script finalizado');
        process.exit(0);
    }).catch(err => {
        console.error('\n❌ Erro fatal:', err);
        process.exit(1);
    });
}
