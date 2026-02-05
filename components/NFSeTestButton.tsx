import React, { useState } from 'react';
import { TestTube } from 'lucide-react';
import { supabase } from '../services/supabase';

export const NFSeTestButton: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<any>(null);

    const runTest = async () => {
        setIsRunning(true);
        setShowResult(true);

        const testResult: any = {
            fiscalConfig: null,
            professional: null,
            errors: []
        };

        try {
            // Test 1: Fiscal Config
            const { data: config, error: configError } = await supabase
                .from('fiscal_config')
                .select('*')
                .single();

            if (configError) {
                testResult.errors.push('Config: ' + configError.message);
            } else {
                testResult.fiscalConfig = {
                    salonName: config.salon_name,
                    cnpj: config.cnpj,
                    environment: config.focus_nfe_environment,
                    hasToken: !!config.focus_nfe_token,
                    salonPercentage: config.default_salon_percentage
                };
            }

            // Test 2: Professional (Kauan)
            const { data: kauan } = await supabase
                .from('providers')
                .select('id, name')
                .ilike('name', '%kauan%')
                .single();

            if (kauan) {
                const { data: fiscalKauan } = await supabase
                    .from('professional_fiscal_config')
                    .select('*')
                    .eq('provider_id', kauan.id)
                    .single();

                if (fiscalKauan) {
                    testResult.professional = {
                        name: kauan.name,
                        cnpj: fiscalKauan.cnpj,
                        percentage: fiscalKauan.service_percentage,
                        verified: fiscalKauan.verified
                    };
                } else {
                    testResult.errors.push('Dados fiscais do profissional não encontrados');
                }
            } else {
                testResult.errors.push('Profissional não encontrado');
            }

            setResult(testResult);
        } catch (error: any) {
            testResult.errors.push(error.message);
            setResult(testResult);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <>
            {/* Test Button - Fixed position */}
            <button
                onClick={runTest}
                disabled={isRunning}
                className="fixed bottom-4 right-4 z-[9999] bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-110 disabled:opacity-50"
                title="Testar NFSe"
            >
                <TestTube size={24} className={isRunning ? 'animate-spin' : ''} />
            </button>

            {/* Result Modal */}
            {showResult && result && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <TestTube className="text-purple-600" />
                                Teste NFSe - Salão Parceiro
                            </h2>
                            <button
                                onClick={() => setShowResult(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Errors */}
                        {result.errors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                                <h3 className="font-black text-red-800 dark:text-red-400 mb-2">❌ Erros Encontrados:</h3>
                                {result.errors.map((err: string, idx: number) => (
                                    <p key={idx} className="text-sm text-red-700 dark:text-red-300">• {err}</p>
                                ))}
                            </div>
                        )}

                        {/* Fiscal Config */}
                        {result.fiscalConfig && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-4">
                                <h3 className="font-black text-emerald-800 dark:text-emerald-400 mb-2">✅ Configuração Fiscal do Salão:</h3>
                                <div className="space-y-1 text-sm">
                                    <p><strong>Nome:</strong> {result.fiscalConfig.salonName}</p>
                                    <p><strong>CNPJ:</strong> {result.fiscalConfig.cnpj}</p>
                                    <p><strong>Ambiente:</strong> {result.fiscalConfig.environment}</p>
                                    <p><strong>Token Focus NFe:</strong> {result.fiscalConfig.hasToken ? '✅ Configurado' : '❌ Faltando'}</p>
                                    <p><strong>% Salão:</strong> {result.fiscalConfig.salonPercentage}%</p>
                                </div>
                            </div>
                        )}

                        {/* Professional */}
                        {result.professional && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                                <h3 className="font-black text-blue-800 dark:text-blue-400 mb-2">✅ Dados Fiscais do Profissional:</h3>
                                <div className="space-y-1 text-sm">
                                    <p><strong>Nome:</strong> {result.professional.name}</p>
                                    <p><strong>CNPJ:</strong> {result.professional.cnpj}</p>
                                    <p><strong>% Profissional:</strong> {result.professional.percentage}%</p>
                                    <p><strong>Verificado:</strong> {result.professional.verified ? '✅ Sim' : '⚠️ Não'}</p>
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        {result.fiscalConfig && result.professional && result.errors.length === 0 && (
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-4">
                                <h3 className="font-black text-purple-800 dark:text-purple-400 mb-2">🎯 Sistema Pronto para NFSe!</h3>
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    <strong>Segregação de valores (exemplo R$ 100,00):</strong>
                                </p>
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    • Salão ({result.fiscalConfig.salonPercentage}%): R$ {result.fiscalConfig.salonPercentage.toFixed(2)}
                                </p>
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    • {result.professional.name} ({result.professional.percentage}%): R$ {result.professional.percentage.toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
