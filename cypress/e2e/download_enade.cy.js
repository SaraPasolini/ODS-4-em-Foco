describe('Bot INEP Enade - Download 1 por 1 e Unzip', () => {
  
  // Ignora erros do site do INEP
  Cypress.on('uncaught:exception', () => false);

  it('Executa o fluxo completo de download e extração', () => {
    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade' );

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
        
        // Clica no link
        cy.wrap(el).click({ force: true });

        // Espera 1 minuto entre cada clique
        cy.wait(60000);

        // Se for o último link, espera um pouco mais e descompacta
        if (index === enadeLinks.length - 1) {
          cy.log('Todos os downloads iniciados. Aguardando 2 minutos finais...');
          // Espera 2 minutos extras para garantir que o último arquivo terminou de baixar no disco
          cy.wait(120000); 
          
          cy.log('Iniciando descompactação com adm-zip...');
          cy.task('unzipEnadeFiles').then((msg) => {
            cy.log(msg);
          });
        }
      });
    });
  });
});
