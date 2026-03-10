import os

file_path = r'c:\Users\Danilo Souza\Documents\gestão-inteligente---aminna\gestão-inteligente---aminna\Aminna\components\Finance.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Serviços sub-line visibility
# Old: {!dreData.isClosed && (<>
# New: {(dreData.revenueServices > 0 || !dreData.isClosed) && (<>
content = content.replace('!dreData.isClosed && (<>', '(dreData.revenueServices > 0 || !dreData.isClosed) && (<>')

# Fix 2: Cartão/PIX sub-line visibility
# Old: {dreData.isClosed && dreData.reconciledBankRevenues > 0 && (
# New: {dreData.reconciledBankRevenues > 0 && (
content = content.replace('{dreData.isClosed && dreData.reconciledBankRevenues > 0 && (', '{dreData.reconciledBankRevenues > 0 && (')

# Fix 3: Comments for clarity
content = content.replace('Sub-linha Serviços: apenas quando NÃO concluído (previsão por agendamentos)', 'Sub-linha Serviços: Visível se houver valor ou se não estiver concluído (previsão)')
content = content.replace('Sub-linha: Cartão/PIX (sem nota fiscal) - apenas quando concluído', 'Sub-linha: Cartão/PIX (sem nota fiscal) - visível se houver valor (reconciliado ou manual)')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement successful")
