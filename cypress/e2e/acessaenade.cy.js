describe('Baixar microdados do Enade por ano', () => {

  before(() => {
    // Ignora erros JS do site do governo
    Cypress.on('uncaught:exception', () => false);
  });

  it('Entra no site e baixa todos os microdados do Enade', () => {

    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade');

    cy.contains('Microdados do Enade')
      .should('be.visible');

    // percorre todos os links da página
    cy.get('a').each(($link) => {

      const texto = $link.text().trim();

      // filtra apenas os links de microdados
      if (texto.startsWith('Microdados do Enade')) {

        const url = $link.prop('href');
        const ano = texto.replace('Microdados do Enade', '').trim();

        if (url && ano) {
          cy.log(`Baixando Microdados do Enade ${ano}`);

          // chama o Node.js para baixar o arquivo
          cy.task('downloadFile', { url });
        }
      }
    });
  });
});



