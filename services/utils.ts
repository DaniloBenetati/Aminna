
/**
 * Sanitiza URLs de imagens para garantir que funcionem corretamente, 
 * especialmente links do Dropbox que podem falhar em guias anônimas.
 */
export const sanitizeImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Se for uma URL do Dropbox, precisamos transformar o link de compartilhamento
  // em um link de download direto para que o <img> consiga renderizar.
  if (url.includes('dropbox.com')) {
    let sanitized = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    // Remove parâmetros de visualização que podem interferir
    sanitized = sanitized.replace(/\?dl=[01]/, '');
    // Garante que não tenha múltiplos pontos de interrogação se já houver outros parâmetros
    if (!sanitized.includes('?')) {
        // sanitized = sanitized + '?raw=1'; // dl.dropboxusercontent.com já traz o raw
    }
    return sanitized;
  }
  
  return url;
};
