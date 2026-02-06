/**
 * Focus NFe Service
 * Integration with Focus NFe API for automated NFSe issuance
 * Compliant with São Paulo's "Salão Parceiro" program (IN SF/SUREM 11/2025)
 */

import { supabase } from './supabase';
import { NFSeStatus } from '../types';
import type { NFSeRecord, FiscalConfig, ProfessionalFiscalConfig } from '../types';

// Focus NFe API Base URLs
const FOCUS_NFE_SANDBOX_URL = 'https://homologacao.focusnfe.com.br';
const FOCUS_NFE_PRODUCTION_URL = 'https://api.focusnfe.com.br';

interface IssueNFSeParams {
    appointmentId: string;
    customerId: string;
    customerName: string;
    customerCpfCnpj?: string;
    customerEmail?: string;
    providerId: string;
    totalValue: number;
    serviceDescription: string;
    salonPercentage?: number; // Optional override
}

interface FocusNFeResponse {
    status: string;
    ref?: string;
    numero?: string;
    codigo_verificacao?: string;
    caminho_xml_nota_fiscal?: string;
    caminho_pdf?: string;
    erros?: Array<{ codigo: string; mensagem: string }>;
    mensagem?: string;
}

/**
 * Get Focus NFe environment URL based on configuration
 */
const getFocusNfeUrl = (environment: 'sandbox' | 'production'): string => {
    return environment === 'production' ? FOCUS_NFE_PRODUCTION_URL : FOCUS_NFE_SANDBOX_URL;
};

/**
 * Get fiscal configuration for the salon
 */
