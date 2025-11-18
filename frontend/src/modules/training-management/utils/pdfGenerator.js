import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Mapeia as posições para categorias
 */
const getPositionCategory = (position) => {
  const categories = {
    'GR': 'Goleiros',
    'DD': 'Laterais',
    'DE': 'Laterais',
    'DC': 'Zagueiros',
    'MD': 'Meias',
    'MC': 'Meias',
    'ME': 'Meias',
    'MOF': 'Meias',
    'ED': 'Extremos',
    'EE': 'Extremos',
    'PL': 'Atacantes',
    'SA': 'Atacantes',
  };
  return categories[position] || 'Outros';
};

/**
 * Organiza atletas por categoria de posição
 */
const organizePlayersByCategory = (players) => {
  const organized = {
    'Goleiros': [],
    'Laterais': [],
    'Zagueiros': [],
    'Meias': [],
    'Extremos': [],
    'Atacantes': [],
    'Outros': [],
  };

  players.forEach(player => {
    const category = getPositionCategory(player.position);
    organized[category].push(player);
  });

  // Ordenar atletas dentro de cada categoria por nome
  Object.keys(organized).forEach(category => {
    organized[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  return organized;
};

/**
 * Obtém nome completo da posição
 */
const getPositionFullName = (position) => {
  const positions = {
    'GR': 'Goleiro',
    'DD': 'Lateral Direito',
    'DE': 'Lateral Esquerdo',
    'DC': 'Zagueiro',
    'MD': 'Meia Direito',
    'MC': 'Meia Central',
    'ME': 'Meia Esquerdo',
    'MOF': 'Meia Ofensivo',
    'ED': 'Extremo Direito',
    'EE': 'Extremo Esquerdo',
    'PL': 'Ponta de Lança',
    'SA': 'Segundo Atacante',
  };
  return positions[position] || position;
};

/**
 * Gera PDF do plantel
 */
export const generatePlantelPDF = (athletes) => {
  // Criar documento PDF em formato A4 paisagem para melhor visualização
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Configurações de cores
  const primaryColor = [41, 128, 185]; // Azul profissional
  const secondaryColor = [52, 73, 94]; // Cinza escuro
  const headerBgColor = [236, 240, 241]; // Cinza claro

  // Título do documento
  doc.setFontSize(20);
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANTEL DE ATLETAS', doc.internal.pageSize.width / 2, 15, { align: 'center' });

  // Data de geração
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Gerado em: ${currentDate}`, doc.internal.pageSize.width / 2, 22, { align: 'center' });

  const startY = 35;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;

  // Separar atletas por grupo (atletas sem grupo não são incluídos)
  const grupo1 = athletes.filter(a => String(a.group) === '1');
  const grupo2 = athletes.filter(a => String(a.group) === '2');
  const grupo3 = athletes.filter(a => String(a.group) === '3');
  const transicao = athletes.filter(a => String(a.group) === 'Transição');
  const dm = athletes.filter(a => String(a.group) === 'DM');

  // Determinar quais colunas serão exibidas
  const columns = [];

  if (grupo1.length > 0) columns.push({ name: 'GRUPO 1', players: grupo1, type: 'group' });
  if (grupo2.length > 0) columns.push({ name: 'GRUPO 2', players: grupo2, type: 'group' });
  if (grupo3.length > 0) columns.push({ name: 'GRUPO 3', players: grupo3, type: 'group' });

  // Se houver Transição ou DM, adicionar como uma coluna combinada
  if (transicao.length > 0 || dm.length > 0) {
    columns.push({
      name: 'OUTROS',
      transicao,
      dm,
      type: 'combined'
    });
  }

  // Se não houver nenhum grupo com atletas, não gerar PDF
  if (columns.length === 0) {
    alert('Não há atletas em nenhum grupo para gerar o PDF.');
    return;
  }

  // Calcular largura das colunas baseado no número de colunas
  const numColumns = columns.length;
  const gap = 4; // Espaço entre colunas
  const totalGap = gap * (numColumns - 1);
  const availableWidth = pageWidth - (margin * 2) - totalGap;
  const columnWidth = availableWidth / numColumns;

  // Desenhar linha de separação vertical entre colunas
  const drawColumnSeparator = (x) => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(x, startY - 3, x, pageHeight - 20);
  };

  // Desenhar caixa decorativa ao redor do título da coluna
  const drawColumnHeader = (title, x, width) => {
    doc.setFillColor(...primaryColor);
    doc.roundedRect(x, startY - 3, width, 8, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, x + width / 2, startY + 2, { align: 'center' });
  };

  // Função auxiliar para adicionar seção de grupo com atletas organizados por posição
  const addGroupColumn = (players, xPosition, width) => {
    if (players.length === 0) return;

    let currentY = startY + 10;

    // Organizar atletas por categoria de posição
    const organized = organizePlayersByCategory(players);

    // Renderizar cada categoria
    Object.entries(organized).forEach(([category, categoryPlayers]) => {
      if (categoryPlayers.length === 0) return;

      // Título da categoria
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...secondaryColor);
      doc.text(category, xPosition + 2, currentY);
      currentY += 3.5;

      // Preparar dados da tabela
      const tableData = categoryPlayers.map((player, index) => [
        index + 1,
        player.name,
        player.position,
      ]);

      // Renderizar tabela
      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Nome', 'Pos']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: headerBgColor,
          textColor: secondaryColor,
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 1.2,
          minCellHeight: 4,
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [50, 50, 50],
          cellPadding: 1.2,
          minCellHeight: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
        columnStyles: {
          0: { cellWidth: 6, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: width - 18, halign: 'left', overflow: 'linebreak' },
          2: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        },
        margin: { left: xPosition, right: pageWidth - xPosition - width },
        tableWidth: width,
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap',
        },
      });

      currentY = doc.lastAutoTable.finalY + 2;
    });
  };

  // Função auxiliar para adicionar seção simples (Transição e DM)
  const addSimpleColumn = (groupName, players, xPosition, width, startYPos) => {
    if (players.length === 0) return startYPos;

    let currentY = startYPos;

    // Subtítulo do grupo
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(groupName, xPosition + 2, currentY);
    currentY += 3.5;

    // Preparar dados da tabela
    const tableData = players.map((player, index) => [
      index + 1,
      player.name,
      player.position,
    ]);

    // Renderizar tabela
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Nome', 'Pos']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: headerBgColor,
        textColor: secondaryColor,
        fontStyle: 'bold',
        fontSize: 7,
        cellPadding: 1.2,
        minCellHeight: 4,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [50, 50, 50],
        cellPadding: 1.2,
        minCellHeight: 4,
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: width - 18, halign: 'left', overflow: 'linebreak' },
        2: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: xPosition, right: pageWidth - xPosition - width },
      tableWidth: width,
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap',
      },
    });

    return doc.lastAutoTable.finalY + 4;
  };

  // Renderizar colunas dinamicamente
  let currentX = margin;

  columns.forEach((column, index) => {
    // Desenhar header da coluna
    drawColumnHeader(column.name, currentX, columnWidth);

    // Renderizar conteúdo baseado no tipo
    if (column.type === 'group') {
      addGroupColumn(column.players, currentX, columnWidth);
    } else if (column.type === 'combined') {
      let yPos = startY + 10;
      yPos = addSimpleColumn('TRANSIÇÃO', column.transicao, currentX, columnWidth, yPos);
      addSimpleColumn('DM', column.dm, currentX, columnWidth, yPos);
    }

    // Desenhar separador (exceto após a última coluna)
    if (index < columns.length - 1) {
      drawColumnSeparator(currentX + columnWidth + gap / 2);
    }

    currentX += columnWidth + gap;
  });

  // Adicionar rodapé em todas as páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Salvar o PDF
  doc.save(`plantel_${new Date().toISOString().split('T')[0]}.pdf`);
};
