import ExcelJS from 'exceljs';

async function createBeautifulExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SupliList Assistant';
  workbook.lastModifiedBy = 'SupliList Assistant';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Suplementos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // Setup columns
  sheet.columns = [
    { header: 'ID', key: 'id', width: 6 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Nome do Produto / Suplemento', key: 'nome', width: 50 },
    { header: 'Marca', key: 'marca', width: 20 },
    { header: 'Vendedor/Loja', key: 'vendedor', width: 20 },
    { header: 'Link Amazon', key: 'amazon', width: 40 },
    { header: 'Link Shopee', key: 'shopee', width: 40 },
    { header: 'Link Mercado Livre', key: 'ml', width: 40 },
    { header: 'Preço Atual', key: 'preco', width: 15 }
  ];

  // Style the header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF8B5CF6' } // Brand primary color (purple-ish)
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 12
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF6D28D9' } }
    };
  });

  // Add the rows
  sheet.addRow({
    id: 1, categoria: 'Adaptógeno', nome: 'Maca Peruana Negra em Pó Premium 500g', 
    marca: 'CA.NUTS', vendedor: 'Amazon.com.br', 
    amazon: 'https://www.amazon.com.br/Peruana-Premium-Especial-Suplementos-Ca-Nuts/dp/B0D8VG5BM7', 
    shopee: '', ml: '', preco: 49.41
  });
  
  sheet.addRow({
    id: 1, categoria: 'Adaptógeno', nome: 'Maca Peruana em Pó 100% Pura 1kg', 
    marca: 'WeNutri', vendedor: 'Amazon.com.br', 
    amazon: 'https://www.amazon.com.br/Maca-Peruana-Pura-P%C3%B3-Wenutri/dp/B07ZDKK5Q2', 
    shopee: '', ml: '', preco: 65.10
  });

  sheet.addRow({
    id: 1, categoria: 'Adaptógeno', nome: 'Maca Peruana 100% Pura em Pó 500g', 
    marca: 'WeNutri', vendedor: 'Amazon.com.br', 
    amazon: 'https://www.amazon.com.br/Maca-Peruana-Pura-P%C3%B3-Wenutri/dp/B07ZDK64DV', 
    shopee: '', ml: '', preco: 35.01
  });

  sheet.addRow({
    id: 1, categoria: 'Adaptógeno', nome: 'Maca Negra Peruana em Pó 1kg', 
    marca: 'CA.NUTS', vendedor: 'Mercado Livre', 
    amazon: '', shopee: '', ml: 'https://meli.la/28JcEUt', preco: 71.20
  });

  sheet.addRow({
    id: 1, categoria: 'Adaptógeno', nome: 'Maca Peruana Negra (Vários Pesos)', 
    marca: 'Diversas', vendedor: 'Shopee', 
    amazon: '', shopee: 'https://s.shopee.com.br/6VL3hsICE2', ml: '', preco: 40.90
  });

  // Style data rows
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.height = 25;
      
      // Zebra striping
      if (rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        });
      }

      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
        
        // Format price
        if (colNumber === 9 && cell.value) {
          cell.numFmt = '"R$" #,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.font = { bold: true, color: { argb: 'FF047857' } }; // Green price
        }
        
        // Format links
        if ([6, 7, 8].includes(colNumber) && cell.value) {
          const url = cell.value.toString();
          cell.value = { text: '🔗 Abrir Link', hyperlink: url, tooltip: url };
          cell.font = { color: { argb: 'FF2563EB' }, underline: true };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    }
  });

  // Add filters
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 9 }
  };

  await workbook.xlsx.writeFile('Planilha_Suplementos.xlsx');
  console.log('Planilha Excel (.xlsx) criada com sucesso!');
}

createBeautifulExcel().catch(console.error);