export const getFiscalConfig = async (): Promise<FiscalConfig | null> => {
    try {
        const { data, error } = await supabase
            .from('fiscal_config')
            .select('*')
            .single();

        if (error) {
            console.error('Error fetching fiscal config:', error);
            return null;
        }

        if (!data) return null;

        return {
            id: data.id,
            salonName: data.salon_name,
            cnpj: data.cnpj,
            municipalRegistration: data.municipal_registration,
            stateRegistration: data.state_registration,
            city: data.city,
            state: data.state,
            address: data.address,
            zipCode: data.zip_code,
            focusNfeToken: data.focus_nfe_token,
            focusNfeEnvironment: data.focus_nfe_environment,
            autoIssueNfse: data.auto_issue_nfse,
            salaoParceiroEnabled: data.salao_parceiro_enabled,
            defaultSalonPercentage: data.default_salon_percentage,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    } catch (error) {
        console.error('Exception fetching fiscal config:', error);
        return null;
    }
};

/**
 * Get professional fiscal configuration
 */
export const getProfessionalFiscalConfig = async (providerId: string): Promise<ProfessionalFiscalConfig | null> => {
    try {
        const { data, error } = await supabase
            .from('professional_fiscal_config')
            .select('*')
            .eq('provider_id', providerId)
            .single();

        if (error || !data) return null;

        return {
            id: data.id,
            providerId: data.provider_id,
            cnpj: data.cnpj,
            municipalRegistration: data.municipal_registration,
            socialName: data.social_name,
            fantasyName: data.fantasy_name,
            servicePercentage: data.service_percentage,
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zip_code,
            email: data.email,
            phone: data.phone,
            active: data.active,
            verified: data.verified,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    } catch (error) {
        console.error('Exception fetching professional fiscal config:', error);
        return null;
    }
};

/**
 * Calculate value segregation for Salão Parceiro compliance
 */
const calculateValueSegregation = (
    totalValue: number,
    salonPercentage: number,
    professionalPercentage: number
): { salonValue: number; professionalValue: number } => {
    const salonValue = parseFloat((totalValue * (salonPercentage / 100)).toFixed(2));
    const professionalValue = parseFloat((totalValue * (professionalPercentage / 100)).toFixed(2));

    return { salonValue, professionalValue };
};

/**
 * Issue NFSe via Focus NFe API
 */
export const issueNFSe = async (params: IssueNFSeParams): Promise<{ success: boolean; nfseRecordId?: string; error?: string }> => {
    try {
        // 1. Get fiscal configuration
        const fiscalConfig = await getFiscalConfig();
        if (!fiscalConfig) {
            return { success: false, error: 'Configuração fiscal não encontrada. Configure em Configurações > Fiscal.' };
        }

        if (!fiscalConfig.focusNfeToken) {
            return { success: false, error: 'Token Focus NFe não configurado.' };
        }

        // 2. Get professional fiscal configuration
        const professionalConfig = await getProfessionalFiscalConfig(params.providerId);
        if (!professionalConfig) {
            return { success: false, error: 'CNPJ da profissional não configurado. Configure no cadastro de profissionais.' };
        }

        if (!professionalConfig.verified) {
            return { success: false, error: 'Dados fiscais da profissional ainda não foram verificados pelo administrador.' };
        }

        // 3. Calculate value segregation
        const salonPercentage = params.salonPercentage || fiscalConfig.defaultSalonPercentage;
        const professionalPercentage = professionalConfig.servicePercentage;

        const { salonValue, professionalValue } = calculateValueSegregation(
            params.totalValue,
            salonPercentage,
            professionalPercentage
        );

        // 4. Generate unique reference for this NFSe
        const reference = `APPT-${params.appointmentId}-${Date.now()}`;

        // 5. Prepare Focus NFe request (São Paulo - SP format)
        const professionalName = professionalConfig.socialName || professionalConfig.fantasyName || 'Profissional Parceiro';

        const nfseRequest = {
            data_emissao: new Date().toISOString().split('T')[0],
            natureza_operacao: '1', // 1 = Tributação no município
            prestador: {
                cnpj: fiscalConfig.cnpj.replace(/\D/g, ''),
                inscricao_municipal: fiscalConfig.municipalRegistration,
                codigo_municipio: '3550308', // São Paulo/SP
            },
            tomador: {
                cpf_cnpj: params.customerCpfCnpj?.replace(/\D/g, '') || '',
                razao_social: params.customerName,
                email: params.customerEmail || '',
            },
            servico: {
                valor_servicos: params.totalValue.toFixed(2),
                item_lista_servico: '06.02', // Código de serviço - ajustar conforme necessário
                discriminacao: `${params.serviceDescription}\n\n` +
                    `PROGRAMA SALÃO PARCEIRO - SÃO PAULO\n` +
                    `Valor Total: R$ ${params.totalValue.toFixed(2)}\n` +
                    `Estabelecimento (${salonPercentage}%): R$ ${salonValue.toFixed(2)}\n` +
                    `Profissional (${professionalPercentage}%) - ${professionalName} (CNPJ ${professionalConfig.cnpj}): R$ ${professionalValue.toFixed(2)}`,
                codigo_municipio: '3550308',
            },
            // Intermediário (Professional) - Required for Salão Parceiro
            intermediario: {
                cnpj: professionalConfig.cnpj.replace(/\D/g, ''),
                razao_social: professionalName,
                inscricao_municipal: professionalConfig.municipalRegistration,
            },
        };

        // 6. Call Supabase Edge Function (bypasses CORS)
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-nfse`;

        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                nfseData: {
                    reference: reference,
                    payload: nfseRequest
                },
                environment: fiscalConfig.focusNfeEnvironment
            }),
        });

        console.log('Edge Function response status:', response.status);

        const edgeResponse = await response.json();
        console.log('Edge Function response data:', edgeResponse);

        if (!response.ok) {
            console.error('Edge Function HTTP error:', edgeResponse);
            const errorMsg = edgeResponse.error ||
                (edgeResponse.data && (edgeResponse.data.mensagem || JSON.stringify(edgeResponse.data))) ||
                'Erro ao chamar Edge Function';
            throw new Error(errorMsg);
        }

        if (!edgeResponse.success) {
            console.error('Edge Function returned error:', edgeResponse);
            const errorMsg = edgeResponse.error || edgeResponse.data?.mensagem || 'Erro desconhecido ao emitir NFSe';
            throw new Error(errorMsg);
        }

        const focusResponse: FocusNFeResponse = edgeResponse.data;

        // 7. Create NFSe record in database
        const nfseStatus = edgeResponse.success ? NFSeStatus.PROCESSING : NFSeStatus.ERROR;

        const { data: nfseRecord, error: dbError } = await supabase
            .from('nfse_records')
            .insert({
                appointment_id: params.appointmentId,
                provider_id: params.providerId,
                customer_id: params.customerId,
                reference: reference,
                nfse_number: focusResponse.numero,
                verification_code: focusResponse.codigo_verificacao,
                status: nfseStatus,
                total_value: params.totalValue,
                salon_value: salonValue,
                professional_value: professionalValue,
                professional_cnpj: professionalConfig.cnpj,
                service_description: params.serviceDescription,
                focus_response: focusResponse,
                xml_url: focusResponse.caminho_xml_nota_fiscal,
                pdf_url: focusResponse.caminho_pdf,
                error_message: focusResponse.erros ? JSON.stringify(focusResponse.erros) : focusResponse.mensagem,
                retry_count: 0,
            })
            .select()
            .single();

        if (dbError) {
            console.error('Error saving NFSe record:', dbError);
            return { success: false, error: 'Erro ao salvar registro da NFSe' };
        }

        // 8. Update appointment with NFSe reference
        await supabase
            .from('appointments')
            .update({ nfse_record_id: nfseRecord.id })
            .eq('id', params.appointmentId);

        if (!edgeResponse.success) {
            return {
                success: false,
                nfseRecordId: nfseRecord.id,
                error: focusResponse.erros ? focusResponse.erros[0].mensagem : focusResponse.mensagem || 'Erro ao emitir NFSe'
            };
        }

        return { success: true, nfseRecordId: nfseRecord.id };

    } catch (error: any) {
        console.error('Exception issuing NFSe:', error);
        return { success: false, error: error.message || 'Erro desconhecido ao emitir NFSe' };
    }
};

/**
 * Query NFSe status from Focus NFe
 */
export const queryNFSeStatus = async (nfseRecordId: string): Promise<{ success: boolean; updated?: boolean; error?: string }> => {
    try {
        const fiscalConfig = await getFiscalConfig();
        if (!fiscalConfig || !fiscalConfig.focusNfeToken) {
            return { success: false, error: 'Configuração fiscal inválida' };
        }

        // Get NFSe record
        const { data: nfseRecord, error: fetchError } = await supabase
            .from('nfse_records')
            .select('*')
            .eq('id', nfseRecordId)
            .single();

        if (fetchError || !nfseRecord) {
            return { success: false, error: 'Registro NFSe não encontrado' };
        }

        // Query Focus NFe API
        const apiUrl = `${getFocusNfeUrl(fiscalConfig.focusNfeEnvironment)}/v2/nfse/${nfseRecord.reference}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${btoa(fiscalConfig.focusNfeToken + ':')}`,
            },
        });

        const focusResponse: FocusNFeResponse = await response.json();

        // Update record
        const updates: any = {
            focus_response: focusResponse,
            updated_at: new Date().toISOString(),
        };

        if (focusResponse.status === 'autorizado') {
            updates.status = 'issued';
            updates.issued_at = new Date().toISOString();
            updates.nfse_number = focusResponse.numero;
            updates.verification_code = focusResponse.codigo_verificacao;
            updates.xml_url = focusResponse.caminho_xml_nota_fiscal;
            updates.pdf_url = focusResponse.caminho_pdf;
        } else if (focusResponse.status === 'erro_autorizacao') {
            updates.status = 'error';
            updates.error_message = focusResponse.erros ? JSON.stringify(focusResponse.erros) : focusResponse.mensagem;
        }

        await supabase
            .from('nfse_records')
            .update(updates)
            .eq('id', nfseRecordId);

        return { success: true, updated: true };

    } catch (error: any) {
        console.error('Exception querying NFSe:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Cancel NFSe via Focus NFe
 */
export const cancelNFSe = async (nfseRecordId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const fiscalConfig = await getFiscalConfig();
        if (!fiscalConfig || !fiscalConfig.focusNfeToken) {
            return { success: false, error: 'Configuração fiscal inválida' };
        }

        const { data: nfseRecord, error: fetchError } = await supabase
            .from('nfse_records')
            .select('*')
            .eq('id', nfseRecordId)
            .single();

        if (fetchError || !nfseRecord || nfseRecord.status !== 'issued') {
            return { success: false, error: 'NFSe não pode ser cancelada' };
        }

        const apiUrl = `${getFocusNfeUrl(fiscalConfig.focusNfeEnvironment)}/v2/nfse/${nfseRecord.reference}`;

        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(fiscalConfig.focusNfeToken + ':')}`,
            },
            body: JSON.stringify({ justificativa: reason }),
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.mensagem || 'Erro ao cancelar NFSe' };
        }

        await supabase
            .from('nfse_records')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason,
            })
            .eq('id', nfseRecordId);

        return { success: true };

    } catch (error: any) {
        console.error('Exception cancelling NFSe:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Register company with Focus Nfe
 */
export const registerCompany = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        const fiscalConfig = await getFiscalConfig();
        if (!fiscalConfig || !fiscalConfig.focusNfeToken) {
            return { success: false, error: 'Configuração fiscal inválida ou Token não informado.' };
        }

        const environment = fiscalConfig.focusNfeEnvironment;

        // Prepare company data for registration
        const companyData = {
            cnpj: fiscalConfig.cnpj.replace(/\D/g, ''),
            razao_social: fiscalConfig.salonName,
            nome_fantasia: fiscalConfig.salonName,
            inscricao_municipal: fiscalConfig.municipalRegistration,
            inscricao_estadual: fiscalConfig.stateRegistration?.replace(/\D/g, ''),
            bairro: 'Centro',
            cep: fiscalConfig.zipCode?.replace(/\D/g, '') || '01001000',
            municipio: fiscalConfig.city,
            uf: fiscalConfig.state,
            logradouro: fiscalConfig.address || 'Endereço não informado',
            numero: 'S/N',
            telefone: '11999999999',
            email: 'contato@aminna.com.br',
            regime_tributario: '1',
            enviar_email_destinatario: true,
            discriminar_impostos: true
        };

        // Call Supabase Edge Function (proxy)
        const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-company`;

        const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                companyData,
                environment: fiscalConfig.focusNfeEnvironment
            }),
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            return { success: false, error: errorResponse.error || 'Erro ao chamar serviço de registro' };
        }

        const result = await response.json();

        if (!result.success) {
            return { success: false, error: result.error || 'Erro ao cadastrar empresa' };
        }

        return { success: true };

    } catch (error: any) {
        console.error('Exception registering company:', error);
        return { success: false, error: error.message };
    }
};

// Export service functions
export const focusNfeService = {
    issueNFSe,
    cancelNFSe,
    registerCompany
};

