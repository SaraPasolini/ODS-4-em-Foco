describe('Preencher formulário e baixar documento', () => {
  it('Preenche os campos e baixa o arquivo', () => {
      Cypress.on('uncaught:exception', (err, runnable) => {
          return false;
        });
    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade')
    cy.contains('Microdados do Enade 2023')
    .should('be.visible')
    .click({ force: true });
    
  })
})