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
describe('Baixar, descompactar e limpar ZIP', () => {
  it('Baixa o arquivo, descompacta e apaga o zip', () => {
      
    Cypress.on('uncaught:exception', () => false);

    cy.visit('https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enade');

    cy.contains('Microdados do Enade 2023')
      .click({ force: true });

    // Aguarda o download (ajuste o tempo)
    cy.wait(8000);

    const downloadsFolder = 'cypress/downloads';
    const zipFile = `${downloadsFolder}/enade2023.zip`;
    const outputFolder = `${downloadsFolder}/enade2023`;

    // Descompacta o ZIP
    cy.task('unzipFile', { zipPath: zipFile, outputPath: outputFolder });

    // Depois exclui o arquivo ZIP
    cy.task('deleteFile', zipFile);
  });
});
