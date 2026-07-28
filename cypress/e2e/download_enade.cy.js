describe('Bot INEP Enade - Download Automático', () => {

  Cypress.on('uncaught:exception', () => false);

  it('Executa somente o download dos microdados ENADE', () => {

    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade', {
      pageLoadTimeout: 120000
    });

    cy.wait(10000);

    // Aceita cookies se aparecer
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Aceitar cookies")').length > 0) {
        cy.contains('button', 'Aceitar cookies').click({ force: true });
      }
    });

    // Captura todos os links de microdados
    cy.get('#content-core a').then(($links) => {

      const enadeUrls = $links.toArray()
        .filter(el => el.innerText.toLowerCase().includes('microdados do enade'))
        .map(el => el.href);

      cy.log(`Total de arquivos encontrados: ${enadeUrls.length}`);

      cy.wrap(enadeUrls).each((url, index) => {

        cy.log(`[${index + 1}/${enadeUrls.length}] Iniciando download...`);
        cy.log(`URL: ${url}`);

        cy.task('downloadFile', { url }, { timeout: 1800000 })
          .then((filePath) => {
            cy.log(`✅ Download concluído: ${filePath}`);
          });

      });

    }).then(() => {
      cy.log('🚀 TODOS OS DOWNLOADS FINALIZADOS');
    });

  });

});