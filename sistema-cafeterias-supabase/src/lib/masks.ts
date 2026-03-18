// Máscara para CNPJ: 00.000.000/0000-00
export function maskCNPJ(value: string): string {
  if (!value) return '';
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

// Máscara para Telefone: (00) 00000-0000
export function maskPhone(value: string): string {
  if (!value) return '';
  
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  // Aplica a máscara
  if (numbers.length <= 10) {
    // Formato fixo: (00) 0000-0000
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14);
  } else {
    // Formato celular: (00) 00000-0000
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  }
}

// Remove máscara (retorna apenas números)
export function unmask(value: string): string {
  return value.replace(/\D/g, '');
}

// Máscara para CPF: 000.000.000-00
export function maskCPF(value: string): string {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  
  return numbers
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
    .slice(0, 14);
}

// Máscara para CEP: 00000-000
export function maskCEP(value: string): string {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  
  return numbers
    .replace(/^(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);
}

// Máscara para moeda (R$)
export function maskCurrency(value: string): string {
  if (!value) return '';
  
  const numbers = value.replace(/\D/g, '');
  const floatValue = parseFloat(numbers) / 100;
  
  return floatValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
