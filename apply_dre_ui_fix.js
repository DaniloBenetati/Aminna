const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/Danilo Souza/Documents/gestão-inteligente---aminna/gestão-inteligente---aminna/Aminna/components/Finance.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: Services visibility
content = content.replace(
    /\{\/\* Sub-linha Serviços: apenas quando NÃO concluído \(previsão por agendamentos\) \*\/\}\r?\n\s+!dreData\.isClosed && \(<>/g,
    '{/* Sub-linha Serviços: Visível se houver valor ou se não estiver concluído (previsão) */}\n                                                     {(dreData.revenueServices > 0 || !dreData.isClosed) && (<>'
);

// Replacement 2: Bank Revenue visibility (Cartão/PIX)
content = content.replace(
    /\{\/\* Sub-linha: Cartão\/PIX \(sem nota fiscal\) - apenas quando concluído \*\/\}\r?\n\s+dreData\.isClosed && dreData\.reconciledBankRevenues > 0 && \(/g,
    '{/* Sub-linha: Cartão/PIX (sem nota fiscal) - visível se houver valor (reconciliado ou manual) */}\n                                                     {dreData.reconciledBankRevenues > 0 && ('
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finance.tsx updated successfully');
