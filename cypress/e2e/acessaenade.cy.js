describe('Baixar microdados do Enade por ano', () => {

  before(() => {
    Cypress.on('uncaught:exception', () => false);
  });

  it('Entra no site e baixa todos os microdados do Enade', () => {

    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade');

    cy.contains('Microdados do Enade')
      .should('be.visible');

    cy.get('a').each(($link) => {

      const texto = $link.text().trim();

      if (texto.startsWith('Microdados do Enade')) {

        const url = $link.prop('href');
        const ano = texto.replace('Microdados do Enade', '').trim();

        if (url && ano) {

          cy.log(`Baixando Microdados do Enade ${ano}`);

          const fileName = `enade_${ano}.zip`;

          cy.task('downloadFile', { url, fileName })
            .then(() => {

              cy.task('unzipFile', {
                fileName: fileName
              });

            });
        }
      }
    });

  });
});