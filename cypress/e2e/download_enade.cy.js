describe('Bot INEP Enade - Download 1 por 1 e Unzip', () => {
  
  // Ignora erros do site do INEP
  Cypress.on('uncaught:exception', () => false);

  it('Executa o fluxo completo de download e extração', () => {
    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade' );

    // Espera a página carregar completamente
    cy.wait(10000);

    // Aceita cookies
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Aceitar cookies")').length > 0) {
        cy.get('button').contains('Aceitar cookies').click();
      }
    });

    // Pega todos os links de microdados
    cy.get('#content-core a').then(($links) => {
      // Filtramos apenas os links que queremos baixar
      const enadeLinks = $links.toArray().filter(el => 
        el.innerText.toLowerCase().includes('microdados do enade')
      );

      enadeLinks.forEach((el, index) => {
        cy.log(`[${index + 1}/${enadeLinks.length}] Iniciando download...`);
        
        // Faz download programático
        cy.task('downloadFile', { url: el.href }).then((filePath) => {
          cy.log(`Download concluído: ${filePath}`);
        });

        // Espera 5 segundos entre cada download para não sobrecarregar
        cy.wait(5000);

        // Se for o último link, espera um pouco mais e descompacta
        if (index === enadeLinks.length - 1) {
          cy.log('Todos os downloads iniciados. Aguardando 30 segundos finais...');
          // Espera 30 segundos extras para garantir que o último arquivo terminou de baixar no disco
          cy.wait(30000); 
          
          cy.log('Iniciando descompactação com adm-zip...');
          cy.task('unzipEnadeFiles').then((msg) => {
            cy.log(msg);
          });
        }
      });
    });
  });
});
