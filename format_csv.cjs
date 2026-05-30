const fs = require('fs');

const content = `\uFEFFID;Categoria;Nome do Produto / Suplemento;Marca;Vendedor/Loja;Link Amazon (Afiliado);Link Shopee (Afiliado);Link Mercado Livre (Afiliado);Preço Atual
1;Desempenho;Creatina Monohidratada 300g;Growth Supplements;Loja Oficial Growth;;https://s.shopee.com.br/exemplo1;;90.00
2;Desempenho;Whey Protein Isolado 900g;Max Titanium;Mercado Livre (Full);;;https://mercadolivre.com.br/exemplo2;150.00
3;Saúde Geral;Omega 3 EPA+DHA 120caps;Essential Nutrition;Amazon Prime;https://amzn.to/exemplo3;;;200.00
4;Adaptógeno;Maca Peruana Preta 1kg;Apis Nutri;Shopee Oficial;;https://s.shopee.com.br/exemplo4;;45.00
5;Desempenho;Creatina em Pó Hardcore 100% Pura e Monohidratada 300g;Integralmédica;Amazon.com.br;https://www.amazon.com.br/Integralm%C3%A9dica-Creatina-300G-Monohidratada-Branco/dp/B07L5WFHXW;;;39.90`;

fs.writeFileSync('Template_Suplementos.csv', content, 'utf8');
console.log('CSV formatado com sucesso!');
